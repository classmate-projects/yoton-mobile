import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Animated, Easing, StyleSheet, View, useAnimatedValue } from "react-native";
import Svg, { Path } from "react-native-svg";

import { argb, palette } from "@/theme/colors";
import { shadow } from "@/theme/shadow";
import { fonts } from "@/theme/typography";

interface Props {
  isRunning: boolean;
  message?: string;
}

const CANVAS = 132;

// Position a fixed-size child in the middle of the canvas (XAML: Center/Center in a Grid).
const centered = (size: number) => ({
  position: "absolute" as const,
  width: size,
  height: size,
  left: (CANVAS - size) / 2,
  top: (CANVAS - size) / 2,
});

// The brand loading animation: pulsing halos, a glass capsule with a heartbeat trace, and a
// glowing dot orbiting them. Port of the MAUI MedicalBusyIndicator - same geometry, colours and
// timings (halo 1800ms, capsule 1450ms, orbit 3800ms). Static while not running.
export function MedicalBusyIndicator({ isRunning, message = "Preparing your health space" }: Props) {
  const halo = useAnimatedValue(0);
  const breath = useAnimatedValue(0);
  const orbit = useAnimatedValue(0);

  useEffect(() => {
    if (!isRunning) {
      halo.setValue(0);
      breath.setValue(0);
      orbit.setValue(0);
      return;
    }

    const pulse = (value: Animated.Value, halfPeriodMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration: halfPeriodMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: halfPeriodMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    const spin = Animated.loop(
      Animated.timing(orbit, { toValue: 1, duration: 3800, easing: Easing.linear, useNativeDriver: true }),
    );

    const animations = [pulse(halo, 900), pulse(breath, 725), spin];
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [isRunning, halo, breath, orbit]);

  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.08] });
  const capsuleScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  const orbitRotation = orbit.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.container} accessibilityLabel="Yoton Health is loading your care information">
      <View style={{ width: CANVAS, height: CANVAS }}>
        <Animated.View
          style={[
            centered(124),
            styles.halo,
            { borderColor: argb("#380A6CFF"), backgroundColor: argb("#090A6CFF"), transform: [{ scale: haloScale }] },
          ]}
        />
        <View
          style={[
            centered(94),
            styles.halo,
            { borderColor: argb("#42008C8C"), borderWidth: 1.5, backgroundColor: argb("#0B00C6C6") },
          ]}
        />

        <Animated.View style={[centered(124), { transform: [{ rotate: orbitRotation }] }]}>
          <View style={[styles.orbitDot, shadow("#69E6FFFF", 0, 8, 0.95)]} />
        </Animated.View>

        <Animated.View style={[centered(70), shadow("#590055CC", 6, 14, 0.5), { transform: [{ scale: capsuleScale }] }]}>
          <LinearGradient
            colors={[argb("#F2FFFFFF"), argb("#B8DDF9FF"), argb("#B5008C8C")]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.capsule}
          >
            {/* Heartbeat trace, drawn at the same offset (13,13) the MAUI Grid padding gave it. */}
            <Svg width={70} height={70} style={StyleSheet.absoluteFill}>
              <Path
                transform="translate(13 13)"
                d="M 1,23 L 13,23 L 19,13 L 27,35 L 35,18 L 40,23 L 55,23"
                stroke={palette.primary[700]}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
            <View style={[styles.capsuleDot, shadow("#C8F6FFFF", 0, 6, 1)]} />
          </LinearGradient>
        </Animated.View>
      </View>

      <View style={styles.labels}>
        <Animated.Text style={styles.message}>{message}</Animated.Text>
        <Animated.Text style={styles.caption}>Securely syncing your care</Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 176, height: 184, alignItems: "center", justifyContent: "center", gap: 12 },
  halo: { borderRadius: 999, borderWidth: 1 },
  orbitDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#51F6FF",
  },
  capsule: {
    flex: 1,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: argb("#80FFFFFF"),
    overflow: "hidden",
  },
  capsuleDot: {
    position: "absolute",
    top: 13,
    right: 13,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#67FAFF",
  },
  labels: { alignItems: "center", gap: 2 },
  message: { fontFamily: fonts.publicSansBold, fontSize: 13, color: palette.primary[700], textAlign: "center" },
  caption: { fontFamily: fonts.notoSansRegular, fontSize: 10, color: "#62748B", textAlign: "center" },
});
