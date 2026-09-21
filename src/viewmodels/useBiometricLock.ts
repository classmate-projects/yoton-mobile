import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import type { ScanPhase } from "@/components/HolographicFaceScan";
import { authenticateWithBiometrics, hasFaceRecognition, hasFingerprintSensor } from "@/services/biometrics";
import { prefs, PrefKeys } from "@/services/storage";
import { resetTo } from "@/utils/navigation";

// After this many failed biometric attempts in a single app-open, stop retrying biometrics and
// drop the user back to username/password sign-in.
const MAX_FAILED_ATTEMPTS = 3;

// Face Lock timings: a beat of "looking for your face" before the system check starts (the scan has
// to be seen), and a beat on the result before moving on.
const SEARCH_MS = 1500;
const RETRY_SEARCH_MS = 700;
const RESULT_MS = 1100;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Face Lock is only in effect where the phone can actually check a face; otherwise the classic screen
// is used whatever the stored preference says.
async function isFaceLockActive(): Promise<boolean> {
  return (await prefs.getBool(PrefKeys.faceLockEnabled, false)) && (await hasFaceRecognition());
}

export type LockVia = "face" | "fingerprint";

// The lock screen shown when the session needs proving again: on a cold start with biometrics on,
// and whenever the app is brought back after being left. (Port of the MAUI BiometricLockViewModel,
// plus Face Lock.) With Face Lock the face check starts by itself; the fingerprint is only offered
// as a choice and its prompt opens only when the user picks it.
export function useBiometricLock() {
  const [userName, setUserName] = useState("Patient User");
  const [statusMessage, setStatusMessage] = useState("Use Face ID or your fingerprint to continue");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  // null until the preference has been read, so the screen never flashes the wrong presentation.
  const [isFaceLock, setIsFaceLock] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<ScanPhase>("searching");
  // Which check the Face Lock screen is currently showing, and whether a fingerprint is available as
  // the alternative to the face.
  const [via, setVia] = useState<LockVia>("face");
  const [canUseFingerprint, setCanUseFingerprint] = useState(false);
  const failedAttempts = useRef(0);
  const busy = useRef(false);
  // The app left the foreground while the prompt was up: the system then cancels it, and Android
  // reports that exactly like the user pressing Cancel. So the app watches for it itself.
  const wentToBackground = useRef(false);
  // Set once such an interruption has happened; the next time the app is active again the prompt is
  // offered again on its own.
  const interrupted = useRef(false);
  const lastVia = useRef<LockVia>("face");

  useEffect(() => {
    void Promise.all([
      prefs.getString(PrefKeys.userName, "Patient User"),
      isFaceLockActive(),
      hasFingerprintSensor(),
    ]).then(([name, face, fingerprint]) => {
      setUserName(name);
      setIsFaceLock(face);
      setCanUseFingerprint(fingerprint);
    });
  }, []);

  // The login form becomes the root page (no welcome screen behind it), as in the MAUI app.
  const switchToPassword = useCallback(() => {
    resetTo("/login");
  }, []);

  const registerFailedAttempt = useCallback(
    async (errorMessage: string | null) => {
      failedAttempts.current += 1;
      const remaining = MAX_FAILED_ATTEMPTS - failedAttempts.current;

      if (remaining <= 0) {
        setIsLockedOut(true);
        setStatusMessage("Too many failed attempts. Please sign in with your username and password.");
        await delay(1400);
        switchToPassword();
        return;
      }

      const reason = errorMessage?.trim() ? errorMessage : "Couldn't verify";
      setStatusMessage(`${reason} — ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
    },
    [switchToPassword],
  );

  const unlock = useCallback(async (choice: LockVia = "face") => {
    if (busy.current || isLockedOut) return;
    busy.current = true;
    setIsAuthenticating(true);

    try {
      interrupted.current = false;
      wentToBackground.current = false;
      lastVia.current = choice;
      const face = await isFaceLockActive();
      setIsFaceLock(face);
      setVia(choice);

      if (face && choice === "face") {
        setPhase("searching");
        setStatusMessage("Look at the camera");
        await delay(failedAttempts.current === 0 ? SEARCH_MS : RETRY_SEARCH_MS);
        setPhase("scanning");
        setStatusMessage("Hold still…");
      } else if (face) {
        // The user chose the fingerprint: only now does its prompt come into the picture.
        setPhase("fingerprint");
        setStatusMessage("Touch the fingerprint sensor");
      } else {
        setStatusMessage("Verifying...");
      }

      // The decision is always the phone's own biometric; the animation only follows its result.
      const result = await authenticateWithBiometrics(face ? choice : "any");

      if (result.success) {
        failedAttempts.current = 0;
        if (face) {
          setPhase("verified");
          setStatusMessage("Welcome back");
          await delay(RESULT_MS);
        }
        resetTo("/home");
        return;
      }

      if (result.cancelled && wentToBackground.current) {
        // The system closed the prompt because the app was switched away from: not the user's
        // failure, so no attempt is counted - just offer another go.
        interrupted.current = true;
        if (face) setPhase(choice === "fingerprint" ? "fingerprint" : "searching");
        setStatusMessage(choice === "fingerprint" ? "Tap Try again to use your fingerprint" : "Tap Scan to try again");
        return;
      }

      if (face) setPhase("failed");
      await registerFailedAttempt(result.message);
    } finally {
      busy.current = false;
      setIsAuthenticating(false);
    }
  }, [isLockedOut, registerFailedAttempt]);

  // Track leaving the app while a check is running, and bring the prompt back up on return.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background" && busy.current) wentToBackground.current = true;
      if (state === "active" && interrupted.current && !busy.current) void unlock(lastVia.current);
    });
    return () => subscription.remove();
  }, [unlock]);

  return {
    userName,
    statusMessage,
    isAuthenticating,
    isLockedOut,
    isFaceLock,
    phase,
    via,
    canUseFingerprint,
    canUnlock: !isAuthenticating && !isLockedOut,
    unlock,
    switchToPassword,
  };
}
