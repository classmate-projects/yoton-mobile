import type { MyAppointment } from "@/api/types";

import { prefs, PrefKeys } from "./storage";

// Detects "Pending -> Scheduled" confirmations across screens and sessions, so the patient
// gets a one-time in-app nudge without needing real push notifications (v1 scope: they only
// find out while the app is open, not while it's fully closed). Shared by Home and
// Appointments against the same stored snapshot, so whichever loads first "claims" the diff and
// the other doesn't re-alert for it.

type Snapshot = Record<string, string>;

async function loadSnapshot(): Promise<Snapshot> {
  try {
    const json = await prefs.getString(PrefKeys.appointmentStatusSnapshot, "");
    if (!json.trim()) return {};
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Snapshot) : {};
  } catch {
    return {};
  }
}

async function saveSnapshot(current: MyAppointment[]): Promise<void> {
  try {
    const map: Snapshot = {};
    for (const appointment of current) {
      if (appointment.appointmentId) map[appointment.appointmentId] = appointment.status;
    }
    await prefs.setString(PrefKeys.appointmentStatusSnapshot, JSON.stringify(map));
  } catch {
    // Best-effort only - a failed write just means the next load diffs against a stale
    // baseline, not a crash.
  }
}

export async function detectNewlyConfirmed(current: MyAppointment[]): Promise<MyAppointment[]> {
  const previous = await loadSnapshot();

  const confirmed = current.filter(
    (appointment) =>
      !!appointment.appointmentId &&
      previous[appointment.appointmentId] === "Pending" &&
      appointment.status === "Scheduled",
  );

  await saveSnapshot(current);
  return confirmed;
}
