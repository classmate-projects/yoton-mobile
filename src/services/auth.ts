import { api } from "@/api/client";
import { Endpoints } from "@/api/endpoints";
import type { LoginResponse } from "@/api/types";

import { prefs, PrefKeys, secure, SecureKeys } from "./storage";

export type LoginOutcome =
  | { kind: "success"; user: LoginResponse }
  | { kind: "invalid" }
  | { kind: "rate-limited"; message: string }
  | { kind: "error" };

const RATE_LIMITED_FALLBACK = "Too many attempts. Please try again in a few minutes.";

// Network failures (offline, timeout) throw out of api.postDetailed and are handled by the
// caller; every HTTP-level outcome comes back as a LoginOutcome.
export async function login(emailOrUserName: string, password: string): Promise<LoginOutcome> {
  const { ok, status, body } = await api.postDetailed<LoginResponse & { message?: string }>(
    Endpoints.auth.login,
    { emailOrUserName, password },
    { skipAuthRefresh: true },
  );

  if (status === 429) return { kind: "rate-limited", message: body?.message ?? RATE_LIMITED_FALLBACK };
  if (!ok || !body?.token) return status === 400 || status === 401 ? { kind: "invalid" } : { kind: "error" };

  // Tokens go into encrypted, OS-backed storage, never plain preferences (which are
  // unencrypted and included in Android backups).
  await secure.set(SecureKeys.authToken, body.token);
  if (body.refreshToken) await secure.set(SecureKeys.refreshToken, body.refreshToken);

  // Admin-configurable in the web app's Settings > Company settings. Stored so the Records
  // screen can render bill amounts without hardcoding a currency symbol.
  await prefs.setString(PrefKeys.currencySymbol, body.currencySymbol ?? "₹");

  return { kind: "success", user: body };
}

// Revokes the refresh token server-side so a copy left on a lost or stolen device can't keep
// renewing sessions after an explicit sign-out. Takes the raw token rather than reading it
// itself: callers fire this without awaiting and immediately wipe local storage, so a read
// here would race that clear.
export async function revokeRefreshToken(refreshToken: string | null | undefined): Promise<void> {
  if (!refreshToken) return;
  try {
    await api.post(Endpoints.auth.revokeToken, { refreshToken }, { skipAuthRefresh: true });
  } catch {
    // Offline / unreachable - the token simply expires on its own instead.
  }
}
