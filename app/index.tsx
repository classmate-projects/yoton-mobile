import { useEffect, useRef } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, useAnimatedValue } from "react-native";

import { AppText } from "@/components/AppText";
import { hasSession, signOut } from "@/services/session";
import { prefs, PrefKeys } from "@/services/storage";
import { palette } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/typography";
import { resetTo } from "@/utils/navigation";

const FALLBACK_TIMEOUT_MS = 3500;

// A short native logo-reveal instead of a bundled video: smaller app, no codec/black-frame edge
// cases. (Port of the MAUI SplashPage.) The auth check starts immediately so it overlaps with the
// animation rather than adding its latency on top of it.
export default function SplashScreen() {
  const theme = useTheme();
  const logoOpacity = useAnimatedValue(0);
  const logoScale = useAnimatedValue(0.7);
  const wordmarkOpacity = useAnimatedValue(0);
  const hasNavigated = useRef(false);
  // Set by the effect below; lets a tap anywhere skip straight to the app.
  const continueRef = useRef<() => Promise<void>>(async () => {});
  const authState = useRef<Promise<{ signedIn: boolean; biometricEnabled: boolean }> | null>(null);

  useEffect(() => {
    const loadAuthState = async () => ({
      signedIn: await hasSession(),
      biometricEnabled: await prefs.getBool(PrefKeys.biometricEnabled, false),
    });
    authState.current = loadAuthState();

    const continueToApp = async () => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;

      const { signedIn, biometricEnabled } = await (authState.current ?? loadAuthState());
      // Opening the app after it was closed follows the same rule as coming back to it after it was
      // minimised: biometric unlock has priority (lock screen, session intact); a stored session
      // without biometrics is ended and the login form is shown; a first run / logged-out user
      // sees the Welcome screen.
      if (signedIn && biometricEnabled) {
        resetTo("/biometric-lock");
      } else if (signedIn) {
        await signOut({ keepBiometricPrompt: true });
        resetTo("/login");
      } else {
        resetTo("/welcome");
      }
    };
    continueRef.current = continueToApp;

    // Safety net in case something prevents the animation sequence from completing.
    const fallback = setTimeout(() => void continueToApp(), FALLBACK_TIMEOUT_MS);

    const cubic = Easing.out(Easing.cubic);
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 350, easing: cubic, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 350, easing: cubic, useNativeDriver: true }),
      ]),
      Animated.timing(wordmarkOpacity, { toValue: 1, duration: 280, easing: cubic, useNativeDriver: true }),
      // Small settle pulse so the reveal doesn't feel abrupt.
      Animated.timing(logoScale, { toValue: 1.05, duration: 140, easing: Easing.out(Easing.sin), useNativeDriver: true }),
      Animated.timing(logoScale, { toValue: 1, duration: 140, easing: Easing.in(Easing.sin), useNativeDriver: true }),
      Animated.delay(150),
    ]);
    animation.start(({ finished }) => {
      if (finished) void continueToApp();
    });

    return () => {
      clearTimeout(fallback);
      animation.stop();
    };
  }, [logoOpacity, logoScale, wordmarkOpacity]);

  return (
    <Pressable
      accessibilityLabel="Yoton Health"
      onPress={() => void continueRef.current()}
      style={[styles.fill, { backgroundColor: theme.isDark ? palette.neutral[900] : "#FFFFFF" }]}
    >
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <Image source={require("../assets/images/app-logo.png")} style={styles.logo} resizeMode="contain" />
      </Animated.View>
      <Animated.View style={{ opacity: wordmarkOpacity }}>
        <AppText
          size={26}
          bold
          style={{ fontFamily: fonts.publicSansBold }}
          color={theme.isDark ? palette.primary[300] : palette.primary[900]}
        >
          Yoton Health
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18 },
  logo: { width: 132, height: 132 },
});
