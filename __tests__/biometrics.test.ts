import * as LocalAuthentication from "expo-local-authentication";

import { authenticateWithBiometrics, hasFaceRecognition, hasFingerprintSensor } from "@/services/biometrics";

jest.mock("expo-local-authentication", () => ({
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
}));
// The prompt is wrapped so that its trip out of the foreground isn't taken for the user leaving.
jest.mock("@/services/appLock", () => ({ withoutAppLock: (work: () => Promise<unknown>) => work() }));

const supported = LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock;
const authenticate = LocalAuthentication.authenticateAsync as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("what the phone can check", () => {
  it("a fingerprint-only phone (like the emulator) cannot do Face Lock but can offer a fingerprint", async () => {
    supported.mockResolvedValue([1]);
    await expect(hasFaceRecognition()).resolves.toBe(false);
    await expect(hasFingerprintSensor()).resolves.toBe(true);
  });

  it("an iPhone with Face ID has a face check and no fingerprint to offer", async () => {
    supported.mockResolvedValue([2]);
    await expect(hasFaceRecognition()).resolves.toBe(true);
    await expect(hasFingerprintSensor()).resolves.toBe(false);
  });

  it("an Android phone with both offers the face check and the fingerprint as an alternative", async () => {
    supported.mockResolvedValue([1, 2]);
    await expect(hasFaceRecognition()).resolves.toBe(true);
    await expect(hasFingerprintSensor()).resolves.toBe(true);
  });

  it("treats a failing capability query as 'no'", async () => {
    supported.mockRejectedValue(new Error("no hardware"));
    await expect(hasFaceRecognition()).resolves.toBe(false);
    await expect(hasFingerprintSensor()).resolves.toBe(false);
  });
});

describe("authenticateWithBiometrics", () => {
  it("words the prompt for the chosen check", async () => {
    authenticate.mockResolvedValue({ success: true });

    await authenticateWithBiometrics("face");
    expect(authenticate.mock.calls[0][0].promptDescription).toBe("Look at the camera to continue");

    await authenticateWithBiometrics("fingerprint");
    expect(authenticate.mock.calls[1][0].promptDescription).toBe("Touch the fingerprint sensor to continue");

    await authenticateWithBiometrics();
    expect(authenticate.mock.calls[2][0].promptDescription).toBe("Use your fingerprint or face to continue");
  });

  it("never falls back to the device PIN - the app's own 'Use password instead' is the fallback", async () => {
    authenticate.mockResolvedValue({ success: true });
    await authenticateWithBiometrics("face");
    expect(authenticate.mock.calls[0][0]).toMatchObject({ disableDeviceFallback: true, biometricsSecurityLevel: "weak" });
  });

  it("reports success, and tells a cancel apart from a real failure", async () => {
    authenticate.mockResolvedValueOnce({ success: true });
    await expect(authenticateWithBiometrics()).resolves.toEqual({ success: true });

    authenticate.mockResolvedValueOnce({ success: false, error: "user_cancel" });
    await expect(authenticateWithBiometrics()).resolves.toMatchObject({ success: false, cancelled: true, message: "Cancelled" });

    authenticate.mockResolvedValueOnce({ success: false, error: "authentication_failed" });
    await expect(authenticateWithBiometrics()).resolves.toMatchObject({ success: false, cancelled: false, message: "Couldn't verify" });

    authenticate.mockResolvedValueOnce({ success: false, error: "lockout" });
    await expect(authenticateWithBiometrics()).resolves.toMatchObject({
      success: false,
      cancelled: false,
      message: "Biometrics are temporarily locked",
    });
  });

  it("survives the native call throwing", async () => {
    authenticate.mockRejectedValue(new Error("boom"));
    await expect(authenticateWithBiometrics()).resolves.toEqual({ success: false, message: null, cancelled: false });
  });
});
