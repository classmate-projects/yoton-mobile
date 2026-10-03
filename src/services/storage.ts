import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// Tokens live in encrypted, OS-backed storage (Keychain / Keystore), never in plain
// preferences: preferences are unencrypted and, on Android, part of app backups. Same split
// (and the same key names) as the MAUI app's SecureStorage vs Preferences.
export const SecureKeys = {
  authToken: "auth_token",
  refreshToken: "refresh_token",
} as const;

export const PrefKeys = {
  userName: "user_name",
  userRole: "user_role",
  // The login identifier (email or username) entered at sign-in; stored so that re-authentication
  // flows (e.g. print/download password gate in the EMR) can call the login endpoint without
  // asking the user to re-enter their email.
  loginIdentifier: "login_identifier",
  currencySymbol: "currency_symbol",
  biometricEnabled: "biometric_enabled",
  biometricPrompted: "biometric_prompted",
  // Presentation of biometric unlock: the camera + holographic scan instead of the bare system prompt.
  faceLockEnabled: "face_lock_enabled",
  pendingPasswordResetConfirmation: "pending_password_reset_confirmation",
  showSecurityConfirmed: "show_security_confirmed",
  appointmentStatusSnapshot: "appointment_status_snapshot",
  notificationsEnabled: "notifications_enabled",
} as const;

// Survives logout: it's a device preference, not part of a signed-in session.
export const THEME_OVERRIDE_KEY = "theme_override";

export const secure = {
  // A failing keystore (e.g. after restoring a device backup) is treated as "no session"
  // rather than crashing the app - the user just signs in again.
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Nothing stored under that key - already the state we want.
    }
  },
  async clear(): Promise<void> {
    await Promise.all(Object.values(SecureKeys).map((key) => secure.remove(key)));
  },
};

export const prefs = {
  async getString(key: string, fallback: string): Promise<string> {
    const value = await AsyncStorage.getItem(key);
    return value ?? fallback;
  },
  async setString(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },
  async getBool(key: string, fallback: boolean): Promise<boolean> {
    const value = await AsyncStorage.getItem(key);
    return value == null ? fallback : value === "true";
  },
  async setBool(key: string, value: boolean): Promise<void> {
    await AsyncStorage.setItem(key, value ? "true" : "false");
  },
  async getNumber(key: string, fallback: number): Promise<number> {
    const value = await AsyncStorage.getItem(key);
    const parsed = value == null ? NaN : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  },
  async setNumber(key: string, value: number): Promise<void> {
    await AsyncStorage.setItem(key, String(value));
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
  // Wipes every preference except device-level ones (see THEME_OVERRIDE_KEY).
  async clear(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const doomed = keys.filter((key) => key !== THEME_OVERRIDE_KEY);
    if (doomed.length > 0) await AsyncStorage.multiRemove(doomed);
  },
};

// Everything a signed-in session left behind on this device: tokens and cached profile.
// `keepBiometricPrompt` is for sign-outs the user didn't ask for (the app was left, so the session
// was ended): remembering that they already answered "enable biometrics?" stops that question
// coming back on every single login.
export async function clearSession(options: { keepBiometricPrompt?: boolean } = {}): Promise<void> {
  const prompted = options.keepBiometricPrompt ? await prefs.getBool(PrefKeys.biometricPrompted, false) : false;
  await Promise.all([secure.clear(), prefs.clear()]);
  if (prompted) await prefs.setBool(PrefKeys.biometricPrompted, true);
}
