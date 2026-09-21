import { ApiHttpError, api } from "@/api/client";
import { secure } from "@/services/storage";
import { refreshAccessToken } from "@/services/tokenRefresh";

jest.mock("@/services/storage", () => ({
  SecureKeys: { authToken: "auth_token", refreshToken: "refresh_token" },
  secure: { get: jest.fn(), set: jest.fn(), remove: jest.fn(), clear: jest.fn() },
}));
jest.mock("@/services/tokenRefresh", () => ({ refreshAccessToken: jest.fn() }));

const fetchMock = jest.fn();
const secureGet = secure.get as jest.Mock;
const refresh = refreshAccessToken as jest.Mock;

const respond = (status: number, body?: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new SyntaxError("Unexpected end of JSON input")) : Promise.resolve(body)),
  });

const bearerOf = (call: number) => (fetchMock.mock.calls[call][1].headers as Record<string, string>).Authorization;

beforeEach(() => {
  jest.resetAllMocks();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
  secureGet.mockResolvedValue("old-token");
});

describe("api client", () => {
  it("sends the stored bearer token", async () => {
    fetchMock.mockReturnValueOnce(respond(200, { data: 1 }));

    await expect(api.get("/api/patient/me")).resolves.toEqual({ data: 1 });
    expect(bearerOf(0)).toBe("Bearer old-token");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/patient\/me$/);
  });

  it("on 401 refreshes once and retries with the new token", async () => {
    fetchMock.mockReturnValueOnce(respond(401)).mockReturnValueOnce(respond(200, { ok: true }));
    refresh.mockResolvedValueOnce("new-token");

    await expect(api.get("/api/patient/me")).resolves.toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bearerOf(1)).toBe("Bearer new-token");
  });

  it("gives up (401) when the refresh fails, without looping", async () => {
    fetchMock.mockReturnValueOnce(respond(401));
    refresh.mockResolvedValueOnce(null);

    await expect(api.get("/api/patient/me")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not refresh for calls flagged skipAuthRefresh (login)", async () => {
    fetchMock.mockReturnValueOnce(respond(401, { message: "Invalid login" }));

    const result = await api.postDetailed("/api/auth/login", {}, { skipAuthRefresh: true });
    expect(result).toEqual({ ok: false, status: 401, body: { message: "Invalid login" } });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("post() resolves null on a non-success status; postForResult() still returns the body", async () => {
    fetchMock.mockReturnValueOnce(respond(400, { status: false, message: "Slot already booked" }));
    await expect(api.post("/x", {})).resolves.toBeNull();

    fetchMock.mockReturnValueOnce(respond(400, { status: false, message: "Slot already booked" }));
    await expect(api.postForResult("/x", {})).resolves.toEqual({ status: false, message: "Slot already booked" });
  });

  it("copes with an empty body (e.g. a rate-limit response) instead of throwing a JSON error", async () => {
    fetchMock.mockReturnValueOnce(respond(429));
    await expect(api.postDetailed("/api/auth/login", {}, { skipAuthRefresh: true })).resolves.toEqual({
      ok: false,
      status: 429,
      body: null,
    });

    fetchMock.mockReturnValueOnce(respond(200));
    await expect(api.get("/x")).rejects.toBeInstanceOf(ApiHttpError);
  });

  it("get() throws ApiHttpError on failure statuses", async () => {
    fetchMock.mockReturnValueOnce(respond(500));
    await expect(api.get("/x")).rejects.toMatchObject({ name: "ApiHttpError", status: 500 });
  });
});
