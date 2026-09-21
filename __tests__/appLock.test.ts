import {
  EXTERNAL_UI_GRACE_MS,
  hasPendingReturn,
  isLockSuppressed,
  noteLeftForeground,
  resetAppLockForTests,
  resolveReturn,
  withoutAppLock,
} from "@/services/appLock";
import { hasSession, signOut } from "@/services/session";
import { prefs } from "@/services/storage";

jest.mock("@/services/session", () => ({ hasSession: jest.fn(), signOut: jest.fn() }));
jest.mock("@/services/storage", () => ({
  PrefKeys: { biometricEnabled: "biometric_enabled" },
  prefs: { getBool: jest.fn() },
}));

const T0 = 1_000_000;

function setup({ signedIn = true, biometric = false }: { signedIn?: boolean; biometric?: boolean }) {
  (hasSession as jest.Mock).mockResolvedValue(signedIn);
  (prefs.getBool as jest.Mock).mockResolvedValue(biometric);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  resetAppLockForTests();
});

describe("leaving the app and coming back", () => {
  it("does nothing if the app never left the foreground", async () => {
    setup({ biometric: true });
    await expect(resolveReturn(T0)).resolves.toBe("none");
  });

  it("locks straight away when biometrics are on - even after a single second (they take priority)", async () => {
    setup({ biometric: true });
    noteLeftForeground(T0);
    await expect(resolveReturn(T0 + 1000)).resolves.toBe("lock");
    expect(signOut).not.toHaveBeenCalled(); // the session stays; it only has to be proven again
  });

  it("without biometrics, ends the session and asks for the login again", async () => {
    setup({ biometric: false });
    noteLeftForeground(T0);
    await expect(resolveReturn(T0 + 1000)).resolves.toBe("logout");
    // A sign-out the user did not choose must not re-ask "enable biometrics?" on every login.
    expect(signOut).toHaveBeenCalledWith({ keepBiometricPrompt: true });
  });

  it("does nothing when nobody is signed in", async () => {
    setup({ signedIn: false, biometric: true });
    noteLeftForeground(T0);
    await expect(resolveReturn(T0 + 60_000)).resolves.toBe("none");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("decides once per trip: the pending state is cleared by resolveReturn", async () => {
    setup({ biometric: true });
    noteLeftForeground(T0);
    expect(hasPendingReturn()).toBe(true);
    await resolveReturn(T0 + 10);
    expect(hasPendingReturn()).toBe(false);
    await expect(resolveReturn(T0 + 20)).resolves.toBe("none");
  });

  it("keeps the FIRST timestamp when the background event repeats", async () => {
    setup({ biometric: true });
    // The trip starts as an external UI (grace applies); a repeat event must not restart the clock.
    await withoutAppLock(async () => noteLeftForeground(T0));
    noteLeftForeground(T0 + EXTERNAL_UI_GRACE_MS - 1000);
    await expect(resolveReturn(T0 + EXTERNAL_UI_GRACE_MS + 1)).resolves.toBe("lock");
  });
});

describe("the app's own system UIs (picker, browser, dialer, biometric prompt)", () => {
  it("returning from one within the grace period does not lock", async () => {
    setup({ biometric: true });
    await withoutAppLock(async () => noteLeftForeground(T0));
    await expect(resolveReturn(T0 + 30_000)).resolves.toBe("none");
  });

  it("but a long trip does lock, so a phone left on a browser tab does not stay open", async () => {
    setup({ biometric: true });
    await withoutAppLock(async () => noteLeftForeground(T0));
    await expect(resolveReturn(T0 + EXTERNAL_UI_GRACE_MS)).resolves.toBe("lock");
  });

  it("and without biometrics a long trip signs out", async () => {
    setup({ biometric: false });
    await withoutAppLock(async () => noteLeftForeground(T0));
    await expect(resolveReturn(T0 + EXTERNAL_UI_GRACE_MS + 5000)).resolves.toBe("logout");
  });

  it("suppression lasts for the call plus a short tail (Android reports 'active' a beat late)", async () => {
    jest.useFakeTimers();
    expect(isLockSuppressed()).toBe(false);

    const result = withoutAppLock(async () => {
      expect(isLockSuppressed()).toBe(true);
      return 42;
    });
    await expect(result).resolves.toBe(42);
    expect(isLockSuppressed()).toBe(true); // still covers the late 'active' event

    jest.advanceTimersByTime(1500);
    expect(isLockSuppressed()).toBe(false);
  });

  it("releases suppression even when the system UI call throws", async () => {
    jest.useFakeTimers();
    await expect(
      withoutAppLock(async () => {
        throw new Error("no dialer");
      }),
    ).rejects.toThrow("no dialer");
    jest.advanceTimersByTime(1500);
    expect(isLockSuppressed()).toBe(false);
  });
});
