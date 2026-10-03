import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { EMRDetailModal } from "@/components/EMRDetailModal";
import { EMRModal } from "@/components/EMRModal";
import { Divider, ScreenScroll } from "@/components/layout";
import { GlassBusyOverlay } from "@/components/GlassBusyOverlay";
import { useOnFocus } from "@/hooks/useFocus";
import { palette } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { useEmr } from "@/viewmodels/useEmr";
import { useRecords } from "@/viewmodels/useRecords";

// Medical history: active prescriptions, lab & radiology results, bills (view-only).
// (Port of the MAUI RecordsPage.)
export default function RecordsScreen() {
  const theme = useTheme();
  const { isBusy, activePrescriptions, labResults, bills, initialize, viewReport } = useRecords();
  const emr = useEmr();
  const [isEmrOpen, setIsEmrOpen] = useState(false);

  useOnFocus(() => void initialize());

  const handleOpenEmr = useCallback(() => {
    setIsEmrOpen(true);
    void emr.loadConsultations(emr.fromDate, emr.toDate);
  }, [emr]);

  const handlePrintWithAuth = useCallback(
    async (detail: Parameters<typeof emr.printEncounter>[0], includeDoctorEntries: boolean, includeNurseEntries: boolean, password: string) => {
      await emr.printEncounter(detail, includeDoctorEntries, includeNurseEntries, password);
    },
    [emr],
  );

  return (
    <View style={styles.fill}>
      <ScreenScroll topInset>
        <View style={styles.pageHeader}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="h2" bold>
              Medical History
            </AppText>
            <AppText variant="labelLight">
              Access your laboratory reports, diagnostic evaluations, and active medications.
            </AppText>
          </View>
          <Pressable
            onPress={handleOpenEmr}
            accessibilityRole="button"
            accessibilityLabel="Open Electronic Medical Record"
            style={({ pressed }) => [styles.emrBtn, { backgroundColor: palette.primary[100], opacity: pressed ? 0.7 : 1 }]}
          >
            <AppText size={18}>📋</AppText>
            <AppText bold size={11} color={palette.primary[700]}>EMR</AppText>
          </Pressable>
        </View>

        {/* PRESCRIPTIONS */}
        <SectionHeader title="Active Prescriptions (Rx)" icon="💊" topMargin={10} />
        <View style={{ gap: 12 }}>
          {activePrescriptions.map((rx, index) => (
            <Card key={`${rx.drugName}-${index}`} padding={15} style={{ gap: 6 }}>
              <View style={styles.spread}>
                <AppText bold size={16} color={palette.primary[700]} style={{ flex: 1 }}>
                  {rx.drugName}
                </AppText>
                <AppText bold size={12} color={palette.secondary[500]}>
                  {rx.refillsLeft}
                </AppText>
              </View>
              <IconLine icon="⚖️" text={`Dosage: ${rx.dosage}`} topMargin={2} />
              <IconLine icon="🔁" text={rx.frequency} />
              <IconLine icon="📋" text={rx.instructions} size={12} alignTop />
              <Divider style={{ marginVertical: 5 }} />
              <View style={styles.spread}>
                <AppText variant="labelLight" size={11} style={{ flex: 1 }}>
                  {`Prescribed by: ${rx.doctorName}`}
                </AppText>
                {/* Inert in the MAUI app too - there's no refill-request endpoint yet. */}
                <AppButton title="Refill Rx" fontSize={11} height={26} backgroundColor={palette.secondary[500]} textColor="#FFFFFF" style={{ paddingVertical: 0, paddingHorizontal: 10 }} />
              </View>
            </Card>
          ))}
        </View>

        {/* LAB RESULTS */}
        <SectionHeader title="Laboratory Results" icon="🔬" topMargin={15} />
        <View style={{ gap: 12 }}>
          {labResults.map((lab, index) => (
            <Card key={`${lab.testName}-${index}`} padding={15} style={{ gap: 8 }}>
              <View style={styles.spread}>
                <AppText bold size={15} style={{ flex: 1 }}>
                  {lab.testName}
                </AppText>
                <StatusChip text={lab.status} />
              </View>
              <View style={styles.spread}>
                <AppText variant="labelLight" size={12} style={{ flex: 1 }}>
                  {`Checked: ${lab.date}`}
                </AppText>
                <AppText variant="labelLight" size={12} style={{ flex: 1, textAlign: "right" }}>
                  {`Physician: ${lab.doctorName}`}
                </AppText>
              </View>
              <Divider style={{ marginVertical: 5 }} />
              <AppText variant="bodySmall" size={13} color={palette.neutral[700]}>
                {lab.resultSummary}
              </AppText>
              {lab.hasResultFile && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void viewReport(lab)}
                  style={[styles.reportButton, { backgroundColor: theme.neutralFill }]}
                >
                  <AppText bold size={12} color={theme.isDark ? palette.neutral[100] : palette.neutral[900]}>
                    View Detailed Report
                  </AppText>
                </Pressable>
              )}
            </Card>
          ))}
        </View>

        {/* BILLS - view-only, no payment initiation here */}
        <SectionHeader title="Bills" icon="🧾" topMargin={15} />
        {bills.length === 0 ? (
          <AppText variant="labelLight" style={{ marginVertical: 5 }}>
            No bills yet.
          </AppText>
        ) : (
          <View style={{ gap: 12 }}>
            {bills.map((bill, index) => (
              <Card key={bill.billId || index} padding={15} style={{ gap: 6 }}>
                <View style={styles.spread}>
                  <AppText bold size={16} color={palette.primary[700]}>
                    {bill.netAmountLabel}
                  </AppText>
                  <StatusChip text={bill.status} />
                </View>
                <AppText variant="label" size={12} numberOfLines={1}>
                  {bill.summaryLine}
                </AppText>
                <Divider style={{ marginVertical: 5 }} />
                <AppText variant="labelLight" size={11}>
                  {bill.dateLabel}
                </AppText>
              </Card>
            ))}
          </View>
        )}
      </ScreenScroll>

      <GlassBusyOverlay isRunning={isBusy} message="Loading your records" />

      <EMRModal
        visible={isEmrOpen}
        fromDate={emr.fromDate}
        toDate={emr.toDate}
        tiles={emr.tiles}
        isBusy={emr.isBusy}
        onApplyDates={emr.applyDateRange}
        onSelectTile={emr.openDetail}
        onClose={() => setIsEmrOpen(false)}
      />

      <EMRDetailModal
        visible={emr.isDetailOpen}
        detail={emr.selectedDetail}
        isLoading={emr.isLoadingDetail}
        onPreviewPdf={emr.previewPdf}
        onDownloadPdf={emr.downloadPdf}
        onPrint={handlePrintWithAuth}
        onClose={emr.closeDetail}
      />
    </View>
  );
}

function SectionHeader({ title, icon, topMargin }: { title: string; icon: string; topMargin: number }) {
  return (
    <View style={[styles.spread, { marginTop: topMargin }]}>
      <AppText variant="h3" bold>
        {title}
      </AppText>
      <AppText size={18}>{icon}</AppText>
    </View>
  );
}

function IconLine({
  icon,
  text,
  size,
  topMargin,
  alignTop,
}: {
  icon: string;
  text: string;
  size?: number;
  topMargin?: number;
  alignTop?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: alignTop ? "flex-start" : "center", gap: 5, marginTop: topMargin }}>
      <AppText size={14}>{icon}</AppText>
      <AppText variant="label" size={size} style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

function StatusChip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <AppText bold size={11} color={palette.secondary[700]}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  spread: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  pageHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  emrBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
    marginTop: 2,
  },
  chip: { backgroundColor: palette.secondary[100], borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  reportButton: {
    alignSelf: "flex-start",
    height: 32,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
