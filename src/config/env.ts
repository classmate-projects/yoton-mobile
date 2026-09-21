import Constants from "expo-constants";
import { Platform } from "react-native";

// Local API on the host machine: the Android emulator reaches it through 10.0.2.2, the iOS
// simulator through localhost. Physical devices set EXPO_PUBLIC_API_URL (see .env.development).
const devHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";

const trimSlash = (url: string) => url.replace(/\/+$/, "");

// The Yoton API (same ASP.NET Core Web API the MAUI app used). Chat, patient self-service and
// auth endpoints all hang off this origin, and so do uploaded files (see backendAssetUrl).
export const API_BASE_URL = trimSlash(
  process.env.EXPO_PUBLIC_API_URL ??
    (__DEV__ ? `http://${devHost}:5205` : "https://yoton-api-1.onrender.com"),
);

// The staff/patient web app - password reset lives there, the mobile app only hands off to it.
export const WEB_APP_URL = trimSlash(
  process.env.EXPO_PUBLIC_WEB_URL ??
    (__DEV__ ? `http://${devHost}:3000` : "https://yoton-health.vercel.app"),
);

// Single source of truth for the version is app.json (the MAUI app read it from the .csproj), so a
// bump only ever happens in one place.
export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
