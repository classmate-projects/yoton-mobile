import { LinearGradient } from "expo-linear-gradient";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, Easing, Image, Modal, Pressable, StyleSheet, Text, View, useAnimatedValue } from "react-native";

import { argb } from "@/theme/colors";
import { shadow } from "@/theme/shadow";
import { fonts } from "@/theme/typography";

import { GradientButton } from "./AppButton";

// Port of the MAUI LiquidGlassAlert and SecurityConfirmedAlert. Instead of temporarily swapping a
// page's Content for a host Grid (LiquidGlassAlert.ShowAsync(page, ...)), the app renders one
// <AlertProvider> at the root and any screen calls `const { showAlert } = useAlert()`.

export interface AlertOptions {
  title: string;
  message: string;
  confirmText?: string;
  /** A second, cancelling button appears only when this is provided (a real choice). */
  cancelText?: string | null;
}

interface AlertApi {
  /** Resolves true when the confirm button is pressed, false when cancelled/dismissed. */
  showAlert: (options: AlertOptions) => Promise<boolean>;
  /** The one-time "you're fully protected" celebration after a real password replaces the temporary one. */
  showSecurityConfirmed: (message?: string) => Promise<void>;
}

const AlertContext = createContext<AlertApi | null>(null);

export function useAlert(): AlertApi {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used inside <AlertProvider>");
  return ctx;
}

type Request =
  | { id: number; kind: "info"; options: AlertOptions; resolve: (confirmed: boolean) => void }
  | { id: number; kind: "secure"; message: string; resolve: () => void };

let nextRequestId = 1;

const DEFAULT_SECURE_MESSAGE =
  "Your password has been updated. Your account is now secured with your new credentials.";

export function AlertProvider({ children }: { children: ReactNode }) {
  // One dialog at a time; further requests wait their turn.
  const [queue, setQueue] = useState<Request[]>([]);

  const showAlert = useCallback(
    (options: AlertOptions) =>
      new Promise<boolean>((resolve) =>
        setQueue((q) => [...q, { id: nextRequestId++, kind: "info", options, resolve }]),
      ),
    [],
  );

  const showSecurityConfirmed = useCallback(
    (message?: string) =>
      new Promise<void>((resolve) =>
        setQueue((q) => [
          ...q,
          { id: nextRequestId++, kind: "secure", message: message ?? DEFAULT_SECURE_MESSAGE, resolve },
        ]),
      ),
    [],
  );

  const api = useMemo(() => ({ showAlert, showSecurityConfirmed }), [showAlert, showSecurityConfirmed]);
  const current = queue[0];
  const next = () => setQueue((q) => q.slice(1));

  return (
    <AlertContext.Provider value={api}>
      {children}
      {current?.kind === "info" && (
        <GlassDialog
          key={current.id}
          tone="info"
          title={current.options.title}
          message={current.options.message}
          confirmText={current.options.confirmText ?? "Continue"}
          cancelText={current.options.cancelText ?? undefined}
          onDone={(confirmed) => {
            current.resolve(confirmed);
            next();
          }}
        />
      )}
      {current?.kind === "secure" && (
        <GlassDialog
          key={current.id}
          tone="secure"
          title="You're Fully Protected"
          message={current.message}
          confirmText="Continue"
          onDone={() => {
            current.resolve();
            next();
          }}
        />
      )}
    </AlertContext.Provider>
  );
}

interface DialogProps {
  tone: "info" | "secure";
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onDone: (confirmed: boolean) => void;
}

// Tone-specific palette. "info" is the blue/teal liquid-glass card, "secure" the green one.
const TONES = {
  info: {
    blobA: "#300A6CFF",
    blobB: "#2600D1C6",
    // Slightly more opaque than the MAUI original (F2/D6/C6): over busy content, text behind the card
    // was bleeding through the title and message.
    card: ["#F7F9FDFF", "#EBE5F7FF", "#E3C9F4F6"],
    title: "#073B73",
    divider: "#3B007CC4",
    button: ["#0A6CFF", "#008C8C"] as const,
  },
  secure: {
    blobA: "#3016C79A",
    blobB: "#2600D1C6",
    card: ["#F7FDF7FF", "#EBF7E9FF", "#E3F4EFF6"],
    title: "#0B5C3F",
    divider: "#3B16C79A",
    button: ["#16C79A", "#0A9CFF"] as const,
  },
} as const;

function GlassDialog({ tone, title, message, confirmText, cancelText, onDone }: DialogProps) {
  const t = TONES[tone];
  const overlay = useAnimatedValue(0);
  const card = useAnimatedValue(0);
  const cardScale = useAnimatedValue(0.92);
  const badgeScale = useAnimatedValue(tone === "secure" ? 0 : 1);
  const pulse = useAnimatedValue(0);
  const finished = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(overlay, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(card, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    if (tone !== "secure") return;
    // Shield pops in with a spring overshoot, then two "secured" rings radiate outward and fade.
    Animated.sequence([
      Animated.timing(badgeScale, { toValue: 1.15, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(badgeScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      { iterations: 2 },
    ).start();
  }, [tone, overlay, card, cardScale, badgeScale, pulse]);

  const finish = (confirmed: boolean) => {
    if (finished.current) return;
    finished.current = true;
    Animated.parallel([
      Animated.timing(card, { toValue: 0, duration: 130, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.96, duration: 130, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onDone(confirmed));
  };

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => finish(false)}>
      <Animated.View style={[styles.overlay, { opacity: overlay }]}>
        {/* Oversized translucent layers simulate refraction behind the dialog. */}
        <View style={[styles.blob, { width: 280, height: 280, left: -120 + 24, top: -130 + 24, backgroundColor: argb(t.blobA) }]} />
        <View style={[styles.blob, { width: 220, height: 220, right: -100 + 24, bottom: -120 + 24, backgroundColor: argb(t.blobB) }]} />

        <Animated.View
          style={[styles.cardWrap, shadow("#A000315C", 16, 30, 0.38), { opacity: card, transform: [{ scale: cardScale }] }]}
        >
          <LinearGradient
            colors={t.card.map(argb) as [string, string, string]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Reflected highlight */}
            <LinearGradient
              colors={[argb("#BFFFFFFF"), argb("#00FFFFFF")]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.highlight}
            />

            <View style={styles.badgeArea}>
              {tone === "secure" ? (
                <>
                  <Animated.View
                    style={[
                      styles.badge,
                      styles.pulseRing,
                      { opacity: ringOpacity, transform: [{ scale: ringScale }] },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.badge,
                      shadow("#7C16C79A", 0, 16, 0.9),
                      { backgroundColor: argb("#3016C79A"), borderColor: argb("#7516C79A"), transform: [{ scale: badgeScale }] },
                    ]}
                  >
                    <Text style={styles.shield}>🛡</Text>
                  </Animated.View>
                </>
              ) : (
                <View
                  style={[
                    styles.badge,
                    shadow("#7C00E8E8", 0, 16, 0.9),
                    { backgroundColor: argb("#3000AFAF"), borderColor: argb("#7500C6C6") },
                  ]}
                >
                  <Image source={require("../../assets/images/app-logo.png")} style={styles.logo} resizeMode="contain" />
                </View>
              )}
            </View>

            <View style={styles.texts}>
              <Text style={[styles.title, { color: t.title }]}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: argb(t.divider) }]} />

            <View style={styles.buttons}>
              {cancelText ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => finish(false)}
                  style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.cancelText}>{cancelText}</Text>
                </Pressable>
              ) : null}
              <GradientButton
                title={confirmText}
                colors={t.button.map(argb) as unknown as readonly [string, string]}
                height={48}
                fontSize={14}
                radius={15}
                onPress={() => finish(true)}
                style={styles.confirm}
              />
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: argb("#87040B1B"),
    overflow: "hidden",
  },
  blob: { position: "absolute", borderRadius: 999 },
  cardWrap: { width: "100%", maxWidth: 390 },
  card: {
    borderRadius: 30,
    borderWidth: 1.2,
    borderColor: argb("#A6FFFFFF"),
    padding: 24,
    gap: 16,
    overflow: "hidden",
  },
  highlight: { position: "absolute", top: 6, left: 32, right: 32, height: 46, borderRadius: 18, opacity: 0.5 },
  badgeArea: { alignItems: "center", justifyContent: "center", height: 96 },
  badge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: argb("#4016C79A"),
  },
  shield: { fontSize: 34 },
  logo: { width: 42, height: 42 },
  texts: { gap: 8 },
  title: { fontFamily: fonts.publicSansBold, fontSize: 22, textAlign: "center" },
  message: {
    fontFamily: fonts.notoSansRegular,
    fontSize: 14,
    lineHeight: 19,
    color: "#37516E",
    textAlign: "center",
  },
  divider: { height: 1 },
  buttons: { flexDirection: "row", gap: 12 },
  cancel: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    backgroundColor: argb("#5CFFFFFF"),
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontFamily: fonts.publicSansBold, fontSize: 14, color: "#07569E" },
  confirm: { flex: 1 },
});
