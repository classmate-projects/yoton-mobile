import { useFonts } from "expo-font";
import { Stack } from "expo-router/stack";
import * as ScreenCapture from "expo-screen-capture";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AlertProvider } from "@/components/GlassDialogs";
import { PrivacyCover } from "@/components/PrivacyCover";
import { showToast, ToastHost } from "@/components/Toast";
import { hasPendingReturn, isLockSuppressed, noteLeftForeground, resolveReturn } from "@/services/appLock";
import { LogService, installGlobalErrorLogging } from "@/services/logger";
import { startProactiveTokenRefresh } from "@/services/session";
import { applySavedThemeOverride, ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/typography";
import { resetTo } from "@/utils/navigation";

// Keep the native splash up until fonts and the saved theme are ready, so the first JS frame is
// already correct (no fallback-font or light->dark flash).
SplashScreen.preventAutoHideAsync().catch(() => {});
installGlobalErrorLogging();

// Patient health data (records, bills, messages) is shown throughout the app. Android: FLAG_SECURE
// blocks screenshots (they come out black), screen recording/casting and hides the Recents
// thumbnail (also set natively in MainActivity.onCreate by plugins/withSecureWindow.js, so it is
// in force before any JS runs). iOS: the secure-view mechanism blanks screenshots and recordings,
// and the app-switcher snapshot is blurred. (The MAUI app did the same with FLAG_SECURE /
// UIScreen.Captured.)
//
// Dev builds only, developers can opt out for QA screenshots with EXPO_PUBLIC_ALLOW_SCREENSHOTS=1.
// __DEV__ is false in release builds, so this can never weaken a shipped app.
const ALLOW_SCREENSHOTS = __DEV__ && process.env.EXPO_PUBLIC_ALLOW_SCREENSHOTS === "1";

function useSecureScreen(): void {
  useEffect(() => {
    if (ALLOW_SCREENSHOTS) return;
    ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    if (Platform.OS === "ios") ScreenCapture.enableAppSwitcherProtectionAsync(0.6).catch(() => {});
    // Deliberately no cleanup: the protection is app-wide for the life of the process.
  }, []);
}

// iOS can only tell the user afterwards that a screenshot was attempted; Android shows the OS's own
// "can't take screenshot" message once FLAG_SECURE is set, so it needs nothing here.
function IosScreenshotNotice(): null {
  ScreenCapture.useScreenshotListener(() => showToast("Screenshots of this content aren't permitted"));
  return null;
}

// What used to live in the MAUI App class, and then some. Leaving the app - minimising it, switching
// away, closing it - ends the "attended" session: on the way back, biometric unlock (if on) takes
// priority and shows the lock screen, otherwise the user is signed out and asked to log in again
// (see services/appLock.ts). Meanwhile the privacy cover hides the screen. Also runs the proactive
// access-token refresh loop.
function useSessionGuard(setCovered: (covered: boolean) => void): void {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (!hasPendingReturn()) {
          setCovered(false);
          return;
        }
        void resolveReturn()
          .then((action) => {
            if (action === "lock") resetTo("/biometric-lock");
            else if (action === "logout") resetTo("/login");
          })
          .catch((error) => LogService.write(`Resume check failed: ${error}`))
          // Let the new screen mount before the cover comes off, so the old one never flashes.
          .finally(() => setTimeout(() => setCovered(false), 80));
        return;
      }

      // "inactive" (iOS: app switcher, control centre, system sheets) or "background". The app's own
      // system UIs (biometric prompt, pickers) are exempt.
      if (!isLockSuppressed()) setCovered(true);
      if (state === "background") noteLeftForeground();
    });

    const stopRefreshing = startProactiveTokenRefresh();
    return () => {
      subscription.remove();
      stopRefreshing();
    };
  }, [setCovered]);
}

function AppStack() {
  const theme = useTheme();
  const [covered, setCovered] = useState(false);
  useSessionGuard(setCovered);

  return (
    <>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.pageBg },
          headerStyle: { backgroundColor: theme.pageBg },
          headerTintColor: theme.heading,
          headerTitleStyle: { fontFamily: fonts.publicSansBold },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ animation: "fade" }} />
        <Stack.Screen name="welcome" options={{ contentStyle: { backgroundColor: theme.authBg } }} />
        <Stack.Screen name="login" options={{ contentStyle: { backgroundColor: theme.authBg } }} />
        <Stack.Screen name="biometric-lock" options={{ animation: "fade", gestureEnabled: false }} />
        {/* Swiping back from Home must never return to login/welcome. */}
        <Stack.Screen name="(tabs)" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="chat" options={{ headerShown: true, title: "" }} />
        <Stack.Screen name="patient-perspective" options={{ headerShown: true, title: "Patient Perspective" }} />
        <Stack.Screen name="support" options={{ headerShown: true, title: "Support & Care Circle" }} />
        <Stack.Screen name="settings" options={{ headerShown: true, title: "Settings" }} />
      </Stack>
      <ToastHost />
      <PrivacyCover visible={covered} />
      {Platform.OS === "ios" && <IosScreenshotNotice />}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.publicSansRegular]: require("../assets/fonts/PublicSans-Regular.ttf"),
    [fonts.publicSansBold]: require("../assets/fonts/PublicSans-Bold.ttf"),
    [fonts.publicSansLight]: require("../assets/fonts/PublicSans-Light.ttf"),
    [fonts.notoSansRegular]: require("../assets/fonts/NotoSans-Regular.ttf"),
    [fonts.notoSansBold]: require("../assets/fonts/NotoSans-Bold.ttf"),
    [fonts.notoSansLight]: require("../assets/fonts/NotoSans-Light.ttf"),
    [fonts.openSansRegular]: require("../assets/fonts/OpenSans-Regular.ttf"),
    [fonts.openSansBold]: require("../assets/fonts/OpenSans-Bold.ttf"),
    [fonts.openSansLight]: require("../assets/fonts/OpenSans-Light.ttf"),
  });
  const [themeReady, setThemeReady] = useState(false);
  useSecureScreen();

  useEffect(() => {
    void applySavedThemeOverride().finally(() => setThemeReady(true));
  }, []);

  const ready = (fontsLoaded || !!fontError) && themeReady;

  useEffect(() => {
    if (fontError) LogService.write(`Font loading failed: ${fontError}`);
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontError]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AlertProvider>
          <AppStack />
        </AlertProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
