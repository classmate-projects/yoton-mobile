import { hasSession, signOut } from "./session";
import { prefs, PrefKeys } from "./storage";

// "Leave the app, and it asks for you again."
//
// The moment the app leaves the foreground (minimised, switched away from, closed), the session is
// treated as unattended. When the user comes back:
//   - with biometric unlock on (fingerprint / Face ID / Face Lock) -> straight to the lock screen;
//     the session is intact, it just needs proving it's still them (biometrics have priority);
//   - otherwise -> the session is ended (refresh token revoked) and the login form is shown.
// A cold start after the app was closed follows the same two branches (see app/index.tsx).

export type ResumeAction = "none" | "lock" | "logout";

// Some of the app's own features hand the screen to the system for a moment: the document picker,
// an in-app browser tab, the dialer, a permission dialog, the biometric prompt itself. Coming back
// from those must not count as "the user left" - so they run inside withoutAppLock().
let suppressDepth = 0;
// Android reports the app as active again slightly *after* the system UI's promise resolves, so the
// suppression outlives the call by a beat.
const SUPPRESS_TAIL_MS = 1200;

export function isLockSuppressed(): boolean {
  return suppressDepth > 0;
}

export async function withoutAppLock<T>(work: () => Promise<T>): Promise<T> {
  suppressDepth += 1;
  try {
    return await work();
  } finally {
    setTimeout(() => {
      suppressDepth = Math.max(0, suppressDepth - 1);
    }, SUPPRESS_TAIL_MS);
  }
}

// A trip to a system UI the user started themselves (reading a lab report in the browser, making a
// call) is allowed to last a while, but not forever: past this the app locks as usual, so a phone
// left on a browser tab or dialer doesn't leave the session open indefinitely.
export const EXTERNAL_UI_GRACE_MS = 5 * 60 * 1000;

interface Away {
  at: number;
  external: boolean;
}

let away: Away | null = null;

/** Call when the app goes to the background. */
export function noteLeftForeground(now = Date.now()): void {
  if (away) return; // Already away (repeated events) - keep the first timestamp.
  away = { at: now, external: isLockSuppressed() };
}

/** True between leaving the foreground and having decided what to do about it. */
export function hasPendingReturn(): boolean {
  return away !== null;
}

/** Whether biometric unlock (any flavour) is switched on and so gets priority over a password. */
export async function isQuickUnlockEnabled(): Promise<boolean> {
  return prefs.getBool(PrefKeys.biometricEnabled, false);
}

// Decides what coming back to the foreground should do. Performs the sign-out itself when that's
// the outcome, so callers only have to navigate.
export async function resolveReturn(now = Date.now()): Promise<ResumeAction> {
  const left = away;
  away = null;
  if (!left) return "none";
  if (left.external && now - left.at < EXTERNAL_UI_GRACE_MS) return "none";
  if (!(await hasSession())) return "none"; // Not signed in - nothing to protect.

  if (await isQuickUnlockEnabled()) return "lock";

  // No lighter-weight re-auth is available, so the session is over: revoke the refresh token
  // server-side and require a full login rather than leaving a dangling authenticated screen.
  await signOut({ keepBiometricPrompt: true });
  return "logout";
}

/** Test hook: forget all state. */
export function resetAppLockForTests(): void {
  suppressDepth = 0;
  away = null;
}
