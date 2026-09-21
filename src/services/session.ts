import { revokeRefreshToken } from "./auth";
import { chatRealtime } from "./chatRealtime";
import { secure, SecureKeys, clearSession } from "./storage";
import { refreshAccessToken } from "./tokenRefresh";

// Session plumbing that used to live in the MAUI app's App.xaml.cs: signing out, and the proactive
// token refresh loop. (When to lock / sign out on leaving the app is in appLock.ts.)

const PROACTIVE_REFRESH_INTERVAL_MS = 20 * 60 * 1000;

export async function hasSession(): Promise<boolean> {
  return !!(await secure.get(SecureKeys.authToken));
}

// The chat socket only reads the access token lazily, at (re)connect time - a healthy socket
// never reconnects, so nothing else notices the token going stale underneath it (30 minutes on
// the API by default). If that socket later drops, the reconnect would hand the server an
// already-dead token with no way to recover. Refreshing on a timer, independent of any REST call
// or foreground/background transition, keeps a valid token in storage for that moment.
export function startProactiveTokenRefresh(): () => void {
  const timer = setInterval(async () => {
    if (!(await hasSession())) return; // Not signed in - nothing to refresh.
    await refreshAccessToken();
  }, PROACTIVE_REFRESH_INTERVAL_MS);
  return () => clearInterval(timer);
}

// Ends the session on this device: revokes the refresh token server-side (fire-and-forget - it
// must never block navigation), stops the chat connection so the next account can't inherit it,
// and wipes tokens and cached profile. `keepBiometricPrompt` is for sign-outs the user didn't ask
// for (see clearSession).
export async function signOut(options: { keepBiometricPrompt?: boolean } = {}): Promise<void> {
  const refreshToken = await secure.get(SecureKeys.refreshToken);
  void revokeRefreshToken(refreshToken);
  void chatRealtime.disconnect();
  await clearSession(options);
}
