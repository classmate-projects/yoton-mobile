import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { BackHandler, Platform, ToastAndroid } from "react-native";

// Runs `callback` every time the screen gains focus (the MAUI OnAppearing). The latest closure is
// always used, so callers don't have to memoise it.
export function useOnFocus(callback: () => void | (() => void)): void {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });
  useFocusEffect(useCallback(() => latest.current(), []));
}

// Repeats `callback` every `intervalMs` while the screen is focused - the foreground poll that
// catches a front-office confirmation (Pending -> Scheduled) without push notifications.
export function useFocusPolling(callback: () => void, intervalMs = 60_000): void {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => latest.current(), intervalMs);
      return () => clearInterval(timer);
    }, [intervalMs]),
  );
}

// Android: at the Home tab with nothing pushed on top, the first back press only shows a toast and
// the second (within 2s) exits. Every other screen keeps the normal back behaviour - there's no
// "confirm exit" trap where a user just expects to go back one step. (The MAUI MainActivity did
// this in OnBackPressed; useFocusEffect scopes it to Home being the focused screen.)
export function useExitOnDoubleBack(): void {
  const lastPressAt = useRef(0);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;

      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        const now = Date.now();
        if (now - lastPressAt.current < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastPressAt.current = now;
        ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
        return true;
      });
      return () => subscription.remove();
    }, []),
  );
}
