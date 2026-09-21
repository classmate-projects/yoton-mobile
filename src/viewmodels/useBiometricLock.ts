import { useCallback, useEffect, useRef, useState } from "react";

import type { ScanPhase } from "@/components/HolographicFaceScan";
import { authenticateWithBiometrics } from "@/services/biometrics";
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

// The lock screen shown when the session needs proving again: on a cold start with biometrics on,
// and whenever the app is brought back after being left. (Port of the MAUI BiometricLockViewModel,
// plus the Face Lock presentation.)
export function useBiometricLock() {
  const [userName, setUserName] = useState("Patient User");
  const [statusMessage, setStatusMessage] = useState("Use Face ID or your fingerprint to continue");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  // null until the preference has been read, so the screen never flashes the wrong presentation.
  const [isFaceLock, setIsFaceLock] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<ScanPhase>("searching");
  const failedAttempts = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    void Promise.all([
      prefs.getString(PrefKeys.userName, "Patient User"),
      prefs.getBool(PrefKeys.faceLockEnabled, false),
    ]).then(([name, face]) => {
      setUserName(name);
      setIsFaceLock(face);
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

  const unlock = useCallback(async () => {
    if (busy.current || isLockedOut) return;
    busy.current = true;
    setIsAuthenticating(true);

    try {
      const face = await prefs.getBool(PrefKeys.faceLockEnabled, false);
      setIsFaceLock(face);

      if (face) {
        setPhase("searching");
        setStatusMessage("Look at the camera");
        await delay(failedAttempts.current === 0 ? SEARCH_MS : RETRY_SEARCH_MS);
        setPhase("scanning");
        setStatusMessage("Hold still…");
      } else {
        setStatusMessage("Verifying...");
      }

      // The decision is always the phone's own biometric; the animation only follows its result.
      const result = await authenticateWithBiometrics();

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

      if (face) setPhase("failed");
      await registerFailedAttempt(result.message);
    } finally {
      busy.current = false;
      setIsAuthenticating(false);
    }
  }, [isLockedOut, registerFailedAttempt]);

  return {
    userName,
    statusMessage,
    isAuthenticating,
    isLockedOut,
    isFaceLock,
    phase,
    canUnlock: !isAuthenticating && !isLockedOut,
    unlock,
    switchToPassword,
  };
}
