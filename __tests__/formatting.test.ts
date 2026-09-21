import { argb } from "@/theme/colors";
import { formatChatStamp, parseServerDate, parseServerUtcDate, toApiDate, today } from "@/utils/date";
import { computeInitials, getInitials } from "@/utils/initials";
import { describeDuration, describeResult } from "@/viewmodels/recordsFormat";

describe("getInitials (chat avatars)", () => {
  it("uses the first two words, skipping a Dr. title", () => {
    expect(getInitials("Dr. Jane Smith")).toBe("JS");
    expect(getInitials("dr.  Arun Kumar Rao")).toBe("AK");
  });

  it("copes with single words and blanks", () => {
    expect(getInitials("Reception")).toBe("R");
    expect(getInitials("   ")).toBe("");
    expect(getInitials(null)).toBe("");
    expect(getInitials(undefined)).toBe("");
  });
});

describe("computeInitials (profile headers)", () => {
  it("uses first and LAST name initial", () => {
    expect(computeInitials("John Smith")).toBe("JS");
    expect(computeInitials("Mary Ann Elizabeth Jones")).toBe("MJ");
  });

  it("falls back to P for empty names and to a single letter for one word", () => {
    expect(computeInitials("")).toBe("P");
    expect(computeInitials(undefined)).toBe("P");
    expect(computeInitials("Madonna")).toBe("M");
  });
});

describe("argb (XAML #AARRGGBB -> RN #RRGGBBAA)", () => {
  it("moves the alpha byte to the end", () => {
    expect(argb("#8CFFFFFF")).toBe("#FFFFFF8C");
    expect(argb("#150055CC")).toBe("#0055CC15");
  });

  it("leaves opaque colours alone", () => {
    expect(argb("#0A6CFF")).toBe("#0A6CFF");
  });
});

describe("server dates", () => {
  it("trims .NET's 7 fractional digits so every JS engine can parse them", () => {
    const parsed = parseServerDate("2026-09-20T10:15:30.1234567");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMinutes()).toBe(15);
    expect(parsed.getSeconds()).toBe(30);
  });

  it("reads a zone-less timestamp as local time (as the MAUI app did)", () => {
    const parsed = parseServerDate("2026-09-20T10:00:00");
    expect(parsed.getHours()).toBe(10);
  });

  it("reads chat instants as UTC whether or not the API marked them (send vs read responses)", () => {
    const sent = parseServerUtcDate("2026-09-21T08:30:57.2968980Z");
    const readBack = parseServerUtcDate("2026-09-21T08:30:57.296898");
    expect(sent.toISOString()).toBe("2026-09-21T08:30:57.296Z");
    expect(readBack.getTime()).toBe(sent.getTime());
    expect(parseServerUtcDate("2026-09-21T12:30:57+04:00").toISOString()).toBe("2026-09-21T08:30:57.000Z");
  });

  it("formats the slots-endpoint date as yyyy-MM-dd in local time", () => {
    expect(toApiDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(toApiDate(new Date(2026, 11, 31, 0, 1))).toBe("2026-12-31");
  });

  it("today() is local midnight", () => {
    const t = today();
    expect([t.getHours(), t.getMinutes(), t.getSeconds()]).toEqual([0, 0, 0]);
  });

  it("chat stamps combine the short date and the time, in the device's own locale conventions", () => {
    const stamp = formatChatStamp(new Date(2026, 8, 20, 15, 5));
    expect(stamp).toContain("20");
    // 12-hour ("3:05 PM") or 24-hour ("15:05") depending on the phone's region.
    expect(stamp).toMatch(/3:05|15:05/);
  });
});

describe("describeDuration (active prescriptions)", () => {
  const started = "2026-09-01T00:00:00";
  const at = (iso: string) => Date.parse(iso);

  it("is Ongoing when the course has no end", () => {
    expect(describeDuration({ durationDays: null, startedAt: started })).toBe("Ongoing");
  });

  it("counts whole days remaining", () => {
    expect(describeDuration({ durationDays: 10, startedAt: started }, at("2026-09-04T12:00:00Z"))).toBe("7 day(s) remaining");
  });

  it("reports a finished course", () => {
    expect(describeDuration({ durationDays: 5, startedAt: started }, at("2026-09-06T00:00:00Z"))).toBe("Course complete");
    expect(describeDuration({ durationDays: 5, startedAt: started }, at("2026-10-01T00:00:00Z"))).toBe("Course complete");
  });
});

describe("describeResult (lab & radiology)", () => {
  it("prefers the report when a file exists", () => {
    expect(describeResult({ hasResultFile: true, status: "Completed" })).toMatch(/ready/);
  });

  it.each([
    ["Requested", "Awaiting sample collection."],
    ["SampleCollected", "Sample collected, processing has begun."],
    ["Processing", "Your test is being processed by the lab."],
    ["Scheduled", "Your scan has been scheduled."],
    ["Anything else", "Awaiting results."],
  ])("explains status %s", (status, expected) => {
    expect(describeResult({ hasResultFile: false, status })).toBe(expected);
  });
});
