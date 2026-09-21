import { revokeRefreshToken } from "@/services/auth";
import { chatRealtime } from "@/services/chatRealtime";
import { hasSession, signOut } from "@/services/session";
import { clearSession, secure } from "@/services/storage";

jest.mock("@/services/storage", () => ({
  SecureKeys: { authToken: "auth_token", refreshToken: "refresh_token" },
  secure: { get: jest.fn() },
  clearSession: jest.fn(),
}));
jest.mock("@/services/auth", () => ({ revokeRefreshToken: jest.fn() }));
jest.mock("@/services/chatRealtime", () => ({ chatRealtime: { disconnect: jest.fn() } }));
jest.mock("@/services/tokenRefresh", () => ({ refreshAccessToken: jest.fn() }));

function storedTokens(token: string | null) {
  (secure.get as jest.Mock).mockImplementation(async (key: string) => (key === "auth_token" ? token : "refresh-1"));
}

beforeEach(() => jest.clearAllMocks());

describe("hasSession", () => {
  it("reflects the stored access token", async () => {
    storedTokens("jwt");
    await expect(hasSession()).resolves.toBe(true);
    storedTokens(null);
    await expect(hasSession()).resolves.toBe(false);
  });
});

describe("signOut", () => {
  it("captures the refresh token before wiping storage, and stops the chat socket", async () => {
    storedTokens("jwt");
    await signOut();
    expect(revokeRefreshToken).toHaveBeenCalledWith("refresh-1");
    expect(chatRealtime.disconnect).toHaveBeenCalled();
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it("passes the keepBiometricPrompt option through to clearSession", async () => {
    storedTokens("jwt");
    await signOut({ keepBiometricPrompt: true });
    expect(clearSession).toHaveBeenCalledWith({ keepBiometricPrompt: true });
  });
});
