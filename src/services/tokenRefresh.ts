import { API_BASE_URL } from "@/config/env";
import { Endpoints } from "@/api/endpoints";

import { secure, SecureKeys } from "./storage";

// Shared by the HTTP client (reactive: retries a request that just came back 401) and the
// proactive background timer in session.ts (keeps the stored token fresh so the long-lived
// SignalR connection - which reads the token lazily, only when it (re)connects - never hands
// the server one that already expired while the socket sat healthy and idle).

// A single in-flight refresh is shared by every caller (concurrent 401s, or a 401 racing the
// proactive timer). The API accepts a given refresh token only once (rotation), so a second
// concurrent call with the same token would just fail and log the user out for no reason.
let inFlight: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!inFlight) {
    inFlight = performRefresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function performRefresh(): Promise<string | null> {
  const refreshToken = await secure.get(SecureKeys.refreshToken);
  if (!refreshToken) return null;

  try {
    // A plain fetch, not the API client: going through the client would re-enter its 401
    // handling and loop if this call itself came back 401.
    const response = await fetch(`${API_BASE_URL}${Endpoints.auth.refreshToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Only a definitive rejection (expired / revoked / already-used token) ends the session.
      // A rate limit or a server hiccup - e.g. a sleeping free-tier API waking up - says
      // nothing about the token, so it's kept and the next attempt can still succeed.
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        await secure.clear();
      }
      return null;
    }

    const result = (await response.json()) as { token?: string; refreshToken?: string };
    if (!result?.token) return null;

    await secure.set(SecureKeys.authToken, result.token);
    if (result.refreshToken) await secure.set(SecureKeys.refreshToken, result.refreshToken);

    return result.token;
  } catch {
    // Offline / unreachable - leave the stored tokens alone so a retry once connectivity
    // returns can still succeed instead of forcing a fresh login.
    return null;
  }
}
