import type { MyAppointment } from "@/api/types";
import { detectNewlyConfirmed } from "@/services/appointmentTracker";
import { formatLongWithTime, formatTime, formatWeekdayMonthDay, parseServerDate } from "@/utils/date";

import type { AlertOptions } from "@/components/GlassDialogs";

// Shared display model for an appointment card - used by both the Appointments list/booking
// screen and the Home dashboard carousel.
export interface AppointmentItem {
  appointmentId: string | null;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: string;
  location: string;
}

export function toAppointmentItem(a: MyAppointment): AppointmentItem {
  const when = parseServerDate(a.appointmentDate);
  return {
    appointmentId: a.appointmentId ?? null,
    doctorName: a.doctorName,
    specialty: a.specializationName ?? "General Consultation",
    date: formatWeekdayMonthDay(when),
    time: formatTime(when),
    status: a.status,
    location: a.specializationName ? `${a.specializationName} Department` : "Yoton Health Clinic",
  };
}

// Upcoming = still ahead of now and not finished/cancelled; everything else is history.
export function isUpcoming(a: MyAppointment, now = new Date()): boolean {
  return (
    parseServerDate(a.appointmentDate) >= now && a.status !== "Cancelled" && a.status !== "Completed"
  );
}

// Called from both Home and Appointments so the "your appointment was confirmed" nudge fires
// once, from whichever screen loads the list first (they diff against the same stored snapshot).
export async function notifyNewlyConfirmed(
  appointments: MyAppointment[],
  showAlert: (options: AlertOptions) => Promise<boolean>,
): Promise<void> {
  const newlyConfirmed = await detectNewlyConfirmed(appointments);
  if (newlyConfirmed.length === 0) return;

  const first = newlyConfirmed[0];
  const suffix = newlyConfirmed.length > 1 ? ` (and ${newlyConfirmed.length - 1} more)` : "";

  await showAlert({
    title: "Appointment confirmed!",
    message: `Your appointment with ${first.doctorName} on ${formatLongWithTime(
      parseServerDate(first.appointmentDate),
    )} has been confirmed${suffix}.`,
    confirmText: "Great",
  });
}
