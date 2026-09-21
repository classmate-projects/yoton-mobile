import { CameraView } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View, useAnimatedValue } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, Line, Path, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";

import { fonts } from "@/theme/typography";

// The "holographic identifying" look of Face Lock: the live front camera inside a circular viewport,
// overlaid with a rotating targeting ring, a sweeping scan beam, a wireframe mesh, landmark nodes
// that light up one by one, a progress arc and a percentage readout - and a green burst + check
// (or a red shake) when the result arrives.
//
// It is presentation only. Whether the person is let in is decided by the phone's own biometric
// (Face ID / Android face or fingerprint) - the phase comes from that result, so the animation can
// never claim more than the system actually confirmed. The camera feed is a live preview: it is
// never captured, stored or sent anywhere.

// "fingerprint": the user chose the fingerprint instead of the face - a calm standby look, no
// face-scanning theatre (the camera is off and nothing pretends to be identifying a face).
export type ScanPhase = "searching" | "scanning" | "fingerprint" | "verified" | "failed";

interface Props {
  phase: ScanPhase;
  /** Headline under the scanner ("IDENTIFYING…"). */
  title: string;
  /** Smaller line under the headline. */
  subtitle?: string;
  /** Show the camera preview (needs the camera permission). Without it the scan runs on a dark face outline. */
  showCamera: boolean;
  size?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);

const COLORS = { active: "#3DF5FF", ok: "#3DFFA8", bad: "#FF4D6A", backdrop: "#040A12" };

// A generic face layout (unit coordinates, x/y in -1..1 of the viewport radius). Decorative: these
// are not detected landmarks, just where the nodes are drawn.
const NODES: [number, number][] = [
  [0, -0.62], [-0.34, -0.5], [0.34, -0.5],
  [-0.36, -0.22], [0.36, -0.22],
  [-0.62, -0.05], [0.62, -0.05],
  [0, 0.02], [0, 0.22],
  [-0.55, 0.28], [0.55, 0.28],
  [-0.26, 0.45], [0.26, 0.45], [0, 0.5],
  [-0.32, 0.72], [0.32, 0.72], [0, 0.82],
];
const LINKS: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [3, 5], [4, 6], [3, 7], [4, 7], [7, 8], [5, 9], [6, 10],
  [8, 11], [8, 12], [11, 13], [12, 13], [9, 14], [10, 15], [14, 16], [15, 16], [11, 14], [12, 15],
];

const CHECK_PATH = "M -22 2 L -7 17 L 24 -16";
const CHECK_LENGTH = 72;

// |cos| sampled around one revolution, for the "rotating globe" longitude lines.
const LONGITUDE_PHASES = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6];
const cosSamples = (phase: number) =>
  Array.from({ length: 25 }, (_, i) => Math.abs(Math.cos(2 * Math.PI * (i / 24 + phase))));

export function HolographicFaceScan({ phase, title, subtitle, showCamera, size = 250 }: Props) {
  const box = size + 76;
  const c = box / 2;
  const r = size / 2;
  const color = phase === "verified" ? COLORS.ok : phase === "failed" ? COLORS.bad : COLORS.active;

  const spin = useAnimatedValue(0);
  const sweep = useAnimatedValue(0);
  const pulse = useAnimatedValue(0);
  const flicker = useAnimatedValue(1);
  const reveal = useAnimatedValue(0);
  const progress = useAnimatedValue(0);
  const check = useAnimatedValue(0);
  const burst = useAnimatedValue(0);
  const shake = useAnimatedValue(0);
  const [percent, setPercent] = useState(0);

  // Endless motion: rings turning, beam sweeping, brackets breathing, the hologram flickering.
  useEffect(() => {
    const loops = [
      Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: false })),
      Animated.loop(
        Animated.sequence([
          Animated.timing(sweep, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(sweep, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.delay(1400),
          Animated.timing(flicker, { toValue: 0.82, duration: 60, useNativeDriver: true }),
          Animated.timing(flicker, { toValue: 1, duration: 70, useNativeDriver: true }),
          Animated.timing(flicker, { toValue: 0.9, duration: 50, useNativeDriver: true }),
          Animated.timing(flicker, { toValue: 1, duration: 90, useNativeDriver: true }),
        ]),
      ),
    ];
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [spin, sweep, pulse, flicker]);

  // Phase-driven parts: landmark reveal, progress arc, and the result animations.
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (phase === "searching") {
      reveal.setValue(0);
      animation = Animated.timing(progress, { toValue: 0.22, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    } else if (phase === "scanning") {
      animation = Animated.parallel([
        Animated.timing(progress, { toValue: 0.92, duration: 6000, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(reveal, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
            Animated.delay(300),
            Animated.timing(reveal, { toValue: 0, duration: 250, useNativeDriver: false }),
          ]),
        ),
      ]);
    } else if (phase === "fingerprint") {
      reveal.setValue(0);
      animation = Animated.timing(progress, { toValue: 0, duration: 300, useNativeDriver: false });
    } else if (phase === "verified") {
      check.setValue(0);
      burst.setValue(0);
      animation = Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration: 260, useNativeDriver: false }),
        Animated.timing(reveal, { toValue: 1, duration: 260, useNativeDriver: false }),
        Animated.timing(check, { toValue: 1, duration: 520, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(burst, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]);
    } else {
      shake.setValue(0);
      animation = Animated.parallel([
        Animated.timing(progress, { toValue: 0, duration: 450, useNativeDriver: false }),
        Animated.timing(reveal, { toValue: 0, duration: 300, useNativeDriver: false }),
        Animated.sequence(
          [10, -10, 7, -7, 3, 0].map((toValue) => Animated.timing(shake, { toValue, duration: 55, useNativeDriver: false })),
        ),
      ]);
    }

    animation.start();
    return () => animation?.stop();
  }, [phase, progress, reveal, check, burst, shake]);

  // Percentage readout (whole numbers only, so it doesn't re-render every frame).
  useEffect(() => {
    let last = -1;
    const id = progress.addListener(({ value }) => {
      const next = Math.round(value * 100);
      if (next !== last) {
        last = next;
        setPercent(next);
      }
    });
    return () => progress.removeListener(id);
  }, [progress]);

  const ringRadius = r + 26;
  const circumference = 2 * Math.PI * (r + 8);
  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });
  const checkOffset = check.interpolate({ inputRange: [0, 1], outputRange: [CHECK_LENGTH, 0] });

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const spinBackDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ["360deg", "0deg"] });
  const beamY = sweep.interpolate({ inputRange: [0, 1], outputRange: [-80, size] });
  const bracketScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const burstScale = burst.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const burstOpacity = burst.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] });

  const longitudes = useMemo(
    () =>
      LONGITUDE_PHASES.map((offset) => {
        const samples = cosSamples(offset);
        return spin.interpolate({
          inputRange: samples.map((_, i) => i / (samples.length - 1)),
          outputRange: samples.map((s) => Math.max(2, s * r)),
        });
      }),
    [spin, r],
  );

  const bracket = (x: number, y: number, dx: number, dy: number) => `M ${x} ${y + dy * 30} L ${x} ${y} L ${x + dx * 30} ${y}`;
  const m = 6;

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ width: box, height: box, alignItems: "center", justifyContent: "center", transform: [{ translateX: shake }] }}>
        {/* Outer decorations: targeting rings + progress arc. */}
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spinDeg }] }]}>
          <Svg width={box} height={box}>
            <Circle cx={c} cy={c} r={ringRadius} stroke={color} strokeOpacity={0.9} strokeWidth={2} fill="none" strokeDasharray={[38, 16, 6, 16]} />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spinBackDeg }] }]}>
          <Svg width={box} height={box}>
            <Circle cx={c} cy={c} r={ringRadius - 12} stroke={color} strokeOpacity={0.45} strokeWidth={1} fill="none" strokeDasharray={[2, 7]} />
          </Svg>
        </Animated.View>
        <Svg width={box} height={box} style={StyleSheet.absoluteFill}>
          <Circle cx={c} cy={c} r={r + 8} stroke={color} strokeOpacity={0.14} strokeWidth={3} fill="none" />
          <AnimatedCircle
            cx={c}
            cy={c}
            r={r + 8}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            rotation={-90}
            origin={`${c}, ${c}`}
          />
        </Svg>

        {/* The viewport. */}
        <Animated.View style={{ width: size, height: size, opacity: flicker }}>
          <View style={[styles.viewport, { width: size, height: size, borderRadius: r, backgroundColor: COLORS.backdrop }]}>
            {showCamera && <CameraView style={StyleSheet.absoluteFill} facing="front" animateShutter={false} />}

            {/* Cool cyan grade + a little darkening so the overlay reads as a projection. No blend modes
                here: they force the viewport into an offscreen layer, and Android does not composite a
                camera surface that sits inside one (the picture would vanish). */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0, 24, 34, 0.22)" }]} />
            <LinearGradient
              colors={["rgba(61,245,255,0.22)", "rgba(61,245,255,0.04)", "rgba(61,245,255,0.16)"]}
              style={StyleSheet.absoluteFill}
            />

            {/* Scanline texture + vignette. */}
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
              <Defs>
                <Pattern id="scanlines" width={size} height={4} patternUnits="userSpaceOnUse">
                  <Rect width={size} height={1} fill={color} opacity={0.16} />
                </Pattern>
                <RadialGradient id="vignette" cx="50%" cy="50%" r="50%">
                  <Stop offset="58%" stopColor={COLORS.backdrop} stopOpacity={0} />
                  <Stop offset="100%" stopColor={COLORS.backdrop} stopOpacity={0.85} />
                </RadialGradient>
              </Defs>
              <Rect width={size} height={size} fill="url(#scanlines)" />
              <Rect width={size} height={size} fill="url(#vignette)" />
            </Svg>

            {/* Wireframe mesh: latitude lines + longitude lines that turn like a globe. */}
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
              <G stroke={color} strokeOpacity={0.3} strokeWidth={1} fill="none">
                {[-0.78, -0.42, 0, 0.42, 0.78].map((t) => (
                  <Ellipse key={t} cx={r} cy={r + t * r} rx={r * Math.sqrt(1 - t * t)} ry={r * 0.16 * Math.sqrt(1 - t * t)} />
                ))}
                {longitudes.map((rx, i) => (
                  <AnimatedEllipse key={i} cx={r} cy={r} rx={rx} ry={r} />
                ))}
                {/* Face outline + centre cross-hair. */}
                <Ellipse cx={r} cy={r} rx={r * 0.62} ry={r * 0.82} strokeOpacity={0.55} strokeDasharray={[5, 5]} />
                <Line x1={r} y1={r * 0.2} x2={r} y2={r * 1.8} strokeOpacity={0.18} />
                <Line x1={r * 0.2} y1={r} x2={r * 1.8} y2={r} strokeOpacity={0.18} />
              </G>

              {/* Landmark nodes and the links between them, revealed in sequence. */}
              <G>
                {LINKS.map(([a, b], i) => {
                  const opacity = reveal.interpolate({
                    inputRange: [Math.max(a, b) / NODES.length, Math.min(1, (Math.max(a, b) + 1.5) / NODES.length)],
                    outputRange: [0, 0.55],
                    extrapolate: "clamp",
                  });
                  return (
                    <AnimatedLine
                      key={i}
                      x1={r + NODES[a][0] * r}
                      y1={r + NODES[a][1] * r}
                      x2={r + NODES[b][0] * r}
                      y2={r + NODES[b][1] * r}
                      stroke={color}
                      strokeWidth={1}
                      strokeOpacity={opacity}
                    />
                  );
                })}
                {NODES.map(([x, y], i) => {
                  const opacity = reveal.interpolate({
                    inputRange: [i / NODES.length, Math.min(1, (i + 1.2) / NODES.length)],
                    outputRange: [0, 1],
                    extrapolate: "clamp",
                  });
                  return (
                    <G key={i}>
                      <AnimatedCircle cx={r + x * r} cy={r + y * r} r={6} fill={color} fillOpacity={opacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] })} />
                      <AnimatedCircle cx={r + x * r} cy={r + y * r} r={2.6} fill={color} fillOpacity={opacity} />
                    </G>
                  );
                })}
              </G>
            </Svg>

            {/* The scan beam. */}
            {(phase === "searching" || phase === "scanning") && (
              <Animated.View style={[styles.beam, { width: size, transform: [{ translateY: beamY }] }]}>
                <LinearGradient
                  colors={["rgba(61,245,255,0)", "rgba(61,245,255,0.38)", "rgba(61,245,255,0)"]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={[styles.beamLine, { backgroundColor: COLORS.active, shadowColor: COLORS.active }]} />
              </Animated.View>
            )}

            {/* Fingerprint standby glyph. */}
            {phase === "fingerprint" && (
              <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: glow }]}>
                <Svg width={size} height={size}>
                  <G
                    transform={`translate(${r} ${r})`}
                    stroke={COLORS.active}
                    strokeWidth={5}
                    strokeLinecap="round"
                    fill="none"
                  >
                    <Path d="M -46 26 C -46 -30 46 -30 46 26" />
                    <Path d="M -32 38 C -32 -14 32 -14 32 38" />
                    <Path d="M -18 48 C -18 2 18 2 18 48" />
                    <Path d="M 0 56 L 0 22" />
                  </G>
                </Svg>
              </Animated.View>
            )}

            {/* Result marks. */}
            {phase === "verified" && (
              <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: "rgba(4, 30, 22, 0.42)" }]}>
                <Svg width={size} height={size}>
                  <AnimatedPath
                    d={CHECK_PATH}
                    transform={`translate(${r} ${r})`}
                    stroke={COLORS.ok}
                    strokeWidth={9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={CHECK_LENGTH}
                    strokeDashoffset={checkOffset}
                  />
                </Svg>
              </View>
            )}
            {phase === "failed" && (
              <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: "rgba(40, 6, 14, 0.4)" }]}>
                <Svg width={size} height={size}>
                  <G transform={`translate(${r} ${r})`} stroke={COLORS.bad} strokeWidth={9} strokeLinecap="round">
                    <Line x1={-18} y1={-18} x2={18} y2={18} />
                    <Line x1={18} y1={-18} x2={-18} y2={18} />
                  </G>
                </Svg>
              </View>
            )}

            {/* Belt and braces: paint the corners over the camera so the view is a clean circle even
                where the native preview ignores the rounded clip. */}
            <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Path d={`M0 0 H${size} V${size} H0 Z M${r} 0 A${r} ${r} 0 1 0 ${r} ${size} A${r} ${r} 0 1 0 ${r} 0 Z`} fill={COLORS.backdrop} fillRule="evenodd" />
            </Svg>
          </View>
        </Animated.View>

        {/* Success burst. */}
        {phase === "verified" && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: size + 16,
              height: size + 16,
              borderRadius: (size + 16) / 2,
              borderWidth: 3,
              borderColor: COLORS.ok,
              opacity: burstOpacity,
              transform: [{ scale: burstScale }],
            }}
          />
        )}

        {/* Corner brackets. */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: glow, transform: [{ scale: bracketScale }] }]}>
          <Svg width={box} height={box}>
            <G stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none">
              <Path d={bracket(m, m, 1, 1)} />
              <Path d={bracket(box - m, m, -1, 1)} />
              <Path d={bracket(m, box - m, 1, -1)} />
              <Path d={bracket(box - m, box - m, -1, -1)} />
            </G>
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* HUD readout. */}
      <View style={styles.hud}>
        <Text style={[styles.title, { color }]} accessibilityLiveRegion="polite">
          {title}
        </Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <View style={styles.meter}>
          {Array.from({ length: 14 }, (_, i) => (
            <View key={i} style={[styles.cell, { backgroundColor: i < Math.round((percent / 100) * 14) ? color : "rgba(255,255,255,0.12)" }]} />
          ))}
          <Text style={[styles.percent, { color }]}>{`${percent}%`}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  viewport: { overflow: "hidden" },
  center: { alignItems: "center", justifyContent: "center" },
  beam: { position: "absolute", left: 0, top: 0, height: 80 },
  beamLine: { position: "absolute", left: 0, right: 0, bottom: 38, height: 2, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  hud: { alignItems: "center", gap: 8, marginTop: 8 },
  title: { fontFamily: fonts.publicSansBold, fontSize: 16, letterSpacing: 3.5, textAlign: "center" },
  subtitle: { fontFamily: fonts.notoSansRegular, fontSize: 13, color: "rgba(200,230,240,0.78)", textAlign: "center", paddingHorizontal: 24 },
  meter: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  cell: { width: 9, height: 5, borderRadius: 1.5 },
  percent: { fontFamily: fonts.publicSansBold, fontSize: 12, letterSpacing: 1.5, marginLeft: 8, minWidth: 40 },
});
