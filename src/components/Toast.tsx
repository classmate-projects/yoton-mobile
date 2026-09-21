import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, useAnimatedValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { argb } from "@/theme/colors";
import { fonts } from "@/theme/typography";

// A small, non-blocking message that fades in near the bottom and goes away by itself - the
// CommunityToolkit Toast the MAUI app used (iOS has no native equivalent in React Native; Android's
// own ToastAndroid is used where the OS provides one).
type Listener = (message: string) => void;
let listener: Listener | null = null;

export function showToast(message: string): void {
  listener?.(message);
}

const VISIBLE_MS = 2500;

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const opacity = useAnimatedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback(
    (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(text);
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
          if (finished) setMessage(null);
        });
      }, VISIBLE_MS);
    },
    [opacity],
  );

  useEffect(() => {
    listener = show;
    return () => {
      listener = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [show]);

  if (!message) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 90, opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignSelf: "center",
    maxWidth: "86%",
    backgroundColor: argb("#E6202428"),
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 11,
    zIndex: 100,
  },
  text: { color: "#FFFFFF", fontFamily: fonts.notoSansRegular, fontSize: 13, textAlign: "center" },
});
