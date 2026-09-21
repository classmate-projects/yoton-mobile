import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { Appearance, useColorScheme } from "react-native";

import { THEME_OVERRIDE_KEY } from "@/services/storage";

import { themeColors, type ThemeColors } from "./colors";

interface ThemeContextValue extends ThemeColors {
  /** Force dark (true) or light (false) regardless of the OS setting. */
  setDarkMode: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Reads the saved in-app dark-mode choice and applies it. Awaited once at startup, before the
// first screen renders, so there's no light->dark flash. (MAUI's Application.UserAppTheme was
// in-memory only and reset on every launch; persisting it is the one deliberate improvement.)
export async function applySavedThemeOverride(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(THEME_OVERRIDE_KEY);
    if (saved === "light" || saved === "dark") Appearance.setColorScheme(saved);
  } catch {
    // Fall back to following the OS theme.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Reflects Appearance.setColorScheme overrides too, so it's the single source of truth.
  const scheme = useColorScheme() === "dark" ? "dark" : "light";

  const setDarkMode = useCallback((dark: boolean) => {
    const next = dark ? "dark" : "light";
    Appearance.setColorScheme(next);
    AsyncStorage.setItem(THEME_OVERRIDE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ ...themeColors(scheme), setDarkMode }), [scheme, setDarkMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
