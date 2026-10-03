import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";

import { WEB_APP_URL } from "@/config/env";
import { useAlert } from "@/components/GlassDialogs";
import { login } from "@/services/auth";
import { isBiometricAvailable } from "@/services/biometrics";
import { withoutAppLock } from "@/services/appLock";
import { LogService } from "@/services/logger";
import { clearSession, prefs, PrefKeys } from "@/services/storage";
import { resetTo } from "@/utils/navigation";

// Sign-in. (Port of the MAUI LoginViewModel.) The mobile app is for patients only: staff accounts
// authenticate fine against the API, but are rejected here and told to use the web portal.
export function useLogin() {
  const { showAlert } = useAlert();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  // The server flags this whenever the typed password is still the temporary one issued at
  // registration. Password reset lives on the web portal (same flow as "Forgot password?"); this
  // just offers it and, if accepted, remembers to celebrate once they come back with a real one.
  const offerPasswordChange = useCallback(async () => {
    const accepted = await showAlert({
      title: "Update your password?",
      message:
        "You're still signed in with the temporary password we set up for you. For your security, we recommend changing it now.",
      confirmText: "Change Password",
      cancelText: "Not now",
    });
    if (!accepted) return;

    await prefs.setBool(PrefKeys.pendingPasswordResetConfirmation, true);
    await withoutAppLock(() =>
      WebBrowser.openBrowserAsync(`${WEB_APP_URL}/forgot-password?email=${encodeURIComponent(email)}`),
    );
  }, [showAlert, email]);

  // Asked once, on the very first successful login: unlock with Face ID / fingerprint next time
  // instead of retyping the password?
  const offerBiometricEnrollment = useCallback(async () => {
    if (await prefs.getBool(PrefKeys.biometricPrompted, false)) return;
    await prefs.setBool(PrefKeys.biometricPrompted, true);

    if (!(await isBiometricAvailable())) return;

    const accepted = await showAlert({
      title: "Enable Face ID / fingerprint sign-in?",
      message: "Unlock Yoton Health next time with your device's biometrics instead of typing your password.",
      confirmText: "Enable",
      cancelText: "Not now",
    });
    await prefs.setBool(PrefKeys.biometricEnabled, accepted);
  }, [showAlert]);

  const submit = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);

    try {
      let outcome;
      try {
        outcome = await login(email.trim(), password);
      } catch (error) {
        // Offline / timed out: nothing reached the server.
        LogService.write(`Login request failed: ${error}`);
        setIsBusy(false);
        await showAlert({
          title: "Can't reach the server",
          message: "Please check your connection and try again.",
          confirmText: "Retry",
        });
        return;
      }

      // Login work is done - drop the busy overlay before showing any alert so the two don't stack.
      setIsBusy(false);

      if (outcome.kind === "invalid") {
        await showAlert({ title: "Error", message: "Invalid login", confirmText: "Retry" });
        return;
      }
      if (outcome.kind === "rate-limited") {
        await showAlert({ title: "Too many attempts", message: outcome.message, confirmText: "OK" });
        return;
      }
      if (outcome.kind === "error") {
        await showAlert({
          title: "Something went wrong",
          message: "We couldn't sign you in right now. Please try again in a moment.",
          confirmText: "OK",
        });
        return;
      }

      const user = outcome.user;

      if (user.role.toLowerCase() !== "patient") {
        // login() already stored the tokens before the role was known - discard them so a staff
        // session never lingers on this device. Worded for someone who has no idea what a "role"
        // is: this app is for patients, staff sign in on the web instead.
        await clearSession();
        await showAlert({
          title: "This app is for patients only",
          message:
            "This account isn't a patient account. Doctors, reception, and other clinic staff should sign in through the Yoton web portal on a computer instead of this app.",
          confirmText: "OK",
        });
        return;
      }

      await prefs.setString(PrefKeys.userName, user.name);
      await prefs.setString(PrefKeys.userRole, user.role);
      await prefs.setString(PrefKeys.loginIdentifier, email.trim());

      if (user.isDefaultPassword) {
        await offerPasswordChange();
      } else if (await prefs.getBool(PrefKeys.pendingPasswordResetConfirmation, false)) {
        // They were on the default password last time, agreed to change it, and have now come back
        // with a real one - the moment to celebrate, shown once on the Home screen.
        await prefs.remove(PrefKeys.pendingPasswordResetConfirmation);
        await prefs.setBool(PrefKeys.showSecurityConfirmed, true);
      }

      await offerBiometricEnrollment();

      resetTo("/home");
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, email, password, showAlert, offerPasswordChange, offerBiometricEnrollment]);

  // Password reset (request + set-new-password) lives on the web app, which already has the whole
  // flow; the mobile app only hands off to it.
  const openForgotPassword = useCallback(async () => {
    await withoutAppLock(() => WebBrowser.openBrowserAsync(`${WEB_APP_URL}/forgot-password`));
  }, []);

  return { email, setEmail, password, setPassword, isBusy, submit, openForgotPassword };
}
