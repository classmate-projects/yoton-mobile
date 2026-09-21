import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, ActivityIndicator, useWindowDimensions } from "react-native";

import type { DoctorCard, PatientSlot } from "@/api/types";
import { AppButton } from "@/components/AppButton";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { KeyboardAvoid } from "@/components/KeyboardAvoid";
import { Divider, ScreenScroll } from "@/components/layout";
import { useFocusPolling, useOnFocus } from "@/hooks/useFocus";
import { palette } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/typography";
import { formatMonthDayYear, formatTime, parseServerDate, today } from "@/utils/date";
import type { AppointmentItem } from "@/viewmodels/appointmentFormat";
import { useAppointments } from "@/viewmodels/useAppointments";

const SLOT_GAP = 8;

function statusColor(status: string, fallback: string): string {
  switch (status) {
    case "Pending":
      return palette.warning;
    case "Completed":
      return palette.success;
    case "Cancelled":
      return palette.neutral[500];
    default:
      return fallback;
  }
}

// Upcoming/past visits plus the inline "request an appointment" panel.
// (Port of the MAUI AppointmentsPage.)
export default function AppointmentsScreen() {
  const theme = useTheme();
  const a = useAppointments();

  useOnFocus(() => void a.initialize());
  // Catches a front-office confirmation (Pending -> Scheduled) while the patient is sitting here.
  useFocusPolling(() => void a.refreshSilently(), 60_000);

  return (
    <KeyboardAvoid style={{ backgroundColor: theme.pageBg }}>
      <ScreenScroll topInset>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="h2" bold>
              Your Appointments
            </AppText>
            <AppText variant="labelLight">Manage and track your doctor appointments and clinical consultations.</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Schedule a new appointment"
            onPress={() => void a.toggleBookingPanel()}
            style={styles.plus}
          >
            <AppText bold size={24} color="#FFFFFF">
              +
            </AppText>
          </Pressable>
        </View>

        {a.isBookingPanelOpen && <BookingPanel a={a} />}

        {/* UPCOMING */}
        <AppText variant="h3" bold style={{ marginTop: 10 }}>
          Upcoming Visits
        </AppText>

        {/* Gated on isBusy so the empty message can't flash before the first load returns data. */}
        {a.isBusy ? (
          <ActivityIndicator style={{ marginVertical: 10 }} color={palette.primary[500]} />
        ) : a.upcomingAppointments.length === 0 ? (
          <EmptyNote text="No upcoming appointments." />
        ) : (
          <View style={{ gap: 12 }}>
            {a.upcomingAppointments.map((item, index) => (
              <Card key={item.appointmentId ?? index} padding={15} style={{ gap: 8 }}>
                <View style={styles.spread}>
                  <AppText bold size={16} style={{ flex: 1 }}>
                    {item.doctorName}
                  </AppText>
                  <AppText bold size={12} color={statusColor(item.status, palette.primary[500])}>
                    {item.status}
                  </AppText>
                </View>
                <AppText variant="labelLight" size={13} style={{ marginTop: -5 }}>
                  {item.specialty}
                </AppText>
                <Divider style={{ marginVertical: 5 }} />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={[styles.iconLine, { flex: 1 }]}>
                    <AppText size={14}>📅</AppText>
                    <AppText size={13}>{item.date}</AppText>
                  </View>
                  <View style={[styles.iconLine, { flex: 1 }]}>
                    <AppText size={14}>⏰</AppText>
                    <AppText size={13}>{item.time}</AppText>
                  </View>
                </View>
                <View style={[styles.iconLine, { marginTop: 5 }]}>
                  <AppText size={14}>📍</AppText>
                  <AppText variant="labelLight" size={12}>
                    {item.location}
                  </AppText>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* PAST */}
        <AppText variant="h3" bold style={{ marginTop: 15 }}>
          Past Visits
        </AppText>
        {!a.isBusy &&
          (a.pastAppointments.length === 0 ? (
            <EmptyNote text="No past visits yet." />
          ) : (
            <View style={{ gap: 10 }}>
              {a.pastAppointments.map((item, index) => (
                <PastVisit key={item.appointmentId ?? index} item={item} onNotes={() => void a.showConsultationNotes(item)} />
              ))}
            </View>
          ))}
      </ScreenScroll>

      {/* BOOK APPOINTMENT ACTION */}
      <View style={[styles.actionBar, { backgroundColor: theme.card }]}>
        <AppButton title={a.isBookingPanelOpen ? "Close" : "Schedule New Consultation"} onPress={() => void a.toggleBookingPanel()} />
      </View>
    </KeyboardAvoid>
  );
}

type Appointments = ReturnType<typeof useAppointments>;

function BookingPanel({ a }: { a: Appointments }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  // Panel = page padding (20*2) + panel padding (15*2); the doctor carousel peeks 16 either side.
  const doctorItemWidth = width - 40 - 30 - 32;

  const inputStyle = {
    color: theme.isDark ? "#FFFFFF" : palette.neutral[900],
    fontFamily: fonts.notoSansRegular,
    fontSize: 14,
  };

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) a.changeBookingDate(date);
  };

  const openAndroidDatePicker = () =>
    DateTimePickerAndroid.open({
      value: a.selectedBookingDate,
      mode: "date",
      minimumDate: today(),
      onChange: onDateChange,
    });

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: theme.isDark ? "#111930" : "#F0F5FF", borderColor: palette.primary[100] },
      ]}
    >
      <AppText variant="h3" bold>
        Request an appointment
      </AppText>
      <AppText variant="labelLight" size={12}>
        Pick up to 3 preferred doctors, then choose a date and time. The clinic will confirm your request.
      </AppText>

      {/* Specialization / department chips */}
      <AppText variant="labelLight" size={12}>
        Department
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        {a.specializationNames.map((name) => {
          const selected = name === a.selectedSpecializationName;
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => a.setSelectedSpecializationName(name)}
              style={[
                styles.chip,
                {
                  borderColor: selected ? palette.primary[500] : palette.primary[100],
                  backgroundColor: selected ? palette.primary[100] : "transparent",
                },
              ]}
            >
              <AppText bold size={12} color={selected ? palette.primary[900] : undefined}>
                {name}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {a.isLoadingDoctors && <ActivityIndicator color={palette.primary[500]} />}

      {/* Doctor carousel with basic info */}
      <AppText variant="labelLight" size={12}>
        Doctors
      </AppText>
      {a.doctorCards.length === 0 ? (
        <AppText variant="labelLight" size={12}>
          No doctors available in this department yet.
        </AppText>
      ) : (
        <FlatList<DoctorCard>
          horizontal
          data={a.doctorCards}
          keyExtractor={(d, index) => d.doctorId ?? String(index)}
          showsHorizontalScrollIndicator={false}
          snapToInterval={doctorItemWidth}
          decelerationRate="fast"
          disableIntervalMomentum
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0 }}
          renderItem={({ item }) => {
            const preferred = a.preferredDoctors.some((d) => d.doctorId === item.doctorId);
            return (
              <View style={{ width: doctorItemWidth, paddingRight: 10 }}>
                <Card padding={14} style={{ gap: 4, minHeight: 150 }}>
                  <AppText bold size={15} numberOfLines={1}>
                    {item.name}
                  </AppText>
                  <AppText variant="labelLight" size={12} numberOfLines={1}>
                    {item.specializationName ?? ""}
                  </AppText>
                  <AppText size={12}>{`${item.experienceYears} years experience`}</AppText>
                  <AppButton
                    title={preferred ? "Preferred ✓ (tap to remove)" : "Prefer this doctor"}
                    variant={preferred ? "secondary" : "primary"}
                    fontSize={11}
                    height={34}
                    style={{ marginTop: 6, paddingVertical: 0 }}
                    onPress={() => void a.togglePreferredDoctor(item)}
                  />
                </Card>
              </View>
            );
          }}
        />
      )}

      {/* Ranked preferences */}
      <AppText variant="labelLight" size={12}>
        Your preferences (tap to remove, max 3)
      </AppText>
      {a.preferredDoctors.length === 0 ? (
        <AppText variant="labelLight" size={12}>
          No preferences selected yet.
        </AppText>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {a.preferredDoctors.map((doctor, index) => (
            <Pressable
              key={doctor.doctorId ?? index}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${doctor.name}`}
              onPress={() => void a.togglePreferredDoctor(doctor)}
              style={styles.preference}
            >
              <AppText bold size={12} color={palette.primary[900]}>
                {doctor.name}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}

      {/* Date */}
      <AppText variant="labelLight" size={12}>
        Date
      </AppText>
      {Platform.OS === "android" ? (
        <Pressable accessibilityRole="button" onPress={openAndroidDatePicker} style={[styles.dateField, { borderColor: theme.divider }]}>
          <AppText size={14}>{formatMonthDayYear(a.selectedBookingDate)}</AppText>
        </Pressable>
      ) : (
        <View style={{ alignItems: "flex-start" }}>
          <DateTimePicker value={a.selectedBookingDate} mode="date" display="compact" minimumDate={today()} onChange={onDateChange} />
        </View>
      )}

      {a.isLoadingSlots && <ActivityIndicator color={palette.primary[500]} />}

      {/* Available slots (shared-slot aware) */}
      <AppText variant="labelLight" size={12}>
        Available slots
      </AppText>
      {a.availableSlots.length === 0 ? (
        <AppText variant="labelLight" size={12}>
          No slots to show yet — pick a preferred doctor and date.
        </AppText>
      ) : (
        <View style={styles.slotGrid}>
          {a.availableSlots.map((slot) => (
            <SlotCell
              key={slot.start}
              slot={slot}
              selected={a.selectedSlot?.start === slot.start}
              onPress={() => a.selectSlot(slot)}
            />
          ))}
        </View>
      )}

      {/* Notes */}
      <AppText variant="labelLight" size={12}>
        Notes (optional)
      </AppText>
      {/* The border lives on a wrapper: putting it on the TextInput itself lets Android's default
          EditText underline show through inside the box. */}
      <View style={[styles.notes, { borderColor: theme.divider }]}>
        <TextInput
          underlineColorAndroid="transparent"
          value={a.bookingNotes}
          onChangeText={a.setBookingNotes}
          placeholder="Reason for visit"
          placeholderTextColor={theme.placeholder}
          multiline
          textAlignVertical="top"
          style={[inputStyle, { minHeight: 50, padding: 0 }]}
        />
      </View>

      <View style={styles.submitRow}>
        <AppButton
          title="Send Request"
          disabled={a.isBookingSubmitting}
          onPress={() => void a.submitBookingRequest()}
          style={{ flex: 1 }}
        />
        {a.isBookingSubmitting && <ActivityIndicator color={palette.primary[500]} style={{ marginLeft: 10 }} />}
      </View>
    </View>
  );
}

function SlotCell({ slot, selected, onPress }: { slot: PatientSlot; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !slot.isAvailable }}
      onPress={onPress}
      style={[
        styles.slot,
        {
          backgroundColor: selected ? palette.primary[100] : !slot.isAvailable ? theme.neutralFill : "transparent",
          borderColor: selected ? palette.primary[500] : palette.neutral[100],
          opacity: slot.isPast ? 0.4 : 1,
        },
      ]}
    >
      <AppText bold size={12} center color={selected ? palette.primary[900] : undefined}>
        {formatTime(parseServerDate(slot.start))}
      </AppText>
      <AppText variant="labelLight" size={9} center>
        {`${slot.bookedCount}/${slot.maxCapacity} booked`}
      </AppText>
    </Pressable>
  );
}

function PastVisit({ item, onNotes }: { item: AppointmentItem; onNotes: () => void }) {
  const theme = useTheme();
  return (
    <Card padding={15} style={styles.pastRow}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.spread}>
          <AppText bold size={15} style={{ flex: 1 }}>
            {item.doctorName}
          </AppText>
          <AppText bold size={11} color={item.status === "Completed" ? palette.success : palette.neutral[500]}>
            {item.status}
          </AppText>
        </View>
        <AppText variant="labelLight" size={12}>
          {item.specialty}
        </AppText>
        <View style={{ flexDirection: "row", gap: 15, marginTop: 5, flexWrap: "wrap" }}>
          <AppText variant="labelLight" size={12}>
            {item.date}
          </AppText>
          <AppText variant="labelLight" size={12}>
            {item.location}
          </AppText>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={onNotes} style={[styles.notesButton, { backgroundColor: theme.neutralFill }]}>
        <AppText bold size={11} color={theme.isDark ? palette.neutral[100] : palette.neutral[900]}>
          Notes
        </AppText>
      </Pressable>
    </Card>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <View style={{ padding: 20, alignItems: "center" }}>
      <AppText variant="labelLight" center>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  plus: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: palette.primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  spread: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  iconLine: { flexDirection: "row", alignItems: "center", gap: 5 },
  panel: { borderWidth: 1, borderRadius: 14, padding: 15, gap: 14 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  preference: {
    borderWidth: 1,
    borderColor: palette.primary[500],
    backgroundColor: palette.primary[100],
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dateField: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: SLOT_GAP },
  slot: {
    // Three columns: 31% each leaves room for the two 8pt gaps even on narrow phones.
    width: "31%",
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    gap: 2,
  },
  notes: { minHeight: 70, borderWidth: 1, borderRadius: 8, padding: 10 },
  submitRow: { flexDirection: "row", alignItems: "center" },
  pastRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  notesButton: { height: 30, paddingHorizontal: 10, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  actionBar: { padding: 15, borderTopWidth: 1, borderTopColor: "#E0E0E0" },
});
