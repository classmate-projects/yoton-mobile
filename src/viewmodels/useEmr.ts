import * as FileSystem from "expo-file-system";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useRef, useState } from "react";
import { Share } from "react-native";

import { api } from "@/api/client";
import { backendAssetUrl, Endpoints } from "@/api/endpoints";
import type {
  ApiEnvelope,
  EmrEncounterDetail,
  MyConsultation,
  MyTestResult,
} from "@/api/types";
import { login } from "@/services/auth";
import { LogService } from "@/services/logger";
import { prefs, PrefKeys } from "@/services/storage";
import { withoutAppLock } from "@/services/appLock";
import { formatMonthDayYear, parseServerDate, toApiDate } from "@/utils/date";

export interface EmrTileItem {
  encounterId: string;
  doctorName: string;
  visitDate: string;
  chiefComplaint: string;
}

// Default date range: two-month interval — start of last month through end of current month.
function defaultDateRange(): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from, to };
}

export function useEmr() {
  const defaults = defaultDateRange();
  const [fromDate, setFromDate] = useState<Date>(defaults.from);
  const [toDate, setToDate] = useState<Date>(defaults.to);

  const [isBusy, setIsBusy] = useState(false);
  const [tiles, setTiles] = useState<EmrTileItem[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<EmrEncounterDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const loading = useRef(false);

  const loadConsultations = useCallback(async (from: Date, to: Date) => {
    if (loading.current) return;
    loading.current = true;
    setIsBusy(true);
    try {
      const fromStr = toApiDate(from);
      const toStr = toApiDate(to);
      const response = await api.get<ApiEnvelope<MyConsultation[]>>(
        Endpoints.patient.emrConsultations(fromStr, toStr),
      );
      setTiles(
        (response.data ?? []).map((c) => ({
          encounterId: c.encounterId ?? "",
          doctorName: c.doctorName ?? "Doctor",
          visitDate: formatMonthDayYear(parseServerDate(c.createdAt)),
          chiefComplaint: c.chiefComplaint ?? "General visit",
        })),
      );
    } catch (error) {
      LogService.write(`EMR load failed: ${error}`);
      setTiles([]);
    } finally {
      loading.current = false;
      setIsBusy(false);
    }
  }, []);

  const applyDateRange = useCallback(
    (from: Date, to: Date) => {
      setFromDate(from);
      setToDate(to);
      void loadConsultations(from, to);
    },
    [loadConsultations],
  );

  const openDetail = useCallback(async (encounterId: string) => {
    if (!encounterId) return;
    setIsLoadingDetail(true);
    setIsDetailOpen(true);
    try {
      const response = await api.get<ApiEnvelope<EmrEncounterDetail>>(
        Endpoints.patient.encounterDetail(encounterId),
      );
      setSelectedDetail(response.data ?? null);
    } catch (error) {
      LogService.write(`EMR detail load failed: ${error}`);
      setSelectedDetail(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedDetail(null);
  }, []);

  // Re-authenticates using the stored login identifier + user-supplied password.
  // Returns true if verified, false otherwise.
  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    try {
      const identifier = await prefs.getString(PrefKeys.loginIdentifier, "");
      if (!identifier) return false;
      const outcome = await login(identifier, password);
      return outcome.kind === "success";
    } catch {
      return false;
    }
  }, []);

  // Opens the PDF in the in-app browser (ChromeCustomTabs / SFSafariViewController).
  // No password required — preview only.
  const previewPdf = useCallback(async (result: MyTestResult) => {
    const url = backendAssetUrl(result.resultFilePath);
    if (!url) return;
    try {
      await withoutAppLock(() => WebBrowser.openBrowserAsync(url));
    } catch (error) {
      LogService.write(`EMR PDF preview failed: ${error}`);
    }
  }, []);

  // Downloads the PDF to the app's document directory after password auth.
  // Returns a message describing the outcome for the caller to display as a toast.
  const downloadPdf = useCallback(
    async (result: MyTestResult, password: string): Promise<string> => {
      const verified = await verifyPassword(password);
      if (!verified) return "Incorrect password. Download cancelled.";

      const url = backendAssetUrl(result.resultFilePath);
      if (!url) return "No file available.";

      const safeName = result.testName.replace(/[^a-zA-Z0-9]/g, "_");
      const localPath = `${FileSystem.documentDirectory}${safeName}.pdf`;
      try {
        await FileSystem.downloadAsync(url, localPath);
        return `Saved to: ${localPath}`;
      } catch (error) {
        LogService.write(`EMR download failed: ${error}`);
        return "Download failed. Please try again.";
      }
    },
    [verifyPassword],
  );

  // Verifies password then shares a formatted text summary as the "print" action.
  // Throws if the password is incorrect so the UI can show an error without closing.
  // The system share sheet on iOS shows a Print option; Android surfaces available apps.
  const printEncounter = useCallback(
    async (
      detail: EmrEncounterDetail,
      includeDoctorEntries: boolean,
      includeNurseEntries: boolean,
      password: string,
    ): Promise<void> => {
      const verified = await verifyPassword(password);
      if (!verified) throw new Error("incorrect_password");
      const lines: string[] = [];
      lines.push("ELECTRONIC MEDICAL RECORD");
      lines.push("=".repeat(40));
      lines.push(`Patient Visit Record`);
      lines.push(`Doctor: ${detail.doctorName ?? "—"}`);
      if (detail.specializationName) lines.push(`Specialization: ${detail.specializationName}`);
      lines.push(`Visit Date: ${formatMonthDayYear(parseServerDate(detail.createdAt))}`);
      lines.push("=".repeat(40));

      if (includeDoctorEntries) {
        lines.push("\nDOCTOR'S ENTRIES");
        lines.push("-".repeat(30));
        if (detail.chiefComplaint) lines.push(`Chief Complaint: ${detail.chiefComplaint}`);
        if (detail.diagnosisDescription) lines.push(`Diagnosis: ${detail.diagnosisDescription}`);
        if (detail.diagnosisCode) lines.push(`Diagnosis Code: ${detail.diagnosisCode}`);
        if (detail.clinicalExamination) lines.push(`Clinical Examination: ${detail.clinicalExamination}`);
        if (detail.examinationNotes) lines.push(`Examination Notes: ${detail.examinationNotes}`);
        if (detail.plannedProcedures) lines.push(`Treatment Plan: ${detail.plannedProcedures}`);

        const ros = detail.reviewOfSystems;
        if (ros) {
          lines.push("\nReview of Systems:");
          const systems: [string, string | null | undefined][] = [
            ["Constitutional", ros.constitutional],
            ["Eye/Ear/Nose/Mouth/Throat", ros.eyeEarNoseMouthThroat],
            ["Cardiovascular", ros.cardiovascular],
            ["Respiratory", ros.respiratory],
            ["Gastroenterology", ros.gastroenterology],
            ["Genitourinary", ros.genitourinary],
            ["Musculoskeletal", ros.musculoskeletal],
            ["Neurological", ros.neurological],
            ["Psychiatric", ros.psychiatric],
            ["Endocrine", ros.endocrine],
            ["Hematologic", ros.hematologic],
            ["Allergic/Immunologic", ros.allergicImmunologic],
            ["Integumentary", ros.integumentary],
          ];
          systems.filter(([, v]) => v).forEach(([k, v]) => lines.push(`  ${k}: ${v}`));
        }

        if (detail.medications.length > 0) {
          lines.push("\nMedications Prescribed:");
          detail.medications.forEach((m) => {
            lines.push(`  • ${m.drugName}${m.dosage ? ` ${m.dosage}` : ""} — ${m.frequency ?? "as directed"}`);
          });
        }
      }

      if (includeNurseEntries) {
        const t = detail.triage;
        if (t) {
          lines.push("\nNURSE'S ENTRIES — Triage");
          lines.push("-".repeat(30));
          if (t.nurseName) lines.push(`Nurse: ${t.nurseName}`);
          if (t.chiefComplaint) lines.push(`Chief Complaint: ${t.chiefComplaint}`);
          if (t.priorityLevel) lines.push(`Priority Level: ${t.priorityLevel}`);
          const vitals: [string, string][] = [];
          if (t.bPSystolic && t.bPDiastolic) vitals.push(["Blood Pressure", `${t.bPSystolic}/${t.bPDiastolic} mmHg`]);
          if (t.heartRate) vitals.push(["Heart Rate", `${t.heartRate} bpm`]);
          if (t.temperature) vitals.push(["Temperature", `${t.temperature}°C${t.tempSite ? ` (${t.tempSite})` : ""}`]);
          if (t.respiratory) vitals.push(["Respiratory Rate", `${t.respiratory} breaths/min`]);
          if (t.oxygenSaturation) vitals.push(["O₂ Saturation", `${t.oxygenSaturation}%`]);
          if (t.heightCm) vitals.push(["Height", `${t.heightCm} cm`]);
          if (t.weightKg) vitals.push(["Weight", `${t.weightKg} kg`]);
          if (t.bmi) vitals.push(["BMI", `${t.bmi.toFixed(1)}`]);
          if (t.bloodSugar) vitals.push(["Blood Sugar", `${t.bloodSugar} mmol/L`]);
          vitals.forEach(([k, v]) => lines.push(`  ${k}: ${v}`));
        }

        if (detail.nurseNotes.length > 0) {
          if (!t) {
            lines.push("\nNURSE'S ENTRIES");
            lines.push("-".repeat(30));
          }
          detail.nurseNotes.forEach((n) => {
            lines.push(`\n[${n.nurseName ?? "Nurse"} — ${formatMonthDayYear(parseServerDate(n.createdAt))}]`);
            // Strip HTML tags for plain-text share
            lines.push(n.contentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
          });
        }
      }

      lines.push("\n" + "=".repeat(40));
      lines.push("Generated by Yoton Health");

      try {
        await Share.share({ message: lines.join("\n"), title: "Medical Record" });
      } catch (error) {
        LogService.write(`EMR share/print failed: ${error}`);
      }
    },
    [],
  );

  return {
    fromDate, toDate, isBusy, tiles,
    selectedDetail, isDetailOpen, isLoadingDetail,
    loadConsultations, applyDateRange,
    openDetail, closeDetail,
    verifyPassword, previewPdf, downloadPdf, printEncounter,
  };
}
