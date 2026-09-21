import { useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/AppButton";
import { AppText } from "@/components/AppText";
import { HolographicFaceScan, type ScanPhase } from "@/components/HolographicFaceScan";
import { MedicalBusyIndicator } from "@/components/MedicalBusyIndicator";
import { palette } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/typography";
import { useBiometricLock } from "@/viewmodels/useBiometricLock";

const SCAN_TITLES: Record<ScanPhase, string> = {
  searching: "LOOKING FOR YOUR FACE…",
  scanning: "IDENTIFYING…",
  fingerprint: "USE YOUR FINGERPRINT",
  verified: "IDENTITY CONFIRMED",
  failed: "NOT RECOGNISED",
};

// Shown when the session needs proving again: on a cold start with biometrics on, and whenever the
// app is brought back after being left. The check starts straight away; the buttons are for
// retrying or bailing out to the password form. With Face Lock on (and a phone that can check a face)
// the face is validated first, in the camera + holographic scan; the fingerprint is only offered as a
// choice and is not opened unless the user picks it. (Port of the MAUI BiometricLockPage.)
export default function BiometricLockScreen() {
  const lock = useBiometricLock();

  useEffect(() => {
    void lock.unlock();
    // Only on first appearance: a failed attempt must wait for the user to press the button again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Until the preference is known render nothing but the dark backdrop, so the wrong presentation
  // never flashes.
  if (lock.isFaceLock === null) return <View style={[styles.fill, { backgroundColor: "#040A12" }]} />;

  return lock.isFaceLock ? <FaceLockView lock={lock} /> : <ClassicLockView lock={lock} />;
}

type LockState = ReturnType<typeof useBiometricLock>;

function ClassicLockView({ lock }: { lock: LockState }) {
  const theme = useTheme();
  return (
    <View style={[styles.fill, styles.classic, { backgroundColor: theme.pageBg }]}>
      <View style={styles.spacer} />
      <View style={styles.center}>
        <AppText variant="h3" bold center>
          {`Welcome back, ${lock.userName}`}
        </AppText>
        <MedicalBusyIndicator isRunning={lock.isAuthenticating} message={lock.statusMessage} />
      </View>
      <View style={styles.actions}>
        <AppButton title="Unlock" disabled={!lock.canUnlock} onPress={() => void lock.unlock()} style={{ marginTop: 30, marginBottom: 10 }} />
        <AppButton title="Use password instead" variant="ghost" textColor={palette.primary[500]} onPress={lock.switchToPassword} />
      </View>
      <View style={styles.spacer} />
    </View>
  );
}

function FaceLockView({ lock }: { lock: LockState }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [permission] = useCameraPermissions();
  // Leave room for the header and buttons on short screens.
  const size = Math.round(Math.min(width * 0.68, height * 0.36, 300));
  const fingerprintMode = lock.via === "fingerprint";

  return (
    <View style={[styles.fill, { backgroundColor: "#040A12" }]}>
      {/* The scan is always on a dark stage, whatever the app theme. */}
      <StatusBar style="light" />
      <LinearGradient colors={["#0A1B2B", "#040A12"]} style={StyleSheet.absoluteFill} />

      <View style={[styles.faceHeader, { paddingTop: insets.top + 28 }]}>
        <Text style={styles.eyebrow}>YOTON HEALTH · FACE LOCK</Text>
        <Text style={styles.welcome} numberOfLines={1}>
          {`Welcome back, ${lock.userName}`}
        </Text>
      </View>

      <View style={styles.faceCenter}>
        <HolographicFaceScan
          phase={lock.phase}
          title={SCAN_TITLES[lock.phase]}
          subtitle={lock.statusMessage}
          // In fingerprint mode the camera is released, not just hidden.
          showCamera={!!permission?.granted && !fingerprintMode}
          size={size}
        />
      </View>

      <View style={[styles.faceActions, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <AppButton
          title={fingerprintMode ? "Try again" : lock.phase === "failed" ? "Scan again" : "Scan"}
          disabled={!lock.canUnlock}
          backgroundColor="rgba(61,245,255,0.14)"
          textColor="#3DF5FF"
          onPress={() => void lock.unlock(fingerprintMode ? "fingerprint" : "face")}
        />
        {lock.canUseFingerprint && (
          <AppButton
            title={fingerprintMode ? "Use face scan instead" : "Use fingerprint instead"}
            variant="ghost"
            textColor="#3DF5FF"
            disabled={!lock.canUnlock}
            onPress={() => void lock.unlock(fingerprintMode ? "face" : "fingerprint")}
          />
        )}
        <AppButton title="Use password instead" variant="ghost" textColor="#8FB4C9" onPress={lock.switchToPassword} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  classic: { padding: 30 },
  spacer: { flex: 1 },
  center: { alignItems: "center", gap: 24 },
  actions: { alignSelf: "stretch" },
  faceHeader: { alignItems: "center", gap: 6, paddingHorizontal: 24 },
  eyebrow: { fontFamily: fonts.publicSansBold, fontSize: 11, letterSpacing: 3, color: "rgba(61,245,255,0.75)" },
  welcome: { fontFamily: fonts.publicSansBold, fontSize: 22, color: "#E6F4FA" },
  faceCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  faceActions: { paddingHorizontal: 30, gap: 8 },
});
