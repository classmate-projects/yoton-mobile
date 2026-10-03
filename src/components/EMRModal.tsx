import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Divider } from "@/components/layout";
import { palette } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/typography";
import { formatMonthDayYear, toApiDate } from "@/utils/date";
import type { EmrTileItem } from "@/viewmodels/useEmr";

interface EMRModalProps {
  visible: boolean;
  fromDate: Date;
  toDate: Date;
  tiles: EmrTileItem[];
  isBusy: boolean;
  onApplyDates: (from: Date, to: Date) => void;
  onSelectTile: (encounterId: string) => void;
  onClose: () => void;
}

// The main EMR popup: date-filter row at the top-right, then a 2-column tile grid of visits.
export function EMRModal({ visible, fromDate, toDate, tiles, isBusy, onApplyDates, onSelectTile, onClose }: EMRModalProps) {
  const theme = useTheme();
  const [localFrom, setLocalFrom] = useState(fromDate);
  const [localTo, setLocalTo] = useState(toDate);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Sync local date state when the parent resets the defaults.
  useEffect(() => {
    setLocalFrom(fromDate);
    setLocalTo(toDate);
  }, [fromDate, toDate]);

  function handleFromChange(_event: DateTimePickerEvent, date?: Date) {
    setShowFromPicker(false);
    if (!date) return;
    const next = date > localTo ? localTo : date;
    setLocalFrom(next);
    onApplyDates(next, localTo);
  }

  function handleToChange(_event: DateTimePickerEvent, date?: Date) {
    setShowToPicker(false);
    if (!date) return;
    const next = date < localFrom ? localFrom : date;
    setLocalTo(next);
    onApplyDates(localFrom, next);
  }

  // On Android the inline DateTimePicker causes layout jitter; use the imperative dialog instead.
  function openFromPickerAndroid() {
    DateTimePickerAndroid.open({
      value: localFrom,
      mode: "date",
      maximumDate: localTo,
      onChange: handleFromChange,
    });
  }

  function openToPickerAndroid() {
    DateTimePickerAndroid.open({
      value: localTo,
      mode: "date",
      minimumDate: localFrom,
      onChange: handleToChange,
    });
  }

  return (
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
          <View>
            <AppText variant="h2" bold>Electronic Medical Record</AppText>
            <AppText variant="labelLight" size={12}>Your visit history</AppText>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <AppText size={22} style={styles.closeIcon}>✕</AppText>
          </Pressable>
        </View>

        {/* Date filter row (top-right aligned) */}
        <View style={[styles.filterRow, { backgroundColor: theme.card, borderColor: theme.cardStroke }]}>
          <AppText variant="label" size={12} style={{ flex: 0 }}>Filter: </AppText>
          <View style={styles.filterRight}>
            <DateChip
              label="From"
              date={localFrom}
              onPress={Platform.OS === "android" ? openFromPickerAndroid : () => setShowFromPicker(true)}
            />
            <AppText size={12} style={{ color: theme.body }}>→</AppText>
            <DateChip
              label="To"
              date={localTo}
              onPress={Platform.OS === "android" ? openToPickerAndroid : () => setShowToPicker(true)}
            />
          </View>
        </View>

        {/* iOS inline pickers only — Android uses the imperative dialog above. */}
        {Platform.OS === "ios" && showFromPicker && (
          <DateTimePicker
            value={localFrom}
            mode="date"
            display="inline"
            maximumDate={localTo}
            onChange={handleFromChange}
          />
        )}
        {Platform.OS === "ios" && showToPicker && (
          <DateTimePicker
            value={localTo}
            mode="date"
            display="inline"
            minimumDate={localFrom}
            onChange={handleToChange}
          />
        )}

        <Divider style={{ marginHorizontal: 16 }} />

        {/* Tile grid */}
        {isBusy ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={palette.primary[500]} />
            <AppText variant="labelLight" size={13} style={{ marginTop: 12 }}>Loading records…</AppText>
          </View>
        ) : tiles.length === 0 ? (
          <View style={styles.centre}>
            <AppText size={36}>🗂️</AppText>
            <AppText variant="labelLight" size={14} style={{ marginTop: 10, textAlign: "center" }}>
              No visits found in the selected date range.
            </AppText>
          </View>
        ) : (
          <FlatList
            data={tiles}
            keyExtractor={(item) => item.encounterId}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item }) => (
              <VisitTile tile={item} onPress={() => onSelectTile(item.encounterId)} />
            )}
          />
        )}
      </View>
    </Modal>
  );
}

function DateChip({ label, date, onPress }: { label: string; date: Date; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.dateChip,
        { backgroundColor: theme.neutralFill, borderColor: theme.cardStroke, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <AppText size={11} style={{ color: theme.body, fontFamily: fonts.publicSansBold }}>
        {label}
      </AppText>
      <AppText size={12} bold style={{ color: palette.primary[700] }}>
        {formatMonthDayYear(date)}
      </AppText>
    </Pressable>
  );
}

function VisitTile({ tile, onPress }: { tile: EmrTileItem; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.tileWrap, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Card padding={14} radius={14} style={[styles.tile, { borderColor: theme.cardStroke }]}>
        {/* Doctor icon + name */}
        <View style={styles.tileHeader}>
          <AppText size={22}>👨‍⚕️</AppText>
          <AppText bold size={13} numberOfLines={2} style={[styles.tileDoctorName, { color: palette.primary[700] }]}>
            {tile.doctorName}
          </AppText>
        </View>
        <View style={[styles.tileDivider, { backgroundColor: theme.divider }]} />
        {/* Visit date */}
        <View style={styles.tileRow}>
          <AppText size={12}>📅</AppText>
          <AppText variant="labelLight" size={11} numberOfLines={1} style={{ flex: 1 }}>
            {tile.visitDate}
          </AppText>
        </View>
        {/* Chief complaint */}
        <View style={styles.tileRow}>
          <AppText size={12}>🩺</AppText>
          <AppText variant="label" size={12} numberOfLines={2} style={{ flex: 1 }}>
            {tile.chiefComplaint}
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
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
  closeBtn: { padding: 4, marginTop: 2 },
  closeIcon: { color: "#999" },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateChip: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  grid: { padding: 16, gap: 12 },
  gridRow: { gap: 12 },
  tileWrap: { flex: 1 },
  tile: { borderWidth: 1, gap: 8 },
  tileHeader: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  tileDoctorName: { flex: 1 },
  tileDivider: { height: 1 },
  tileRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
});
