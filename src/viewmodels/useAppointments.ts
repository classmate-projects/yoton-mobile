import { useCallback, useMemo, useRef, useState } from "react";

import { api } from "@/api/client";
import { Endpoints } from "@/api/endpoints";
import type {
  ApiEnvelope,
  BookingResult,
  DoctorCard,
  MyAppointment,
  MyConsultation,
  PatientSlot,
  SpecializationDoctors,
} from "@/api/types";
import { useAlert } from "@/components/GlassDialogs";
import { LogService } from "@/services/logger";
import { parseServerDate, today, toApiDate } from "@/utils/date";

import { isUpcoming, notifyNewlyConfirmed, toAppointmentItem, type AppointmentItem } from "./appointmentFormat";

const MAX_PREFERRED_DOCTORS = 3;

// The Appointments tab: upcoming/past visits, plus an inline "request an appointment" panel. The
// patient never leaves this screen to book: pick a department, up to 3 ranked preferred doctors,
// a date and a slot; if the current preference has nothing free on that date the next one is
// tried. (Port of the MAUI AppointmentsViewModel.)
export function useAppointments() {
  const { showAlert } = useAlert();

  const [isBusy, setIsBusy] = useState(false);
  const loading = useRef(false);

  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentItem[]>([]);
  const [pastAppointments, setPastAppointments] = useState<AppointmentItem[]>([]);
  const consultations = useRef<MyConsultation[]>([]);

  // ---------------- inline booking panel ----------------
  const [isBookingPanelOpen, setIsBookingPanelOpen] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  const [specializationGroups, setSpecializationGroups] = useState<SpecializationDoctors[]>([]);
  const [selectedSpecializationName, setSelectedSpecializationName] = useState("All");

  // Up to 3 ranked preferences; slots are shown for the first, falling back to the 2nd/3rd if the
  // current one has none free on the chosen date.
  const [preferredDoctors, setPreferredDoctors] = useState<DoctorCard[]>([]);
  const [activePreference, setActivePreference] = useState<DoctorCard | null>(null);
  const [selectedBookingDate, setSelectedBookingDate] = useState<Date>(today());
  const [availableSlots, setAvailableSlots] = useState<PatientSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<PatientSlot | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");

  const specializationNames = useMemo(
    () => ["All", ...specializationGroups.map((s) => s.specializationName)],
    [specializationGroups],
  );

  const doctorCards = useMemo(
    () =>
      selectedSpecializationName === "All"
        ? specializationGroups.flatMap((s) => s.doctors)
        : specializationGroups
            .filter((s) => s.specializationName === selectedSpecializationName)
            .flatMap((s) => s.doctors),
    [specializationGroups, selectedSpecializationName],
  );

  // ---------------- appointments list ----------------

  const loadAppointments = useCallback(async () => {
    try {
      const response = await api.get<ApiEnvelope<MyAppointment[]>>(Endpoints.patient.appointments);
      const appointments = response.data ?? [];
      const now = new Date();
      const byDate = (a: MyAppointment) => parseServerDate(a.appointmentDate).getTime();

      setUpcomingAppointments(
        appointments.filter((a) => isUpcoming(a, now)).sort((a, b) => byDate(a) - byDate(b)).map(toAppointmentItem),
      );
      setPastAppointments(
        appointments.filter((a) => !isUpcoming(a, now)).sort((a, b) => byDate(b) - byDate(a)).map(toAppointmentItem),
      );

      const consultationsResponse = await api.get<ApiEnvelope<MyConsultation[]>>(Endpoints.patient.consultations);
      consultations.current = consultationsResponse.data ?? [];

      await notifyNewlyConfirmed(appointments, showAlert);
    } catch (error) {
      LogService.write(`Failed to load appointments: ${error}`);
      setUpcomingAppointments([]);
      setPastAppointments([]);
    }
  }, [showAlert]);

  const initialize = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    setIsBusy(true);
    try {
      await loadAppointments();
    } finally {
      loading.current = false;
      setIsBusy(false);
    }
  }, [loadAppointments]);

  // Used by the foreground poll - no overlay/spinner flash while the patient is browsing.
  const refreshSilently = loadAppointments;

  // ---------------- booking: doctors ----------------

  const loadDoctorsForBooking = useCallback(async () => {
    try {
      setIsLoadingDoctors(true);
      const response = await api.get<ApiEnvelope<SpecializationDoctors[]>>(Endpoints.patient.specializationsDoctors);
      setSpecializationGroups(response.data ?? []);
    } catch (error) {
      LogService.write(`Failed to load doctors for booking: ${error}`);
      setSpecializationGroups([]);
    } finally {
      setIsLoadingDoctors(false);
    }
  }, []);

  const toggleBookingPanel = useCallback(async () => {
    const opening = !isBookingPanelOpen;
    setIsBookingPanelOpen(opening);
    if (opening && doctorCards.length === 0) await loadDoctorsForBooking();
  }, [isBookingPanelOpen, doctorCards.length, loadDoctorsForBooking]);

  // ---------------- booking: slots ----------------

  // Loads the free slots for `startDoctor` on `date`. If none are free it nudges the patient to
  // their next preference (never silently rebooking them with someone else) and tries that one,
  // until a doctor has a slot or the ranked list is exhausted.
  const loadSlots = useCallback(
    async (startDoctor: DoctorCard, date: Date, ranked: DoctorCard[]) => {
      let doctor = startDoctor;
      try {
        setIsLoadingSlots(true);
        setSelectedSlot(null);

        for (;;) {
          if (!doctor.doctorId) return;

          const response = await api.get<ApiEnvelope<PatientSlot[]>>(
            Endpoints.patient.doctorSlots(doctor.doctorId, toApiDate(date)),
          );
          const slots = response.data ?? [];
          setAvailableSlots(slots);
          if (slots.some((s) => s.isAvailable)) return;

          const nextIndex = ranked.findIndex((d) => d.doctorId === doctor.doctorId) + 1;
          if (nextIndex >= ranked.length) {
            await showAlert({
              title: "No free slots",
              message:
                "None of your preferred doctors have a free slot on this date. Try a different date or add another doctor.",
              confirmText: "OK",
            });
            return;
          }

          const next = ranked[nextIndex];
          await showAlert({
            title: `${doctor.name} has no free slots`,
            message: `Switching to your next preference, ${next.name}.`,
            confirmText: "OK",
          });
          setActivePreference(next);
          setSelectedSlot(null);
          doctor = next;
        }
      } catch (error) {
        LogService.write(`Failed to load slots for ${doctor.doctorId}: ${error}`);
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    },
    [showAlert],
  );

  // Tapping a doctor card adds/removes it from the ranked list (max 3); tapping a preference chip
  // removes it the same way.
  const togglePreferredDoctor = useCallback(
    async (doctor: DoctorCard) => {
      const existing = preferredDoctors.find((d) => d.doctorId === doctor.doctorId);

      if (existing) {
        const remaining = preferredDoctors.filter((d) => d.doctorId !== doctor.doctorId);
        setPreferredDoctors(remaining);

        if (activePreference?.doctorId === existing.doctorId) {
          const nextActive = remaining[0] ?? null;
          setActivePreference(nextActive);
          setAvailableSlots([]);
          setSelectedSlot(null);
          if (nextActive) await loadSlots(nextActive, selectedBookingDate, remaining);
        }
        return;
      }

      if (preferredDoctors.length >= MAX_PREFERRED_DOCTORS) {
        await showAlert({
          title: "Maximum reached",
          message: "You can pick up to 3 preferred doctors.",
          confirmText: "OK",
        });
        return;
      }

      const ranked = [...preferredDoctors, doctor];
      setPreferredDoctors(ranked);

      if (!activePreference) {
        setActivePreference(doctor);
        await loadSlots(doctor, selectedBookingDate, ranked);
      }
    },
    [preferredDoctors, activePreference, selectedBookingDate, showAlert, loadSlots],
  );

  const changeBookingDate = useCallback(
    (date: Date) => {
      setSelectedBookingDate(date);
      if (activePreference) void loadSlots(activePreference, date, preferredDoctors);
    },
    [activePreference, preferredDoctors, loadSlots],
  );

  const selectSlot = useCallback((slot: PatientSlot) => {
    if (slot.isAvailable) setSelectedSlot(slot);
  }, []);

  // ---------------- booking: submit ----------------

  const submitBookingRequest = useCallback(async () => {
    if (!activePreference?.doctorId || !selectedSlot) {
      await showAlert({ title: "Pick a slot", message: "Select an available time slot before requesting.", confirmText: "OK" });
      return;
    }

    try {
      setIsBookingSubmitting(true);

      const result = await api.postForResult<BookingResult>(Endpoints.patient.appointments, {
        doctorId: activePreference.doctorId,
        appointmentDate: selectedSlot.start,
        notes: bookingNotes,
      });

      if (!result) {
        await showAlert({ title: "Something went wrong", message: "Please check your connection and try again.", confirmText: "OK" });
        return;
      }

      if (!result.status) {
        await showAlert({
          title: "Unable to request this slot",
          message: result.message ?? "Please choose another slot.",
          confirmText: "OK",
        });
        await loadSlots(activePreference, selectedBookingDate, preferredDoctors);
        return;
      }

      await showAlert({
        title: "Request sent",
        message: result.message ?? "The clinic will confirm shortly.",
        confirmText: "Great",
      });

      setIsBookingPanelOpen(false);
      setPreferredDoctors([]);
      setActivePreference(null);
      setAvailableSlots([]);
      setSelectedSlot(null);
      setBookingNotes("");
      await loadAppointments();
    } catch (error) {
      LogService.write(`Failed to submit appointment request: ${error}`);
      await showAlert({ title: "Something went wrong", message: "Please check your connection and try again.", confirmText: "OK" });
    } finally {
      setIsBookingSubmitting(false);
    }
  }, [activePreference, selectedSlot, bookingNotes, selectedBookingDate, preferredDoctors, showAlert, loadSlots, loadAppointments]);

  // ---------------- consultation notes ----------------

  const showConsultationNotes = useCallback(
    async (appointment: AppointmentItem) => {
      const consultation = consultations.current.find((c) => c.appointmentId === appointment.appointmentId);

      if (!consultation) {
        await showAlert({
          title: "No consultation notes yet",
          message: "Your doctor hasn't recorded consultation details for this visit yet.",
          confirmText: "Understood",
        });
        return;
      }

      const message = [
        consultation.chiefComplaint?.trim() ? `Reason for visit: ${consultation.chiefComplaint}` : null,
        consultation.diagnosisDescription?.trim() ? `Diagnosis: ${consultation.diagnosisDescription}` : null,
        consultation.plannedProcedures?.trim() ? `Plan: ${consultation.plannedProcedures}` : null,
      ]
        .filter((line): line is string => line != null)
        .join("\n\n");

      await showAlert({
        title: `Consultation with ${consultation.doctorName}`,
        message: message || "No further details were recorded for this consultation.",
        confirmText: "Close",
      });
    },
    [showAlert],
  );

  return {
    isBusy,
    upcomingAppointments,
    pastAppointments,
    initialize,
    refreshSilently,
    showConsultationNotes,
    // booking panel
    isBookingPanelOpen,
    toggleBookingPanel,
    isLoadingDoctors,
    isLoadingSlots,
    isBookingSubmitting,
    specializationNames,
    selectedSpecializationName,
    setSelectedSpecializationName,
    doctorCards,
    preferredDoctors,
    activePreference,
    togglePreferredDoctor,
    selectedBookingDate,
    changeBookingDate,
    availableSlots,
    selectedSlot,
    selectSlot,
    bookingNotes,
    setBookingNotes,
    submitBookingRequest,
  };
}
