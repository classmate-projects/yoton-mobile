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

// Development only: lets the Face Lock flow be seen on an emulator that has no face unlock (the
// unlock decision is still the phone's own biometric - on such an emulator, its fingerprint).
// __DEV__ is false in release builds, so this can never make a real phone claim a face it lacks.
const FAKE_FACE_UNLOCK = __DEV__ && process.env.EXPO_PUBLIC_FAKE_FACE_UNLOCK === "1";

/**
 * Whether the phone has real face recognition (Face ID, or an Android face unlock). Face Lock is only
 * offered where this is true: the face check is the phone's own, so without one there is nothing to
 * validate a face.
 */
export async function hasFaceRecognition(): Promise<boolean> {
  if (FAKE_FACE_UNLOCK) return true;
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  } catch {
    return false;
  }
}

/** Whether the phone has a fingerprint reader (offered in Face Lock as an alternative to the face). */
export async function hasFingerprintSensor(): Promise<boolean> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  } catch {
    return false;
  }
}

export type BiometricResult =
  | { success: true }
  // `cancelled`: the prompt was dismissed without a verdict (Cancel pressed, or the system closed it).
  // Android reports a system cancel - e.g. the app was minimised while the prompt was up - as plain
  // "user_cancel", so callers that care must combine this with what the app itself observed.
  | { success: false; message: string | null; cancelled: boolean };

const FRIENDLY_ERRORS: Record<string, string | null> = {
  user_cancel: "Cancelled",
  system_cancel: "Cancelled",
  app_cancel: "Cancelled",
  authentication_failed: "Couldn't verify",
  lockout: "Biometrics are temporarily locked",
  not_enrolled: "No fingerprint or face is set up on this device",
  not_available: "Biometrics aren't available on this device",
};

// Which check the prompt is worded for. Android lets one prompt take whichever biometric the phone
// has (the app can't force face-only or fingerprint-only), so this shapes the wording and when the
// prompt is opened - Face Lock opens it for "face" by itself and for "fingerprint" only on request.
export type BiometricMethod = "any" | "face" | "fingerprint";

const PROMPT_DESCRIPTIONS: Record<BiometricMethod, string> = {
  any: "Use your fingerprint or face to continue",
  face: "Look at the camera to continue",
  fingerprint: "Touch the fingerprint sensor to continue",
};

export async function authenticateWithBiometrics(method: BiometricMethod = "any"): Promise<BiometricResult> {
  try {
    // The system prompt can briefly move the app out of the foreground (iOS "inactive", some Android
    // versions "background"): that must not look like the user leaving.
    const result = await withoutAppLock(() =>
      LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Yoton Health",
        promptSubtitle: "Verify it's you",
        promptDescription: PROMPT_DESCRIPTIONS[method],
        cancelLabel: "Cancel",
        disableDeviceFallback: true,
        biometricsSecurityLevel: "weak",
      }),
    );

    if (result.success) return { success: true };
    return {
      success: false,
      message: FRIENDLY_ERRORS[result.error] ?? null,
      cancelled: result.error === "user_cancel" || result.error === "system_cancel" || result.error === "app_cancel",
    };
  } catch {
    return { success: false, message: null, cancelled: false };
  }
}
