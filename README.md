# Yoton Mobile

The patient-facing mobile app for **Yoton** — a Hospital / Clinic Management System with a built-in Electronic Medical Record (EMR). Where [`yoton-web`](../yoton-web) is the staff portal used by reception, doctors, and nurses, Yoton Mobile is the patient's own pocket portal into their care: booking appointments, viewing records, and messaging their care team. It talks to the [`yoton-api`](../yoton-api) backend.

Built with **.NET MAUI** (C#, XAML) using the **MVVM** pattern, targeting Android, iOS, macOS (Catalyst), and Windows.

> This repository is an independent Git project. The API and the web portal live in their own separate repositories and are versioned on their own.

---

## What this app does

Login is restricted to **patient** accounts only — staff are directed to the web portal instead.

| Screen | Capability |
|---|---|
| **Splash / Welcome** | Branded launch animation; routes returning users straight to a biometric lock, everyone else to onboarding |
| **Login** | Email/username + password sign-in; detects a still-default temporary password and offers to jump into the web app's reset flow; offers Face ID / fingerprint enrollment after a successful first login |
| **Biometric lock** | Face ID / fingerprint re-authentication for returning sessions, with a password fallback after repeated failures |
| **Home** | Personal dashboard — profile summary, a carousel of upcoming appointments, and a "today's tasks" list built from real active prescriptions (never fabricated data) |
| **Appointments** | Upcoming & past appointments; in-app self-service booking — browse doctors by specialization, rank up to 3 preferred doctors, pick a date, view live slot availability (with automatic fallback to the next preferred doctor), and submit a booking request; past appointments show the doctor's recorded consultation notes |
| **Records** | Active prescriptions (drug, dosage, frequency, instructions, days remaining), lab & radiology results with status-aware messaging and downloadable reports, and itemized bills (view-only — no payment gateway) |
| **Messages** | Conversation list with the patient's care team and clinic reception, with live online/offline presence and unread counts |
| **Chat thread** | Real-time 1:1 messaging with a doctor or reception — text, file attachments, reply-to-message threading, emoji reactions, typing indicators, read receipts |
| **Patient Perspective** | Personal wellness tracking — mood, pain (with location), water intake, step count, and a free-text health journal. This is session-local only today; the app is upfront in the UI that it isn't synced to a backend yet |
| **Support** | Clinic contact info and a personal emergency "care circle," with tap-to-call |
| **Settings** | Profile, dark mode, notification & biometric toggles, app version, logout |

---

## Tech stack

- **Framework:** .NET MAUI, Single Project, targeting `net10.0` (Android, iOS, MacCatalyst, Windows)
- **Pattern:** MVVM via `CommunityToolkit.Mvvm` (`[ObservableProperty]`, `[RelayCommand]`)
- **UI toolkit:** `CommunityToolkit.Maui`
- **Real-time:** `Microsoft.AspNetCore.SignalR.Client` for live chat
- **Biometrics:** `Plugin.Maui.Biometric` (Face ID / fingerprint)
- **HTTP:** `IHttpClientFactory` + `System.Net.Http.Json`, with a `DelegatingHandler` that transparently retries once on a 401 after refreshing the access token

### Design system

A custom "glassmorphism" component set (`Controls/`) — glass busy overlays, a liquid-glass alert replacing native `DisplayAlert`, an animated medical loading indicator, and a custom bottom tab bar — with full light/dark theming via `AppThemeBinding`.

---

## Architecture

```
App.xaml(.cs)       — entry point; idle-timeout / re-authentication logic, proactive token refresh
AppShell.xaml(.cs)  — Shell navigation & route registration
MauiProgram.cs       — dependency injection wiring (HttpClient, services, pages, view models)
BaseLibrary/         — API plumbing: endpoint catalog, HTTP service, auth-refresh handler, response envelope
Pages/               — one ContentPage per screen
ViewModels/          — one view model per page (CommunityToolkit.Mvvm)
Services/            — app-level singletons: auth, real-time chat, navigation, appointment-status tracking, logging
Controls/            — the glassmorphism component set
Behaviors/, Converters/ — XAML-binding glue
Models/              — DTOs mirroring the API's response shapes
Resources/           — icons, fonts, splash screen, color & style tokens
Platforms/           — per-platform entry points and manifests
```

### Authentication & session security

- JWT access + refresh tokens are stored in OS-level **SecureStorage** (Keychain / Keystore) — never in plaintext `Preferences`.
- Refresh tokens rotate server-side and are deduplicated client-side via a semaphore, so concurrent 401s trigger only one refresh.
- A background loop proactively refreshes the access token every 20 minutes to keep the long-lived chat connection authenticated.
- The app tracks how long it was backgrounded; past a configurable idle threshold it requires biometric or password re-authentication on resume.
- Android builds set `FLAG_SECURE`, blocking screenshots, screen recording, and Recents-thumbnail capture, since patient health data appears throughout the app.
- Every patient API route is scoped server-side to the authenticated identity — the client never passes a patient ID.

---

## Getting started

### Prerequisites

- .NET 10 SDK with the MAUI workload: `dotnet workload install maui`
- Platform tooling for whichever target you're building (Android SDK/emulator, Xcode for iOS/MacCatalyst, etc.)
- A running instance of [`yoton-api`](../yoton-api)

### Configuration

There's no `.env` file — the API base URL is a compile-time constant in `BaseLibrary/APILibrary.cs`, switched by build configuration:

- **Debug** points at the Android-emulator loopback address (`10.0.2.2`) for a locally running `yoton-api`.
- **Release** points at the production deployment.

To debug against a physical device or a different host, edit `BaseLibrary/APILibrary.cs` locally before building.

### Build & run

```bash
dotnet workload restore Yoton-Mobile.csproj
dotnet build Yoton-Mobile.csproj -f net10.0-android      # or -ios / -maccatalyst / -windows10.0.19041.0
```

### Release builds

```bash
# Android — Play Store bundle
dotnet publish Yoton-Mobile.csproj -f net10.0-android -c Release -p:AndroidPackageFormat=aab

# Android — sideloadable APK
dotnet publish Yoton-Mobile.csproj -f net10.0-android -c Release -p:AndroidPackageFormat=apk

# Windows
dotnet publish Yoton-Mobile.csproj -f net10.0-windows10.0.19041.0 -c Release -p:RuntimeIdentifierOverride=win10-x64
```

CI (`.github/workflows/build-maui.yml`) builds a signed Android AAB + APK and an unpackaged Windows build on tag push or manual dispatch. iOS/MacCatalyst are not yet wired up (pending an Apple Developer enrollment).

---

## Known limitations

The app is upfront in its own UI/code about a few areas that are intentionally not fully backed yet:

- **Patient Perspective** (mood/pain/water/steps/journal) is session-local only — nothing is synced to the clinic.
- **Support page** contact info and the "care circle" are placeholder/local data — no backing API yet.
- **Bills** are view-only; there's no in-app payment gateway.
- **Push notifications** aren't implemented — appointment-confirmation alerts only fire while the app is open.
- No automated test project yet.

---

## Related repositories

- **yoton-api** — backend (ASP.NET Core / PostgreSQL)
- **yoton-web** — staff web portal (Next.js)

Each is a separate Git repository with its own README and release cadence.
