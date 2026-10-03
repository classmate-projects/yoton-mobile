import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Divider } from "@/components/layout";
import { PasswordPromptModal } from "@/components/PasswordPromptModal";
import { palette } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/typography";
import { formatMonthDayYear, parseServerDate } from "@/utils/date";
import type { EmrEncounterDetail, EmrRos, MyMedication, MyTestResult } from "@/api/types";
import { showToast } from "@/components/Toast";

interface EMRDetailModalProps {
  visible: boolean;
  detail: EmrEncounterDetail | null;
  isLoading: boolean;
  onPreviewPdf: (result: MyTestResult) => void;
  onDownloadPdf: (result: MyTestResult, password: string) => Promise<string>;
  /** Receives password so the parent can verify before printing. Throw on auth failure. */
  onPrint: (detail: EmrEncounterDetail, includeDoctorEntries: boolean, includeNurseEntries: boolean, password: string) => Promise<void>;
  onClose: () => void;
}

type PrintGateStep = "idle" | "selecting" | "authenticating" | "printing";
type DownloadTarget = { result: MyTestResult } | null;

// The full encounter detail popup: doctor entries, nurse entries, lab/radiology list.
// Print requires password auth with section checkboxes. PDF download also requires password.
export function EMRDetailModal({
  visible,
  detail,
  isLoading,
  onPreviewPdf,
  onDownloadPdf,
  onPrint,
  onClose,
}: EMRDetailModalProps) {
  const theme = useTheme();

  // Print flow state
  const [printStep, setPrintStep] = useState<PrintGateStep>("idle");
  const [includeDoctorEntries, setIncludeDoctorEntries] = useState(true);
  const [includeNurseEntries, setIncludeNurseEntries] = useState(true);
  const [printAuthError, setPrintAuthError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Download flow state
  const [downloadTarget, setDownloadTarget] = useState<DownloadTarget>(null);
  const [downloadAuthError, setDownloadAuthError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const resetPrint = useCallback(() => {
    setPrintStep("idle");
    setPrintAuthError(null);
    setIncludeDoctorEntries(true);
    setIncludeNurseEntries(true);
    setIsPrinting(false);
  }, []);

  const handlePrintPress = useCallback(() => {
    setPrintStep("selecting");
    setPrintAuthError(null);
  }, []);

  const handlePrintSelectionNext = useCallback(() => {
    if (!includeDoctorEntries && !includeNurseEntries) return;
    setPrintStep("authenticating");
  }, [includeDoctorEntries, includeNurseEntries]);

  const handlePrintPasswordConfirm = useCallback(
    async (password: string) => {
      if (!detail) return;
      setIsPrinting(true);
      setPrintAuthError(null);
      try {
        await onPrint(detail, includeDoctorEntries, includeNurseEntries, password);
        resetPrint();
      } catch {
        setPrintAuthError("Incorrect password. Please try again.");
        setIsPrinting(false);
      }
    },
    [detail, includeDoctorEntries, includeNurseEntries, onPrint, resetPrint],
  );

  const handleDownloadPress = useCallback((result: MyTestResult) => {
    setDownloadTarget({ result });
    setDownloadAuthError(null);
  }, []);

  const handleDownloadPasswordConfirm = useCallback(
    async (password: string) => {
      if (!downloadTarget) return;
      setIsDownloading(true);
      setDownloadAuthError(null);
      const msg = await onDownloadPdf(downloadTarget.result, password);
      setIsDownloading(false);
      if (msg.startsWith("Incorrect") || msg.startsWith("Download failed") || msg.startsWith("No file")) {
        setDownloadAuthError(msg);
      } else {
        setDownloadTarget(null);
        showToast(msg);
      }
    },
    [downloadTarget, onDownloadPdf],
  );

  const hasNurseData = detail && (detail.nurseNotes.length > 0 || !!detail.triage);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.divider }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <AppText variant="h2" bold numberOfLines={1}>
                Visit Record
              </AppText>
              {detail ? (
                <AppText variant="labelLight" size={12} numberOfLines={1}>
                  {`${detail.doctorName ?? "Doctor"} · ${formatMonthDayYear(parseServerDate(detail.createdAt))}`}
                </AppText>
              ) : null}
            </View>
            <View style={styles.headerActions}>
              {detail && !isLoading && (
                <Pressable
                  onPress={handlePrintPress}
                  accessibilityRole="button"
                  accessibilityLabel="Print"
                  style={({ pressed }) => [styles.iconBtn, { backgroundColor: theme.neutralFill, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={styles.iconBtnText}>🖨️</Text>
                </Pressable>
              )}
              <Pressable
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <AppText size={22} style={{ color: "#999" }}>✕</AppText>
              </Pressable>
            </View>
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={styles.centre}>
              <ActivityIndicator size="large" color={palette.primary[500]} />
              <AppText variant="labelLight" size={13} style={{ marginTop: 12 }}>Loading record…</AppText>
            </View>
          ) : !detail ? (
            <View style={styles.centre}>
              <AppText size={36}>⚠️</AppText>
              <AppText variant="labelLight" size={14} style={{ marginTop: 10 }}>
                Unable to load this record.
              </AppText>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll}>
              {/* DOCTOR'S ENTRIES */}
              <SectionTitle icon="👨‍⚕️" title="Doctor's Entries" color={palette.primary[700]} />

              {detail.chiefComplaint ? (
                <EntryRow label="Chief Complaint" value={detail.chiefComplaint} />
              ) : null}
              {detail.diagnosisDescription ? (
                <EntryRow label="Diagnosis" value={detail.diagnosisDescription} />
              ) : null}
              {detail.diagnosisCode ? (
                <EntryRow label="Code (ICD)" value={detail.diagnosisCode} />
              ) : null}
              {detail.clinicalExamination ? (
                <EntryRow label="Clinical Examination" value={detail.clinicalExamination} />
              ) : null}
              {detail.examinationNotes ? (
                <EntryRow label="Examination Notes" value={detail.examinationNotes} />
              ) : null}
              {detail.plannedProcedures ? (
                <EntryRow label="Treatment Plan" value={detail.plannedProcedures} />
              ) : null}

              {detail.reviewOfSystems ? (
                <RosSection ros={detail.reviewOfSystems} />
              ) : null}

              {detail.medications.length > 0 ? (
                <MedicationsSection medications={detail.medications} />
              ) : null}

              {/* NURSE'S ENTRIES */}
              {hasNurseData ? (
                <>
                  <View style={styles.sectionGap} />
                  <SectionTitle icon="🩺" title="Nurse's Entries" color={palette.secondary[700]} />

                  {detail.triage ? <TriageSection triage={detail.triage} /> : null}

                  {detail.nurseNotes.map((note) => (
                    <Card key={note.nurseNoteId ?? note.createdAt} padding={14} radius={12} style={{ gap: 6 }}>
                      <View style={styles.noteHeader}>
                        <AppText bold size={13} color={palette.secondary[700]}>
                          {note.nurseName ?? "Nurse"}
                        </AppText>
                        <AppText variant="labelLight" size={11}>
                          {formatMonthDayYear(parseServerDate(note.createdAt))}
                        </AppText>
                      </View>
                      {/* Render HTML as stripped plain text — no WebView needed for typical note content. */}
                      <AppText variant="bodySmall" size={13}>
                        {note.contentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
                      </AppText>
                    </Card>
                  ))}
                </>
              ) : null}

              {/* LAB / RADIOLOGY RESULTS */}
              {detail.testResults.length > 0 ? (
                <>
                  <View style={styles.sectionGap} />
                  <SectionTitle icon="🔬" title="Lab & Radiology Results" color={palette.tertiary[700]} />
                  {detail.testResults.map((result) => (
                    <TestResultCard
                      key={result.testResultId ?? result.testName}
                      result={result}
                      onPreview={() => onPreviewPdf(result)}
                      onDownload={() => handleDownloadPress(result)}
                    />
                  ))}
                </>
              ) : null}

              <View style={{ height: 32 }} />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Print — section selection (step 1) */}
      <Modal
        visible={printStep === "selecting"}
        transparent
        animationType="fade"
        onRequestClose={resetPrint}
      >
        <View style={styles.sheetOverlay}>
          <Card padding={24} radius={20} style={styles.sheet}>
            <AppText bold size={17} style={{ marginBottom: 4 }}>Print Medical Record</AppText>
            <AppText variant="labelLight" size={13} style={{ marginBottom: 16 }}>
              Choose which sections to include:
            </AppText>

            <CheckboxRow
              label="Doctor's Entries"
              checked={includeDoctorEntries}
              onToggle={() => setIncludeDoctorEntries((v) => !v)}
            />
            <CheckboxRow
              label="Nurse's Entries"
              checked={includeNurseEntries}
              onToggle={() => setIncludeNurseEntries((v) => !v)}
            />

            {!includeDoctorEntries && !includeNurseEntries ? (
              <AppText size={12} style={{ color: palette.danger, marginTop: 6 }}>
                Select at least one section.
              </AppText>
            ) : null}

            <View style={styles.sheetButtons}>
              <AppButton title="Cancel" variant="secondary" onPress={resetPrint} style={{ flex: 1 }} />
              <AppButton
                title="Next"
                onPress={handlePrintSelectionNext}
                disabled={!includeDoctorEntries && !includeNurseEntries}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Print — password authentication (step 2) */}
      <PasswordPromptModal
        visible={printStep === "authenticating"}
        title="Authentication Required"
        subtitle="Enter your password to print this record."
        isVerifying={isPrinting}
        error={printAuthError}
        onConfirm={handlePrintPasswordConfirm}
        onCancel={resetPrint}
      />

      {/* PDF download — password authentication */}
      <PasswordPromptModal
        visible={!!downloadTarget}
        title="Download Medical File"
        subtitle="Enter your password to download this document."
        isVerifying={isDownloading}
        error={downloadAuthError}
        onConfirm={handleDownloadPasswordConfirm}
        onCancel={() => { setDownloadTarget(null); setDownloadAuthError(null); }}
      />
    </>
  );
}

// ---- Sub-components ----

function SectionTitle({ icon, title, color }: { icon: string; title: string; color: string }) {
  return (
    <View style={styles.sectionTitle}>
      <AppText size={18}>{icon}</AppText>
      <AppText bold size={15} color={color} style={{ flex: 1 }}>{title}</AppText>
      <View style={[styles.sectionLine, { backgroundColor: color + "40" }]} />
    </View>
  );
}

function EntryRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.entryRow, { borderLeftColor: palette.primary[300] }]}>
      <AppText variant="label" size={11} color={theme.body}>{label}</AppText>
      <AppText size={13} style={{ marginTop: 2 }}>{value}</AppText>
    </View>
  );
}

function RosSection({ ros }: { ros: EmrRos }) {
  const theme = useTheme();
  const systems: [string, string | null | undefined][] = [
    ["Constitutional", ros.constitutional],
    ["Eye/Ear/Nose/Throat", ros.eyeEarNoseMouthThroat],
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
  ].filter(([, v]) => v) as [string, string][];

  if (systems.length === 0) return null;

  return (
    <Card padding={12} radius={12} style={{ gap: 8 }}>
      <AppText bold size={13} color={palette.primary[700]}>Review of Systems</AppText>
      <Divider />
      {systems.map(([label, value]) => (
        <View key={label} style={styles.rosRow}>
          <AppText variant="label" size={12} style={{ minWidth: 130 }}>{label}:</AppText>
          <AppText size={13} style={{ flex: 1, color: theme.body }}>{value}</AppText>
        </View>
      ))}
    </Card>
  );
}

function MedicationsSection({ medications }: { medications: MyMedication[] }) {
  return (
    <Card padding={12} radius={12} style={{ gap: 8 }}>
      <AppText bold size={13} color={palette.primary[700]}>Medications Prescribed</AppText>
      <Divider />
      {medications.map((m, i) => (
        <View key={m.medicationId ?? i} style={styles.medicationRow}>
          <AppText size={14}>💊</AppText>
          <View style={{ flex: 1 }}>
            <AppText bold size={13}>
              {m.dosage ? `${m.drugName} ${m.dosage}` : m.drugName}
            </AppText>
            <AppText variant="labelLight" size={11}>
              {[m.frequency, m.route ? `Route: ${m.route}` : null].filter(Boolean).join(" · ")}
            </AppText>
          </View>
          <View style={[styles.statusChip, { backgroundColor: m.status === "Active" ? palette.secondary[100] : palette.neutral[100] }]}>
            <AppText bold size={10} color={m.status === "Active" ? palette.secondary[700] : palette.neutral[500]}>
              {m.status}
            </AppText>
          </View>
        </View>
      ))}
    </Card>
  );
}

function TriageSection({ triage }: { triage: NonNullable<EmrEncounterDetail["triage"]> }) {
  const vitals: [string, string][] = [];
  if (triage.bPSystolic && triage.bPDiastolic)
    vitals.push(["Blood Pressure", `${triage.bPSystolic}/${triage.bPDiastolic} mmHg`]);
  if (triage.heartRate) vitals.push(["Heart Rate", `${triage.heartRate} bpm`]);
  if (triage.temperature) vitals.push(["Temperature", `${triage.temperature}°C${triage.tempSite ? ` (${triage.tempSite})` : ""}`]);
  if (triage.respiratory) vitals.push(["Respiratory Rate", `${triage.respiratory}/min`]);
  if (triage.oxygenSaturation) vitals.push(["O₂ Saturation", `${triage.oxygenSaturation}%`]);
  if (triage.heightCm) vitals.push(["Height", `${triage.heightCm} cm`]);
  if (triage.weightKg) vitals.push(["Weight", `${triage.weightKg} kg`]);
  if (triage.bmi) vitals.push(["BMI", `${triage.bmi.toFixed(1)}`]);
  if (triage.bloodSugar) vitals.push(["Blood Sugar", `${triage.bloodSugar} mmol/L`]);

  if (!triage.chiefComplaint && vitals.length === 0) return null;

  return (
    <Card padding={12} radius={12} style={{ gap: 8 }}>
      <View style={styles.triageHeader}>
        <AppText bold size={13} color={palette.secondary[700]}>
          {`Triage — ${triage.nurseName ?? "Nurse"}`}
        </AppText>
        {triage.priorityLevel ? (
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor(triage.priorityLevel) + "20" }]}>
            <AppText bold size={10} color={priorityColor(triage.priorityLevel)}>
              {priorityLabel(triage.priorityLevel)}
            </AppText>
          </View>
        ) : null}
      </View>
      {triage.chiefComplaint ? <AppText size={13}>Chief complaint: {triage.chiefComplaint}</AppText> : null}
      {vitals.length > 0 ? (
        <>
          <Divider />
          <View style={styles.vitalsGrid}>
            {vitals.map(([label, value]) => (
              <View key={label} style={styles.vitalCell}>
                <AppText variant="labelLight" size={10}>{label}</AppText>
                <AppText bold size={13} color={palette.primary[700]}>{value}</AppText>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Card>
  );
}

function TestResultCard({
  result,
  onPreview,
  onDownload,
}: {
  result: MyTestResult;
  onPreview: () => void;
  onDownload: () => void;
}) {
  const theme = useTheme();
  return (
    <Card padding={14} radius={12} style={{ gap: 8 }}>
      <View style={styles.testResultHeader}>
        <AppText bold size={13} style={{ flex: 1 }}>
          {result.testName}
        </AppText>
        <View style={[styles.statusChip, { backgroundColor: palette.secondary[100] }]}>
          <AppText bold size={10} color={palette.secondary[700]}>{result.status}</AppText>
        </View>
      </View>
      <View style={styles.testResultMeta}>
        <AppText variant="labelLight" size={11}>{`${result.category} · ${result.doctorName ?? "—"}`}</AppText>
      </View>
      {result.hasResultFile ? (
        <View style={styles.testResultActions}>
          <Pressable
            onPress={onPreview}
            accessibilityRole="button"
            style={({ pressed }) => [styles.pdfBtn, { backgroundColor: palette.primary[100], opacity: pressed ? 0.7 : 1 }]}
          >
            <AppText size={14}>📄</AppText>
            <AppText bold size={12} color={palette.primary[700]}>Preview</AppText>
          </Pressable>
          <Pressable
            onPress={onDownload}
            accessibilityRole="button"
            style={({ pressed }) => [styles.pdfBtn, { backgroundColor: palette.secondary[100], opacity: pressed ? 0.7 : 1 }]}
          >
            <AppText size={14}>⬇️</AppText>
            <AppText bold size={12} color={palette.secondary[700]}>Download</AppText>
          </Pressable>
        </View>
      ) : (
        <AppText variant="labelLight" size={12}>No file available yet.</AppText>
      )}
    </Card>
  );
}

function CheckboxRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={({ pressed }) => [styles.checkboxRow, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.checkbox, { borderColor: palette.primary[500], backgroundColor: checked ? palette.primary[500] : "transparent" }]}>
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <AppText size={14} style={{ flex: 1 }}>{label}</AppText>
    </Pressable>
  );
}

function priorityColor(level: number): string {
  if (level === 1) return palette.danger;
  if (level === 2) return palette.tertiary[500];
  if (level === 3) return palette.warning;
  return palette.secondary[500];
}

function priorityLabel(level: number): string {
  const labels = ["", "Resuscitation", "Emergent", "Urgent", "Semi-Urgent", "Non-Urgent"];
  return labels[level] ?? `Priority ${level}`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  iconBtnText: { fontSize: 18 },
  closeBtn: { padding: 4, marginTop: 2 },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  scroll: { padding: 16, gap: 12 },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionLine: { flex: 1, height: 1 },
  sectionGap: { height: 8 },
  entryRow: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 6,
  },
  rosRow: { flexDirection: "row", gap: 6 },
  medicationRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  statusChip: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  triageHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  priorityBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  vitalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  vitalCell: { minWidth: "44%", gap: 2 },
  noteHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  testResultHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  testResultMeta: { flexDirection: "row" },
  testResultActions: { flexDirection: "row", gap: 10 },
  pdfBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    padding: 16,
    paddingBottom: 32,
  },
  sheet: {},
  sheetButtons: { flexDirection: "row", gap: 12, marginTop: 16 },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkmark: { color: "#FFFFFF", fontFamily: fonts.publicSansBold, fontSize: 13 },
});
