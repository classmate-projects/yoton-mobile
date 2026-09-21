import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MyAppointment } from "@/api/types";
import { detectNewlyConfirmed } from "@/services/appointmentTracker";

const appt = (id: string | null, status: string): MyAppointment =>
  ({
    appointmentId: id,
    doctorName: "Dr. Test",
    appointmentDate: "2026-09-25T10:00:00",
    status,
  }) as MyAppointment;

describe("detectNewlyConfirmed", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("reports nothing on the very first load (no baseline yet)", async () => {
    expect(await detectNewlyConfirmed([appt("a1", "Scheduled")])).toEqual([]);
  });

  it("reports a Pending -> Scheduled transition exactly once", async () => {
    await detectNewlyConfirmed([appt("a1", "Pending")]);

    const first = await detectNewlyConfirmed([appt("a1", "Scheduled")]);
    expect(first.map((a) => a.appointmentId)).toEqual(["a1"]);

    // Home and Appointments share the snapshot: whichever loads second must not re-alert.
    expect(await detectNewlyConfirmed([appt("a1", "Scheduled")])).toEqual([]);
  });

  it("ignores other transitions and appointments without an id", async () => {
    await detectNewlyConfirmed([appt("a1", "Pending"), appt("a2", "Scheduled"), appt(null, "Pending")]);

    const result = await detectNewlyConfirmed([
      appt("a1", "Cancelled"),
      appt("a2", "Completed"),
      appt(null, "Scheduled"),
    ]);
    expect(result).toEqual([]);
  });

  it("survives a corrupt snapshot", async () => {
    await AsyncStorage.setItem("appointment_status_snapshot", "{not json");
    expect(await detectNewlyConfirmed([appt("a1", "Scheduled")])).toEqual([]);
  });
});
