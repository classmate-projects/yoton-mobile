import { API_BASE_URL } from "@/config/env";
import { secure, SecureKeys } from "@/services/storage";
import { refreshAccessToken } from "@/services/tokenRefresh";

// 100s, matching the MAUI HttpClient default. The hosted API runs on a free tier that can take
// ~60s to wake from sleep, so anything much shorter would fail the first request after idle.
const REQUEST_TIMEOUT_MS = 100_000;

export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    message?: string,
  ) {
    super(message ?? `Request failed with status ${status}`);
    this.name = "ApiHttpError";
  }
}

export interface UploadFile {
  /** Local file URI from the document picker. */
  uri: string;
  name: string;
  mimeType?: string | null;
}

interface RequestOptions {
  method: "GET" | "POST";
  body?: BodyInit;
  headers?: Record<string, string>;
  /** Login/revoke calls never trigger a refresh-and-retry on 401. */
  skipAuthRefresh?: boolean;
}

async function send(url: string, options: RequestOptions, token: string | null): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${url}`, {
      method: options.method,
      body: options.body,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        // Identifies every request (login included) as coming from this app, not the web
        // client - the API scopes its single-active-session enforcement to this header, so
        // a new sign-in here ends this account's other mobile sessions without ever
        // touching a web session (see RefreshTokenService.IssueAsync on the API side).
        "X-Client-Platform": "mobile",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

// Every call transparently survives an expired access token (they're short-lived by design):
// a 401 triggers one refresh via the stored refresh token, then the request is retried once
// with the new access token - the same behaviour as the MAUI AuthRefreshHandler.
async function request(url: string, options: RequestOptions): Promise<Response> {
  const token = await secure.get(SecureKeys.authToken);
  const response = await send(url, options, token);

  if (response.status !== 401 || options.skipAuthRefresh) return response;

  const refreshed = await refreshAccessToken();
  if (!refreshed) return response;

  return send(url, options, refreshed);
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

const jsonBody = (data: unknown): RequestOptions["body"] => JSON.stringify(data);
const JSON_HEADERS = { "Content-Type": "application/json" };

export const api = {
  /** GET that throws on any non-success status. */
  async get<T>(url: string): Promise<T> {
    const response = await request(url, { method: "GET" });
    if (!response.ok) throw new ApiHttpError(response.status);
    const data = await readJson<T>(response);
    if (data == null) throw new ApiHttpError(response.status, "Empty or invalid response");
    return data;
  },

  /** POST that resolves to null when the server answers with a non-success status. */
  async post<T>(
    url: string,
    data: unknown,
    options: { skipAuthRefresh?: boolean } = {},
  ): Promise<T | null> {
    const response = await request(url, {
      method: "POST",
      body: jsonBody(data),
      headers: JSON_HEADERS,
      skipAuthRefresh: options.skipAuthRefresh,
    });
    if (!response.ok) return null;
    return readJson<T>(response);
  },

  /**
   * POST that reports the status alongside the parsed body, for callers (login) that need to
   * tell "wrong password" (401) from "too many attempts" (429) or a server problem (5xx).
   */
  async postDetailed<T>(
    url: string,
    data: unknown,
    options: { skipAuthRefresh?: boolean } = {},
  ): Promise<{ ok: boolean; status: number; body: T | null }> {
    const response = await request(url, {
      method: "POST",
      body: jsonBody(data),
      headers: JSON_HEADERS,
      skipAuthRefresh: options.skipAuthRefresh,
    });
    return { ok: response.ok, status: response.status, body: await readJson<T>(response) };
  },

  /**
   * Unlike post(), always tries to parse the response body whatever the status, so business-rule
   * failures (a "slot already booked" message, a 400 validation reason) reach the caller instead
   * of collapsing into a generic null.
   */
  async postForResult<T>(url: string, data: unknown): Promise<T | null> {
    const response = await request(url, { method: "POST", body: jsonBody(data), headers: JSON_HEADERS });
    return readJson<T>(response);
  },

  /**
   * multipart/form-data POST for endpoints that take file attachments next to plain fields
   * (chat messages with attachments). Field names are matched case-insensitively by ASP.NET's
   * form binder. Content-Type is left unset so fetch adds the multipart boundary itself.
   */
  async postMultipart<T>(
    url: string,
    fields: Record<string, string>,
    files: UploadFile[] = [],
  ): Promise<T | null> {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value ?? "");
    for (const file of files) {
      // React Native's FormData takes a { uri, name, type } descriptor rather than a Blob.
      form.append("files", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? "application/octet-stream",
      } as unknown as Blob);
    }
    const response = await request(url, { method: "POST", body: form });
    return readJson<T>(response);
  },
};
