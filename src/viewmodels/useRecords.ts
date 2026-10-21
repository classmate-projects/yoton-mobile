import * as WebBrowser from "expo-web-browser";
import { useCallback, useRef, useState } from "react";

import { api } from "@/api/client";
import { backendAssetUrl, Endpoints } from "@/api/endpoints";
import type { ApiEnvelope, MyBill, MyMedication, MyTestResult } from "@/api/types";
import { withoutAppLock } from "@/services/appLock";
import { LogService } from "@/services/logger";
import { prefs, PrefKeys } from "@/services/storage";
import { formatMonthDayYear, parseServerDate } from "@/utils/date";

import { describeDuration, describeResult } from "./recordsFormat";

export interface PrescriptionItem {
  drugName: string;
  dosage: string;
  frequency: string;
  instructions: string;
  doctorName: string;
  refillsLeft: string;
}

export interface LabResultItem {
  testName: string;
  date: string;
  doctorName: string;
  status: string;
  resultSummary: string;
  resultFilePath: string | null;
  hasResultFile: boolean;
}

export interface BillItemDisplay {
  billId: string;
  dateLabel: string;
  netAmountLabel: string;
  status: string;
  summaryLine: string;
}

const byNewest = (a: string, b: string) => parseServerDate(b).getTime() - parseServerDate(a).getTime();

// The Records tab: active prescriptions, lab & radiology results, and (view-only) bills.
// Each section loads independently so one failing endpoint doesn't blank the others.
export function useRecords() {
  const [isBusy, setIsBusy] = useState(false);
  const loading = useRef(false);

  const [activePrescriptions, setActivePrescriptions] = useState<PrescriptionItem[]>([]);
  const [labResults, setLabResults] = useState<LabResultItem[]>([]);
  const [bills, setBills] = useState<BillItemDisplay[]>([]);

  const loadRecords = useCallback(async () => {
    try {
      const response = await api.get<ApiEnvelope<MyMedication[]>>(Endpoints.patient.prescriptions);
      setActivePrescriptions(
        (response.data ?? [])
          .filter((m) => m.status === "Active")
          .sort((a, b) => byNewest(a.startedAt, b.startedAt))
          .map((m) => ({
            drugName: m.dosage ? `${m.drugName} ${m.dosage}` : m.drugName,
            dosage: m.dosage ?? "As directed",
            frequency: m.frequency ?? "As directed",
            instructions: m.instructions ?? (m.route ? `Route: ${m.route}` : "No special instructions"),
            doctorName: m.doctorName ?? "Unassigned",
            refillsLeft: describeDuration(m),
          })),
      );
    } catch {
      setActivePrescriptions([]);
    }

    try {
      const response = await api.get<ApiEnvelope<MyTestResult[]>>(Endpoints.patient.testResults);
      setLabResults(
        (response.data ?? [])
          .sort((a, b) => byNewest(a.requestedDate, b.requestedDate))
          .map((t) => ({
            testName: t.testName,
            date: formatMonthDayYear(parseServerDate(t.completedDate ?? t.requestedDate)),
            doctorName: t.doctorName ?? "Unassigned",
            status: t.status,
            resultSummary: describeResult(t),
            resultFilePath: t.resultFilePath ?? null,
            hasResultFile: !!t.resultFilePath,
          })),
      );
    } catch {
      setLabResults([]);
    }

    try {
      const response = await api.get<ApiEnvelope<MyBill[]>>(Endpoints.patient.bills);
      const currencySymbol = await prefs.getString(PrefKeys.currencySymbol, "");
      // "QR 12.50" / "AED 12.50" for letter symbols, "₹12.50" for a sign (as on the web).
      const money = (amount: number) =>
        /[A-Za-z.]$/.test(currencySymbol) ? `${currencySymbol} ${amount.toFixed(2)}` : `${currencySymbol}${amount.toFixed(2)}`;
      setBills(
        (response.data ?? [])
          .sort((a, b) => byNewest(a.createdAt, b.createdAt))
          .map((b) => ({
            billId: b.billId ?? "",
            dateLabel: formatMonthDayYear(parseServerDate(b.createdAt)),
            netAmountLabel: money(b.netAmount),
            status: b.status,
            summaryLine:
              b.items.length > 0
                ? b.items
                    .slice(0, 3)
                    .map((i) => i.description)
                    .join(", ")
                : "No itemized charges yet",
          })),
      );
    } catch {
      setBills([]);
    }
  }, []);

  const initialize = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    setIsBusy(true);
    try {
      await loadRecords();
    } finally {
      loading.current = false;
      setIsBusy(false);
    }
  }, [loadRecords]);

  // Opens the lab/radiology report file in the system browser.
  const viewReport = useCallback(async (item: LabResultItem) => {
    const url = backendAssetUrl(item.resultFilePath);
    if (!url) return;
    try {
      await withoutAppLock(() => WebBrowser.openBrowserAsync(url));
    } catch (error) {
      LogService.write(`Failed to open report: ${error}`);
    }
  }, []);

  return { isBusy, activePrescriptions, labResults, bills, initialize, viewReport };
}
