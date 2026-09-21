<div align="center">

# Yoton Mobile

**The patient's pocket portal into their care.**

Book appointments · read lab results & prescriptions · chat with your care team — securely, from your phone.

![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Platforms](https://img.shields.io/badge/platforms-Android%20%7C%20iOS-0A6CFF)

</div>

---

Yoton Mobile is the patient-facing app of **Yoton** — a Hospital / Clinic Management System with a built-in Electronic Medical Record (EMR). Where [`yoton-web`](../yoton-web) is the staff portal (reception, doctors, nurses, lab, pharmacy, billing), this app is the patient's own window into their care. It talks to the [`yoton-api`](../yoton-api) ASP.NET Core backend — the same API the web portal uses.

> **Independent repository.** The API, the web portal and this app live in separate Git repositories and are versioned on their own.
>
> **Migrated from .NET MAUI.** This project started life as a .NET MAUI app and was rewritten in React Native (Expo + TypeScript) with feature parity. The MAUI sources remain available in this repository's Git history (up to commit `21a74d0`).

---

## What it does

Sign-in is restricted to **patient** accounts — clinic staff are pointed at the web portal instead.

| Screen | Capability |
|---|---|
| **Splash / Welcome** | Branded logo-reveal launch animation; returning biometric users go straight to the lock screen, everyone else to onboarding |
| **Login** | Email / username + password. Detects a still-temporary password and offers to jump to the web app's reset flow; offers Face ID / fingerprint enrolment after the first successful login; distinguishes *wrong password*, *too many attempts* and *can't reach the server* |
| **Biometric lock** | Shown whenever the app is opened again or brought back after being left: Face ID / fingerprint re-authentication, with a password fallback after 3 failed attempts. With **Face Lock** on, the face is checked first, behind a holographic "identifying your face" scan on the live front camera; the fingerprint is only a choice ("Use fingerprint instead") and its prompt opens only when picked |
| **Home** | Greeting, a carousel of upcoming appointments, active medications (built from real prescriptions — never fabricated data) and quick services |
| **Appointments** | Upcoming & past visits. Self-service booking: browse doctors by department, rank up to 3 preferred doctors, pick a date, see live slot availability (auto-falls back to the next preferred doctor) and send a request. Past visits show the doctor's recorded consultation notes. A one-time "appointment confirmed" nudge fires when the clinic confirms a request |
| **Records** | Active prescriptions (dose, frequency, days remaining), lab & radiology results with status-aware messages and openable reports, and itemised bills (view-only) |
| **Messages** | Conversations with the care team and the shared Reception inbox, with live online presence and unread counts. Doctors with no thread yet are one tap away |
| **Chat thread** | Real-time 1:1 chat over SignalR — text, file attachments (5 MB), reply-to, emoji reactions, typing indicator, read receipts |
| **Patient Perspective** | Mood, pain (with location), water and step trackers plus a symptom journal. Session-local today; the UI says so |
| **Support** | Clinic contact card with tap-to-call, and a care-circle list |
| **Settings** | Profile, dark mode (remembered across launches), notification, biometric and **Face Lock** switches, version, logout |

### Device-level behaviour

| Concern | Behaviour |
|---|---|
| **Screenshots & screen recording** | Blocked app-wide on Android (`FLAG_SECURE`) and iOS (secure-view); the Recents / app-switcher preview is hidden or blurred. iOS also shows a toast if a screenshot is attempted |
| **Token storage** | Access & refresh tokens live in the OS Keystore / Keychain (`expo-secure-store`), never in plain preferences. Android backups are disabled |
| **Lock on leave** | Minimising, switching away from or closing the app ends the attended session. Coming back: if biometric unlock is on (fingerprint, Face ID or Face Lock) it has priority and shows the lock screen with the session intact; otherwise the refresh token is revoked and the login form is shown. A cold start does the same. While the app isn't in the foreground a plain screen covers the content. The app's own system screens (document picker, browser tab, dialer, permission dialogs, the biometric prompt) are exempt for up to 5 minutes |
| **Token refresh** | Access tokens refresh transparently (single-flight, rotating refresh tokens) and proactively every 20 min |
| **Biometrics** | Face ID / fingerprint via `expo-local-authentication`; the app's own "Use password instead" is the fallback (no device-PIN bypass) |
| **Face Lock** | An optional way of presenting biometric unlock, **offered only on phones with real face unlock** (Face ID, or an Android face unlock). The lock screen shows the live front camera in a holographic scanner (rotating rings, sweeping beam, wireframe mesh, landmark nodes, progress arc, green burst on success / red shake on failure) and starts the phone's face check by itself. If the phone also has a fingerprint reader, a **Use fingerprint instead** button appears; the fingerprint check (and its prompt) only starts when the user taps it, and the camera is released while it runs. It is presentation only: **the unlock decision is made by the phone's own biometric**, so a photo can't fool it. The camera is a live preview only - nothing is recorded, stored or sent - and the camera permission is optional (without it the scan runs without the video) |
| **Keyboard** | Forms lift above the soft keyboard on both platforms (Android 15 apps are edge-to-edge, which no longer resizes the window, so the app handles it), and the floating tab bar steps aside while typing. Tap outside to dismiss |
| **Back button (Android)** | On Home, first press shows *"Press back again to exit"*, second exits; everywhere else back behaves normally |
| **Theming** | Light / dark following the OS, with an in-app override that persists |
| **Logging** | Errors are written to a size-capped `app_log.txt` in the app's document directory |

---

## Tech stack

- **Framework:** [Expo](https://expo.dev) SDK 57 (React Native 0.86, React 19) with [Expo Router](https://docs.expo.dev/router/introduction/) file-based navigation
- **Language:** TypeScript (`strict`)
- **State / MVVM:** one custom hook per screen in `src/viewmodels/` (the direct equivalent of the old MAUI view models)
- **Real-time:** `@microsoft/signalr` (`/chat-hub`)
- **Storage:** `expo-secure-store` (tokens) · `@react-native-async-storage/async-storage` (preferences)
- **Device APIs:** `expo-local-authentication`, `expo-camera` (Face Lock preview), `expo-screen-capture`, `expo-document-picker`, `expo-web-browser`, `expo-file-system`
- **UI:** hand-built "glassmorphism" component set (`GlassTabBar`, `GlassBusyOverlay`, `GlassDialogs`, `MedicalBusyIndicator`) on `expo-linear-gradient` + `react-native-svg`, with the original design tokens and the same nine bundled fonts (Public Sans, Noto Sans, Open Sans)
- **Tests:** Jest + `jest-expo`

---

## Project structure

```
app/                     Expo Router screens (one file per screen)
  _layout.tsx            Root: fonts, theme, secure-screen, idle re-lock, token refresh, navigation stack
  index.tsx              Splash
  welcome.tsx  login.tsx  biometric-lock.tsx
  (tabs)/                Home · Appointments · Records · Messages · More  (custom glass tab bar)
  chat.tsx  settings.tsx  support.tsx  patient-perspective.tsx
plugins/                 Expo config plugins that customise the generated native project
  withReleaseSigning.js    release signing from environment variables (used by CI)
  withSecureWindow.js      native FLAG_SECURE on the Android window from the first frame
  withGradleMemory.js      larger Gradle heap/metaspace so release builds don't run out of memory
src/
  api/                   endpoints catalogue, typed DTOs, fetch client (bearer + 401 → refresh → retry)
  services/              auth, token refresh, session policy, biometrics, realtime chat, storage, logging
  viewmodels/            one hook per screen
  components/            glass UI kit, buttons, cards, dialogs, toast, icons
  theme/                 colour tokens, typography, shadows, ThemeProvider
  config/env.ts          API / web URLs and app version
  utils/                 dates, initials, navigation helpers
__tests__/               Jest suites
assets/                  fonts and images
```

---

## Getting started

### Prerequisites

- Node.js 20+ and npm
- For Android: Android Studio (SDK + an emulator) and JDK 17+; set `ANDROID_HOME`
- For iOS: macOS with Xcode — *or* build in the cloud with [EAS Build](https://docs.expo.dev/build/introduction/)

### Install & run

```bash
npm install
npm run android      # build & launch on an Android emulator / device
npm run ios          # macOS only
npm start            # just the Metro dev server
```

### Pointing at an API

| Build | Default API | Default web app (password reset) |
|---|---|---|
| Development | `http://10.0.2.2:5205` (Android emulator → host machine) / `http://localhost:5205` (iOS simulator) | `http://<same host>:3000` |
| Production | `https://yoton-api-1.onrender.com` | `https://yoton-health.vercel.app` |

Override either with environment variables (see `.env.development` / `.env.production`):

```bash
# a physical phone on the same Wi-Fi as your dev machine
EXPO_PUBLIC_API_URL=http://192.168.1.20:5205 EXPO_PUBLIC_WEB_URL=http://192.168.1.20:3000 npm start
```

To run the API locally: `ASPNETCORE_ENVIRONMENT=Development dotnet run --no-launch-profile --urls http://localhost:5205` in `yoton-api` (a seeded demo patient logs in with `patient1@example.com` / `patient1`).

### Development tips

- **Screenshots in debug builds.** The app blocks screenshots (see *Device-level behaviour*), which also blanks `adb screencap` and emulator screenshots. For QA/docs, prebuild **and** start Metro with `EXPO_PUBLIC_ALLOW_SCREENSHOTS=1`. The JS side only honours it when `__DEV__` is true, so a release build can never be weakened by it.
- **Native project is generated.** `android/` and `ios/` are git-ignored and produced by `npx expo prebuild`; put native customisations in `plugins/`, not in the generated folders.
- **Windows.** Native builds need short paths and an SDK path without spaces. If the repo lives deep inside OneDrive (or the Android SDK is under `C:\Program Files (x86)`), the 260-character path limit and the spaces break CMake/NDK. Build from a short copy such as `C:\ym` and point `ANDROID_HOME` at a space-free path.

### Scripts

| Script | What it does |
|---|---|
| `npm start` | Metro dev server |
| `npm run android` / `npm run ios` | Build and launch on a device or emulator |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Expo config + React hooks rules) |
| `npm test` | Jest unit tests |

---

## Building for release

**Android** — the GitHub Actions workflow [`build-android.yml`](.github/workflows/build-android.yml) type-checks, lints, tests, then produces a signed `.aab` (Play Store) and `.apk` (sideload) on version tags (`v*`) or manual dispatch. It needs these repository secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ANDROID_STORE_PASSWORD`.

Locally:

```bash
npx expo prebuild --platform android
cd android && ./gradlew bundleRelease     # or assembleRelease
```

**iOS** — producing an installable build requires enrolling in the Apple Developer Program plus a signing certificate and provisioning profile. Build on a Mac with Xcode, or use EAS Build (`eas build --platform ios`), which needs no Mac.

> Bump `expo.android.versionCode` in `app.json` before every Play Store upload (Play rejects a repeated code). Release signing reads `ANDROID_KEYSTORE_PATH`, `ANDROID_STORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`; without `ANDROID_KEYSTORE_PATH` a release build falls back to the debug key (fine locally, not uploadable).

> The application id is still the MAUI-era placeholder `com.companyname.yotonmobile` (see `app.json`). Change it **before** the first store release — it can't be changed afterwards.

Windows / macOS desktop targets that MAUI offered are not part of this app; staff use the web portal on desktop.

---

## Known limitations

These are carried over from the MAUI app and are intentionally honest in the UI:

- **Quick services** on Home other than *Book Appointment*, and the **Refill Rx** button, are not wired to a backend yet.
- **Patient Perspective** entries are kept in memory for the session only.
- **Support** clinic details are hard-coded, and the care circle is empty (no API yet).
- **Notifications** switch is a stored preference; there is no push-notification service yet (appointment confirmations are detected while the app is open).
- **Bills** are view-only.
- Without biometrics enabled, opening the app after it was closed (or coming back after leaving it) ends the session and shows the login form; the stored session is only kept when biometric unlock is on.
- **Face Lock** is not offered on phones without face unlock (Settings shows the switch disabled), because the face check is the phone's own. On Android the system prompt takes whichever biometric the phone has - the app can't force face-only - so on a phone with both, a fingerprint touch during the face scan may also unlock; the app just doesn't invite it. The scan animation's face nodes are decorative, not detected landmarks. Whether the camera preview and the system face check can share the camera has not been verified on a real phone (the emulator has no face unlock), nor the iOS behaviour alongside Face ID.
- **Seeing Face Lock on an emulator.** Emulators have no face unlock, so the switch is disabled there. For development only, start Metro with `EXPO_PUBLIC_FAKE_FACE_UNLOCK=1` to treat the device as face-capable (the unlock is then the emulator's fingerprint). It is ignored in release builds.

---

## Related repositories

- [`yoton-api`](../yoton-api) — ASP.NET Core Web API (PostgreSQL, JWT, SignalR)
- [`yoton-web`](../yoton-web) — Next.js staff portal
