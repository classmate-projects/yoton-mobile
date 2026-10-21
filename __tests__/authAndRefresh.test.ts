import { api } from "@/api/client";
import { login } from "@/services/auth";
import { prefs, secure } from "@/services/storage";
import { refreshAccessToken } from "@/services/tokenRefresh";

jest.mock("@/api/client", () => ({ api: { postDetailed: jest.fn(), post: jest.fn() } }));
jest.mock("@/services/storage", () => ({
  SecureKeys: { authToken: "auth_token", refreshToken: "refresh_token" },
  PrefKeys: { currencySymbol: "currency_symbol" },
  secure: { get: jest.fn(), set: jest.fn(), clear: jest.fn() },
  prefs: { setString: jest.fn() },
}));

const postDetailed = api.postDetailed as jest.Mock;
const fetchMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

describe("login()", () => {
  it("stores tokens in secure storage and the currency symbol in prefs", async () => {
    postDetailed.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: { token: "jwt", refreshToken: "rt", role: "Patient", name: "P", currencySymbol: "$" },
    });

    const outcome = await login("patient1@example.com", "patient1");

    expect(outcome.kind).toBe("success");
    expect(secure.set).toHaveBeenCalledWith("auth_token", "jwt");
    expect(secure.set).toHaveBeenCalledWith("refresh_token", "rt");
    expect(prefs.setString).toHaveBeenCalledWith("currency_symbol", "$");
    // Login must never trigger a refresh-and-retry on 401.
    expect(postDetailed.mock.calls[0][2]).toEqual({ skipAuthRefresh: true });
  });

  it("stores no currency symbol (rather than guessing one) when the server omits it", async () => {
    postDetailed.mockResolvedValueOnce({ ok: true, status: 200, body: { token: "jwt", role: "Patient", name: "P" } });
    await login("a", "b");
    expect(prefs.setString).toHaveBeenCalledWith("currency_symbol", "");
  });

  it("reports a system that hasn't been set up yet with the server's message", async () => {
    postDetailed.mockResolvedValueOnce({ ok: false, status: 423, body: { code: "SYSTEM_UNCONFIGURED", message: "Not set up" } });
    await expect(login("a", "b")).resolves.toEqual({ kind: "unconfigured", message: "Not set up" });

    postDetailed.mockResolvedValueOnce({ ok: false, status: 423, body: null });
    await expect(login("a", "b")).resolves.toMatchObject({ kind: "unconfigured" });

    expect(secure.set).not.toHaveBeenCalled();
  });

  it("distinguishes a wrong password, rate limiting and a server error", async () => {
    postDetailed.mockResolvedValueOnce({ ok: false, status: 401, body: { message: "Invalid login" } });
    await expect(login("a", "b")).resolves.toEqual({ kind: "invalid" });

    postDetailed.mockResolvedValueOnce({ ok: false, status: 429, body: { message: "Slow down" } });
    await expect(login("a", "b")).resolves.toEqual({ kind: "rate-limited", message: "Slow down" });

    postDetailed.mockResolvedValueOnce({ ok: false, status: 429, body: null });
    await expect(login("a", "b")).resolves.toMatchObject({ kind: "rate-limited" });

    postDetailed.mockResolvedValueOnce({ ok: false, status: 503, body: null });
    await expect(login("a", "b")).resolves.toEqual({ kind: "error" });

    expect(secure.set).not.toHaveBeenCalled();
  });
});

describe("refreshAccessToken()", () => {
  const stored = (refreshToken: string | null) => (secure.get as jest.Mock).mockResolvedValue(refreshToken);
  const reply = (status: number, body?: unknown) =>
    fetchMock.mockResolvedValueOnce({ ok: status < 300, status, json: async () => body });

  it("rotates and stores both tokens", async () => {
    stored("rt-1");
    reply(200, { token: "jwt-2", refreshToken: "rt-2" });

    await expect(refreshAccessToken()).resolves.toBe("jwt-2");
    expect(secure.set).toHaveBeenCalledWith("auth_token", "jwt-2");
    expect(secure.set).toHaveBeenCalledWith("refresh_token", "rt-2");
  });

  it("does nothing without a stored refresh token", async () => {
    stored(null);
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([400, 401, 403])("ends the session on a definitive %i rejection", async (status) => {
    stored("rt-1");
    reply(status, {});
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(secure.clear).toHaveBeenCalled();
  });

  it.each([429, 500, 503])("keeps the tokens on a transient %i", async (status) => {
    stored("rt-1");
    reply(status, {});
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(secure.clear).not.toHaveBeenCalled();
  });

  it("keeps the tokens when offline", async () => {
    stored("rt-1");
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(secure.clear).not.toHaveBeenCalled();
  });

  it("shares one in-flight refresh between concurrent callers (refresh tokens are single-use)", async () => {
    stored("rt-1");
    reply(200, { token: "jwt-2", refreshToken: "rt-2" });

    const [a, b, c] = await Promise.all([refreshAccessToken(), refreshAccessToken(), refreshAccessToken()]);
    expect([a, b, c]).toEqual(["jwt-2", "jwt-2", "jwt-2"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
