import { Image, StyleSheet, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

// A plain branded screen laid over everything while the app isn't in the foreground (and until the
// lock decision has been made on the way back). It keeps patient data out of the app-switcher
// snapshot on iOS and out of the one-frame flash of the previous screen when the app returns.
export function PrivacyCover({ visible }: { visible: boolean }) {
  const theme = useTheme();
  if (!visible) return null;

  return (
    <View pointerEvents="auto" style={[styles.cover, { backgroundColor: theme.pageBg }]}>
      <Image source={require("../../assets/images/app-logo.png")} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", zIndex: 1000 },
  logo: { width: 96, height: 96, opacity: 0.9 },
});
