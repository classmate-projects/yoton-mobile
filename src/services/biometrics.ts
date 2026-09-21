import * as LocalAuthentication from "expo-local-authentication";

import { withoutAppLock } from "./appLock";

// Face ID / fingerprint unlock. "weak" strength matches the MAUI app (AuthenticatorStrength.Weak):
// any biometric the device treats as a class-2 unlock counts, and the device PIN is deliberately
// not offered as a fallback here - the app's own "Use password instead" is the fallback.

/** Whether this device has biometric hardware AND at least one enrolled face/fingerprint. */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

/**
 * Whether the phone has real face recognition (Face ID, or an Android face unlock) - as opposed to
 * only a fingerprint reader. Face Lock works either way (the system decides who gets in); this just
 * lets Settings tell the user which one they will actually be using.
 */
export async function hasFaceRecognition(): Promise<boolean> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  } catch {
    return false;
  }
}

export type BiometricResult = { success: true } | { success: false; message: string | null };

const FRIENDLY_ERRORS: Record<string, string | null> = {
  user_cancel: "Cancelled",
  system_cancel: "Cancelled",
  app_cancel: "Cancelled",
  authentication_failed: "Couldn't verify",
  lockout: "Biometrics are temporarily locked",
  not_enrolled: "No fingerprint or face is set up on this device",
  not_available: "Biometrics aren't available on this device",
};

export async function authenticateWithBiometrics(): Promise<BiometricResult> {
  try {
    // The system prompt can briefly move the app out of the foreground (iOS "inactive", some Android
    // versions "background"): that must not look like the user leaving.
    const result = await withoutAppLock(() =>
      LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Yoton Health",
        promptSubtitle: "Verify it's you",
        promptDescription: "Use your fingerprint or face to continue",
        cancelLabel: "Cancel",
        disableDeviceFallback: true,
        biometricsSecurityLevel: "weak",
      }),
    );

    if (result.success) return { success: true };
    return { success: false, message: FRIENDLY_ERRORS[result.error] ?? null };
  } catch {
    return { success: false, message: null };
  }
}
