import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Divider, ScreenScroll } from "@/components/layout";
import { useOnFocus } from "@/hooks/useFocus";
import { palette } from "@/theme/colors";
import { useMore } from "@/viewmodels/useMore";

interface MoreItem {
  icon: string;
  title: string;
  subtitle: string;
  href: Href;
}

const ITEMS: MoreItem[] = [
  { icon: "🧭", title: "Patient Perspective", subtitle: "Track your mood, pain, water and steps", href: "/patient-perspective" },
  { icon: "🤝", title: "Support & Care Circle", subtitle: "Contact the clinic or manage your care circle", href: "/support" },
  { icon: "⚙️", title: "Settings", subtitle: "Preferences, security, and logout", href: "/settings" },
];

// Hub for the 5th tab: profile card plus Patient Perspective, Support and Settings - reachable
// (and leavable, via the native back button) from the same persistent tab bar as everything else.
// (Port of the MAUI MorePage.)
export default function MoreScreen() {
  const { userName, userRole, userInitials, refreshProfile } = useMore();

  useOnFocus(() => void refreshProfile());

  return (
    <ScreenScroll topInset>
      <View style={{ gap: 4 }}>
        <AppText variant="h2" bold>
          More
        </AppText>
        <AppText variant="labelLight">Your profile, wellbeing tools, and account settings.</AppText>
      </View>

      <Card radius={16} padding={20} backgroundColor={palette.primary[700]}>
        <View style={styles.profileRow}>
          <View style={styles.initials}>
            <AppText bold size={22} color={palette.primary[700]}>
              {userInitials}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText bold size={17} color="#FFFFFF">
              {userName}
            </AppText>
            <AppText size={13} color={palette.primary[100]}>
              {userRole}
            </AppText>
          </View>
        </View>
      </Card>

      <Card radius={16} padding={5}>
        {ITEMS.map((item, index) => (
          <View key={item.title}>
            {index > 0 && <Divider style={{ marginHorizontal: 15 }} />}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(item.href)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
            >
              <AppText size={20}>{item.icon}</AppText>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText bold size={15}>
                  {item.title}
                </AppText>
                <AppText variant="labelLight" size={12}>
                  {item.subtitle}
                </AppText>
              </View>
              <AppText size={20} color={palette.neutral[300]}>
                ›
              </AppText>
            </Pressable>
          </View>
        ))}
      </Card>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: "row", alignItems: "center", gap: 15 },
  initials: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 15, padding: 15 },
});
