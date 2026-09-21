import { router } from "expo-router";
import { useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Divider, ScreenScroll } from "@/components/layout";
import { GlassBusyOverlay } from "@/components/GlassBusyOverlay";
import { useAlert } from "@/components/GlassDialogs";
import { useExitOnDoubleBack, useFocusPolling, useOnFocus } from "@/hooks/useFocus";
import { prefs, PrefKeys } from "@/services/storage";
import { palette } from "@/theme/colors";
import { shadow } from "@/theme/shadow";
import { useTheme } from "@/theme/ThemeProvider";
import { useHome } from "@/viewmodels/useHome";
import type { AppointmentItem } from "@/viewmodels/appointmentFormat";

const PAGE_PADDING = 20;
const PEEK = 24;

// The dashboard: greeting, upcoming-appointment carousel, active medications and quick services.
// (Port of the MAUI HomePage.)
export default function HomeScreen() {
  const theme = useTheme();
  const { showSecurityConfirmed } = useAlert();
  const { isBusy, patientName, upcomingAppointments, todayTasks, initialize, refreshSilently } = useHome();
  const { width } = useWindowDimensions();

  const [page, setPage] = useState(0);
  const carouselRef = useRef<FlatList<AppointmentItem>>(null);

  useExitOnDoubleBack();

  useOnFocus(() => {
    void (async () => {
      await initialize();

      // Set by the login flow the moment it detects the patient came back with a real password
      // after agreeing to change their default one - shown exactly once, here, since this is the
      // first fully-loaded screen reachable after that login.
      if (await prefs.getBool(PrefKeys.showSecurityConfirmed, false)) {
        await prefs.remove(PrefKeys.showSecurityConfirmed);
        await showSecurityConfirmed();
      }
    })();
  });

  // Catches a front-office confirmation (Pending -> Scheduled) while the patient is sitting on the
  // dashboard, without a real push notification.
  useFocusPolling(() => void refreshSilently(), 60_000);

  // CarouselView PeekAreaInsets="24": each page is the content width minus a peek on both sides.
  const itemWidth = width - PAGE_PADDING * 2 - PEEK * 2;
  // Each item carries 12pt of right margin; padding the list by half the leftover width centres the
  // card itself, with an equal peek of its neighbours either side.
  const sidePadding = (width - (itemWidth - 12)) / 2;

  return (
    <View style={styles.fill}>
      <ScreenScroll topInset>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="labelLight" size={15}>
              Welcome back,
            </AppText>
            <AppText variant="h2" bold>
              {patientName}
            </AppText>
            <AppText variant="labelLight" size={13}>
              Here is your health status today.
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile and navigation menu"
            hitSlop={8}
            // Settings/Support/Patient Perspective live behind the "More" tab.
            onPress={() => router.navigate("/more")}
            style={{ paddingHorizontal: 10, paddingVertical: 4 }}
          >
            <AppText size={25} color={palette.primary[700]}>
              ☰
            </AppText>
          </Pressable>
        </View>

        {/* UPCOMING APPOINTMENTS CAROUSEL */}
        <AppText bold size={12} color={palette.primary[700]} style={{ letterSpacing: 1 }}>
          UPCOMING APPOINTMENTS
        </AppText>

        {upcomingAppointments.length === 0 ? (
          <Card radius={16} padding={20} style={[styles.carouselBox, { justifyContent: "center", alignItems: "center", gap: 8 }]}>
            <AppText size={32} center>
              📅
            </AppText>
            <AppText bold size={15} center>
              No upcoming appointments
            </AppText>
            <AppText variant="labelLight" size={13} center>
              Tap Book Appointment below to schedule one.
            </AppText>
          </Card>
        ) : (
          <>
            <FlatList
              ref={carouselRef}
              horizontal
              data={upcomingAppointments}
              keyExtractor={(item, index) => item.appointmentId ?? String(index)}
              showsHorizontalScrollIndicator={false}
              snapToInterval={itemWidth}
              decelerationRate="fast"
              disableIntervalMomentum
              // The FlatList lives inside a padded ScrollView, so pull it back out to full width and
              // re-pad its content: the neighbours then peek in on both sides.
              style={{ marginHorizontal: -PAGE_PADDING, height: 200 }}
              contentContainerStyle={{ paddingHorizontal: sidePadding }}
              onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / itemWidth))}
              renderItem={({ item }) => <AppointmentCard item={item} width={itemWidth} />}
            />
            <View style={styles.dots}>
              {upcomingAppointments.map((item, index) => (
                <View
                  key={item.appointmentId ?? index}
                  style={[styles.dot, { backgroundColor: index === page ? palette.primary[500] : palette.neutral[100] }]}
                />
              ))}
            </View>
          </>
        )}

        {/* ACTIVE MEDICATIONS */}
        <AppText variant="h3" bold style={{ marginTop: 10 }}>
          Active Medications
        </AppText>

        {todayTasks.length === 0 ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <AppText variant="labelLight" center>
              No active medications on file.
            </AppText>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {todayTasks.map((task, index) => (
              <Card key={`${task.title}-${index}`} padding={15} style={styles.medRow}>
                <AppText size={20}>💊</AppText>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText bold size={15} color={theme.isDark ? palette.neutral[100] : palette.neutral[900]}>
                    {task.title}
                  </AppText>
                  <AppText variant="labelLight" size={13}>
                    {task.details}
                  </AppText>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* QUICK SERVICES - only "Book Appointment" is wired, as in the MAUI app. */}
        <AppText variant="h3" bold style={{ marginTop: 10 }}>
          Quick Services
        </AppText>
        <View style={styles.services}>
          <QuickService icon="🩺" label="Book Appointment" onPress={() => router.navigate("/appointments")} />
          <QuickService icon="💊" label="Request Refill" />
          <QuickService icon="💬" label="Message Doctor" />
          <QuickService icon="📊" label="Log Vitals" />
        </View>
      </ScreenScroll>

      <GlassBusyOverlay isRunning={isBusy} message="Preparing your care dashboard" />
    </View>
  );
}

function AppointmentCard({ item, width }: { item: AppointmentItem; width: number }) {
  return (
    <View style={{ width, paddingRight: 12 }}>
      <Card radius={16} padding={20} style={[{ gap: 10 }, shadow("#000000", 4, 10, 0.05)]}>
        <View style={styles.cardTop}>
          <AppText bold size={12} color={palette.primary[700]} style={{ letterSpacing: 1, flex: 1 }} numberOfLines={1}>
            {item.specialty}
          </AppText>
          <View style={styles.statusChip}>
            <AppText bold size={11} color={palette.primary[900]}>
              {item.status}
            </AppText>
          </View>
        </View>
        <AppText variant="h3" bold numberOfLines={1}>
          {item.doctorName}
        </AppText>
        <Divider style={{ marginVertical: 5 }} />
        <View style={styles.detailRow}>
          <AppText size={16}>📅</AppText>
          <AppText variant="label" bold>
            {item.date}
          </AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText size={16}>⏰</AppText>
          <AppText variant="label">{item.time}</AppText>
        </View>
      </Card>
    </View>
  );
}

function QuickService({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.serviceCell}>
      <Card padding={15} style={{ alignItems: "center", gap: 8 }}>
        <AppText size={26}>{icon}</AppText>
        <AppText bold size={13}>
          {label}
        </AppText>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", marginTop: 10 },
  carouselBox: { height: 200 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  statusChip: { backgroundColor: palette.primary[100], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  medRow: { flexDirection: "row", alignItems: "center", gap: 15 },
  services: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  serviceCell: { width: "48%", flexGrow: 1 },
});
