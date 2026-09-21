import { Camera } from "expo-camera";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/api/client";
import { Endpoints } from "@/api/endpoints";
import type { ApiEnvelope, MyProfile } from "@/api/types";
import { useAlert } from "@/components/GlassDialogs";
import { APP_VERSION } from "@/config/env";
import { withoutAppLock } from "@/services/appLock";
import { hasFaceRecognition, isBiometricAvailable } from "@/services/biometrics";
import { LogService } from "@/services/logger";
import { signOut } from "@/services/session";
import { prefs, PrefKeys } from "@/services/storage";
import { useTheme } from "@/theme/ThemeProvider";
import { computeInitials } from "@/utils/initials";
import { resetTo } from "@/utils/navigation";

// Settings & preferences: profile card, the three switches, about panel and logout.
// (Port of the MAUI SettingsViewModel.)
export function useSettings() {
  const theme = useTheme();
  const { showAlert } = useAlert();

  const [isBusy, setIsBusy] = useState(false);
  const loading = useRef(false);
  const [userName, setUserName] = useState("Patient User");
  const [userEmail, setUserEmail] = useState("");
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isFaceLockEnabled, setIsFaceLockEnabled] = useState(false);
  // Whether the phone has real face recognition; otherwise Face Lock finishes with the fingerprint.
  const [hasFace, setHasFace] = useState(false);

  useEffect(() => {
    void (async () => {
      setUserName(await prefs.getString(PrefKeys.userName, "Patient User"));
      setIsBiometricEnabled(await prefs.getBool(PrefKeys.biometricEnabled, false));
      setIsNotificationsEnabled(await prefs.getBool(PrefKeys.notificationsEnabled, true));
      setIsFaceLockEnabled(await prefs.getBool(PrefKeys.faceLockEnabled, false));
      setHasFace(await hasFaceRecognition());
    })();
  }, []);

  const initialize = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    setIsBusy(true);
    try {
      const response = await api.get<ApiEnvelope<MyProfile>>(Endpoints.patient.me);
      if (response.data) {
        if (response.data.name?.trim()) {
          setUserName(response.data.name);
          await prefs.setString(PrefKeys.userName, response.data.name);
        }
        setUserEmail(response.data.email ?? "");
      }
    } catch (error) {
      // Keep the cached name when offline.
      LogService.write(`Failed to load settings profile: ${error}`);
    } finally {
      loading.current = false;
      setIsBusy(false);
    }
  }, []);

  const setDarkMode = useCallback((value: boolean) => theme.setDarkMode(value), [theme]);

  // UI-only in the MAUI app too (there's no push service behind it); persisted here so the switch
  // doesn't snap back every time the screen is reopened.
  const setNotificationsEnabled = useCallback((value: boolean) => {
    setIsNotificationsEnabled(value);
    void prefs.setBool(PrefKeys.notificationsEnabled, value);
  }, []);

  // Turning biometrics on for a device that can't do them would leave the next cold start stuck
  // on a lock screen nobody can pass - so check first and say why the switch didn't take.
  const requireBiometrics = useCallback(async (): Promise<boolean> => {
    if (await isBiometricAvailable()) return true;
    await showAlert({
      title: "Biometrics unavailable",
      message: "Set up a fingerprint or Face ID in your device settings first, then turn this on.",
      confirmText: "OK",
    });
    return false;
  }, [showAlert]);

  const setBiometricEnabled = useCallback(
    async (value: boolean) => {
      if (value && !(await requireBiometrics())) {
        setIsBiometricEnabled(false);
        return;
      }
      setIsBiometricEnabled(value);
      await prefs.setBool(PrefKeys.biometricEnabled, value);

      // Face Lock is a way of presenting biometric unlock, so it can't outlive it.
      if (!value) {
        setIsFaceLockEnabled(false);
        await prefs.setBool(PrefKeys.faceLockEnabled, false);
      }
    },
    [requireBiometrics],
  );

  // Face Lock: the lock screen opens the front camera with the holographic scan, and the phone's own
  // biometric makes the actual decision. The camera is only for the live picture, so a "no" to the
  // permission doesn't block it - the scan just runs without the video.
  const setFaceLockEnabled = useCallback(
    async (value: boolean) => {
      if (!value) {
        setIsFaceLockEnabled(false);
        await prefs.setBool(PrefKeys.faceLockEnabled, false);
        return;
      }

      if (!(await requireBiometrics())) {
        setIsFaceLockEnabled(false);
        return;
      }

      let cameraGranted = (await Camera.getCameraPermissionsAsync()).granted;
      if (!cameraGranted) {
        // The permission dialog takes the screen from the app for a moment; that is not "leaving".
        cameraGranted = (await withoutAppLock(() => Camera.requestCameraPermissionsAsync())).granted;
      }

      setIsFaceLockEnabled(true);
      setIsBiometricEnabled(true);
      await prefs.setBool(PrefKeys.faceLockEnabled, true);
      await prefs.setBool(PrefKeys.biometricEnabled, true);

      if (!cameraGranted) {
        await showAlert({
          title: "Face Lock is on",
          message:
            "Camera access is off, so the scan will run without the live camera picture. Unlocking still uses your phone's biometrics. You can allow the camera in your phone's settings.",
          confirmText: "OK",
        });
      }
    },
    [requireBiometrics, showAlert],
  );

  const logout = useCallback(async () => {
    await signOut();
    resetTo("/welcome");
  }, []);

  return {
    isBusy,
    userName,
    userEmail,
    userInitials: computeInitials(userName),
    isDarkModeEnabled: theme.isDark,
    isNotificationsEnabled,
    isBiometricEnabled,
    isFaceLockEnabled,
    hasFace,
    appVersion: APP_VERSION,
    initialize,
    setDarkMode,
    setNotificationsEnabled,
    setBiometricEnabled,
    setFaceLockEnabled,
    logout,
  };
}
