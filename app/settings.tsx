import { StyleSheet, Switch, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Divider, ScreenScroll } from "@/components/layout";
import { GlassBusyOverlay } from "@/components/GlassBusyOverlay";
import { useOnFocus } from "@/hooks/useFocus";
import { palette } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { useSettings } from "@/viewmodels/useSettings";

// Preferences, security and logout. (Port of the MAUI SettingsPage.)
export default function SettingsScreen() {
  const s = useSettings();

  useOnFocus(() => void s.initialize());

  return (
    <View style={styles.fill}>
      <ScreenScroll bottomInset>
        <View style={{ gap: 4 }}>
          <AppText variant="h2" bold>
            Settings & Preferences
          </AppText>
          <AppText variant="labelLight">
            Configure application styles, notifications, and manage session logouts.
          </AppText>
        </View>

        <Card radius={16} padding={20} backgroundColor={palette.primary[700]}>
          <View style={styles.profileRow}>
            <View style={styles.initials}>
              <AppText bold size={22} color={palette.primary[700]}>
                {s.userInitials}
              </AppText>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText bold size={17} color="#FFFFFF">
                {s.userName}
              </AppText>
              <AppText size={13} color={palette.primary[100]}>
                {s.userEmail}
              </AppText>
            </View>
          </View>
        </Card>

        <Card radius={16} padding={20} style={{ gap: 15 }}>
          <SwitchRow
            title="Dark Mode Theme"
            subtitle="Switch between light and dark backgrounds"
            value={s.isDarkModeEnabled}
            onValueChange={s.setDarkMode}
          />
          <Divider style={{ marginVertical: 5 }} />
          <SwitchRow
            title="Push Notifications"
            subtitle="Receive alert logs for medications and appointments"
            value={s.isNotificationsEnabled}
            onValueChange={s.setNotificationsEnabled}
          />
          <Divider style={{ marginVertical: 5 }} />
          <SwitchRow
            title="Fingerprint / Face ID Sign-In"
            subtitle="Unlock Yoton Health with biometrics instead of your password"
            value={s.isBiometricEnabled}
            onValueChange={(value) => void s.setBiometricEnabled(value)}
          />
          <Divider style={{ marginVertical: 5 }} />
          <SwitchRow
            title="Face Lock"
            subtitle={
              s.hasFace
                ? "Open the camera and unlock with a holographic face scan"
                : "Camera face-scan screen. This phone has no face unlock, so it finishes with your fingerprint"
            }
            value={s.isFaceLockEnabled}
            onValueChange={(value) => void s.setFaceLockEnabled(value)}
          />
        </Card>

        <Card radius={16} padding={20} style={{ gap: 10 }}>
          <AppText bold size={11} color={palette.primary[700]} style={{ letterSpacing: 1 }}>
            ABOUT APPLICATION
          </AppText>
          <View style={[styles.aboutRow, { marginTop: 5 }]}>
            <AppText size={14}>Application Version</AppText>
            <AppText variant="labelLight" size={14}>{`v${s.appVersion}`}</AppText>
          </View>
          <View style={styles.aboutRow}>
            <AppText size={14}>Database Core Connection</AppText>
            <AppText bold size={14} color={palette.success}>
              Secure REST API
            </AppText>
          </View>
        </Card>

        <AppButton
          title="Logout from Device"
          variant="danger"
          height={50}
          onPress={() => void s.logout()}
          style={{ marginTop: 20 }}
        />
      </ScreenScroll>

      <GlassBusyOverlay isRunning={s.isBusy} message="Loading your profile" />
    </View>
  );
}

function SwitchRow(props: { title: string; subtitle: string; value: boolean; onValueChange: (value: boolean) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText bold size={15}>
          {props.title}
        </AppText>
        <AppText variant="labelLight" size={12}>
          {props.subtitle}
        </AppText>
      </View>
      <Switch
        value={props.value}
        onValueChange={props.onValueChange}
        // Brand-blue "on" state (Android would otherwise tint the thumb with the system accent).
        trackColor={{ false: theme.neutralFill, true: palette.primary[300] }}
        thumbColor={props.value ? palette.primary[500] : theme.isDark ? palette.neutral[300] : "#F4F3F4"}
        accessibilityLabel={props.title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 15 },
  initials: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  aboutRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
