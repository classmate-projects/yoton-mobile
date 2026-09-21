import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View, useAnimatedValue } from "react-native";

import { argb } from "@/theme/colors";
import { shadow } from "@/theme/shadow";

import { MedicalBusyIndicator } from "./MedicalBusyIndicator";

interface Props {
  isRunning: boolean;
  message?: string;
}

// Frosted-glass loading overlay shown over a screen while it securely refreshes: soft translucent
// blobs stand in for a blurred backdrop, with the MedicalBusyIndicator in a glass card.
// Port of the MAUI GlassBusyOverlay (same colours and fade/scale timings).
export function GlassBusyOverlay({ isRunning, message = "Preparing your health space" }: Props) {
  const [mounted, setMounted] = useState(isRunning);
  const overlay = useAnimatedValue(0);
  const card = useAnimatedValue(0);

  // Mount as soon as it's asked to run (adjusting state during render, not in an effect).
  if (isRunning && !mounted) setMounted(true);

  useEffect(() => {
    if (isRunning) {
      overlay.setValue(0);
      card.setValue(0);
      Animated.parallel([
        Animated.timing(overlay, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(card, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(card, { toValue: 0, duration: 150, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [isRunning, overlay, card]);

  if (!mounted) return null;

  const cardScale = card.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    // While it's up it swallows touches, so the content underneath can't be tapped mid-refresh.
    <Animated.View pointerEvents="auto" style={[styles.fill, { opacity: overlay }]}>
      <View style={[styles.fill, { backgroundColor: argb("#B3EAF2FB"), overflow: "hidden" }]}>
        <View style={[styles.blob, { width: 300, height: 300, left: -130, top: -150, backgroundColor: argb("#260A6CFF") }]} />
        <View style={[styles.blob, { width: 240, height: 240, right: -110, bottom: -140, backgroundColor: argb("#2200D1C6") }]} />

        <View style={styles.center}>
          <Animated.View style={[shadow("#A000315C", 16, 30, 0.38), { opacity: card, transform: [{ scale: cardScale }] }]}>
            <LinearGradient
              colors={[argb("#F2F9FDFF"), argb("#D6E5F7FF"), argb("#C6C9F4F6")]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <MedicalBusyIndicator isRunning={isRunning} message={message} />
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, zIndex: 50 },
  blob: { position: "absolute", borderRadius: 999 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: argb("#A6FFFFFF"),
    paddingHorizontal: 28,
    paddingVertical: 24,
    overflow: "hidden",
  },
});
