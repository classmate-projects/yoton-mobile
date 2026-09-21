import { useCallback, useRef, useState } from "react";

import { api } from "@/api/client";
import { Endpoints } from "@/api/endpoints";
import type { ApiEnvelope, MyAppointment, MyMedication, MyProfile } from "@/api/types";
import { useAlert } from "@/components/GlassDialogs";
import { LogService } from "@/services/logger";
import { prefs, PrefKeys } from "@/services/storage";
import { parseServerDate } from "@/utils/date";

import { isUpcoming, notifyNewlyConfirmed, toAppointmentItem, type AppointmentItem } from "./appointmentFormat";

export interface PatientTask {
  title: string;
  details: string;
}

// The Home dashboard: profile greeting, up to five upcoming appointments, and the patient's real
// active prescriptions. (Port of the MAUI HomeViewModel.)
export function useHome() {
  const { showAlert } = useAlert();

  const [isBusy, setIsBusy] = useState(false);
  // Ignores a re-entrant load (e.g. the tab regaining focus mid-refresh) rather than stacking requests.
  const loading = useRef(false);
  const [patientName, setPatientName] = useState("Patient");
  // Capped at 5 so the carousel stays quick to skim; the Appointments tab shows the full list.
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentItem[]>([]);
  const [todayTasks, setTodayTasks] = useState<PatientTask[]>([]);

  const loadProfile = useCallback(async () => {
    try {
      const response = await api.get<ApiEnvelope<MyProfile>>(Endpoints.patient.me);
      const name = response.data?.name;
      if (name?.trim()) {
        setPatientName(name);
        await prefs.setString(PrefKeys.userName, name);
      }
    } catch (error) {
      // Keep the cached name when offline.
      LogService.write(`Failed to load profile: ${error}`);
    }
  }, []);

  const loadUpcomingAppointments = useCallback(async () => {
    try {
      const response = await api.get<ApiEnvelope<MyAppointment[]>>(Endpoints.patient.appointments);
      const appointments = response.data ?? [];
      const now = new Date();

      setUpcomingAppointments(
        appointments
          .filter((a) => isUpcoming(a, now))
          .sort((a, b) => parseServerDate(a.appointmentDate).getTime() - parseServerDate(b.appointmentDate).getTime())
          .slice(0, 5)
          .map(toAppointmentItem),
      );

      // Diffed against the full list (not just the 5 shown) so a confirmation outside the
      // top-5 window still surfaces the one-time nudge.
      await notifyNewlyConfirmed(appointments, showAlert);
    } catch (error) {
      LogService.write(`Failed to load upcoming appointments: ${error}`);
      setUpcomingAppointments([]);
    }
  }, [showAlert]);

  // Real active prescriptions, not invented dose times: there's no dose-tracking backend to say
  // whether a dose was actually taken today, so this shows what the clinic has prescribed.
  const loadActiveMedications = useCallback(async () => {
    try {
      const response = await api.get<ApiEnvelope<MyMedication[]>>(Endpoints.patient.prescriptions);
      const medications = response.data ?? [];

      setTodayTasks(
        medications
          .filter((m) => m.status === "Active")
          .sort((a, b) => parseServerDate(b.startedAt).getTime() - parseServerDate(a.startedAt).getTime())
          .map((m) => ({
            title: m.drugName,
            details: [m.dosage, m.frequency].filter((s) => s?.trim()).join(" • "),
          })),
      );
    } catch (error) {
      LogService.write(`Failed to load active medications: ${error}`);
      setTodayTasks([]);
    }
  }, []);

  const initialize = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    setIsBusy(true);
    try {
      setPatientName(await prefs.getString(PrefKeys.userName, "Patient User"));
      await loadProfile();
      await loadUpcomingAppointments();
      await loadActiveMedications();
    } finally {
      loading.current = false;
      setIsBusy(false);
    }
  }, [loadProfile, loadUpcomingAppointments, loadActiveMedications]);

  // Used by the foreground poll: deliberately doesn't toggle isBusy, so the glass overlay
  // doesn't flash every minute while the patient is browsing.
  const refreshSilently = loadUpcomingAppointments;

  return { isBusy, patientName, upcomingAppointments, todayTasks, initialize, refreshSilently };
}
