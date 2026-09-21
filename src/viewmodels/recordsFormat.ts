import type { MyMedication, MyTestResult } from "@/api/types";

const DAY_MS = 24 * 60 * 60 * 1000;

// Server timestamps are UTC without a zone marker. The remaining-days count subtracts from "now"
// (as the MAUI app did with DateTime.UtcNow), so the start must be read as UTC too - reading it as
// local would shift the answer by the user's UTC offset.
function parseServerUtc(value: string): number {
  return Date.parse(value.replace(/(\.\d{3})\d+/, "$1") + "Z");
}

export function describeDuration(m: Pick<MyMedication, "durationDays" | "startedAt">, now = Date.now()): string {
  if (m.durationDays == null) return "Ongoing";

  // TimeSpan.Days is whole days, truncated toward zero.
  const elapsedDays = Math.trunc((now - parseServerUtc(m.startedAt)) / DAY_MS);
  const remaining = m.durationDays - elapsedDays;
  return remaining > 0 ? `${remaining} day(s) remaining` : "Course complete";
}

export function describeResult(t: Pick<MyTestResult, "hasResultFile" | "status">): string {
  if (t.hasResultFile) return "Your result is ready. Tap to view the full report.";

  switch (t.status) {
    case "Requested":
      return "Awaiting sample collection.";
    case "SampleCollected":
      return "Sample collected, processing has begun.";
    case "Processing":
      return "Your test is being processed by the lab.";
    case "Scheduled":
      return "Your scan has been scheduled.";
    default:
      return "Awaiting results.";
  }
}
