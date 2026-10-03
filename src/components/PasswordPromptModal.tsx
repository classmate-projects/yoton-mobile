import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useAnimatedValue,
  View,
} from "react-native";

import { argb, palette } from "@/theme/colors";
import { shadow } from "@/theme/shadow";
import { fonts } from "@/theme/typography";

interface PasswordPromptModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  /** Additional UI rendered between the subtitle and the password field (e.g. checkboxes). */
  children?: React.ReactNode;
  isVerifying?: boolean;
  error?: string | null;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}

// A password-entry modal reused for the EMR print gate and PDF download gate.
// Visual style matches GlassDialogs — same blue/teal liquid-glass card.
export function PasswordPromptModal({
  visible,
  title,
  subtitle,
  children,
  isVerifying,
  error,
  onConfirm,
  onCancel,
}: PasswordPromptModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const overlay = useAnimatedValue(0);
  const card = useAnimatedValue(0);
  const cardScale = useAnimatedValue(0.92);

  useEffect(() => {
    if (visible) {
      setPassword("");
      setShowPassword(false);
      Animated.parallel([
        Animated.timing(overlay, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(card, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardScale, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else {
      overlay.setValue(0);
      card.setValue(0);
      cardScale.setValue(0.92);
    }
  }, [visible, overlay, card, cardScale]);

  const handleConfirm = useCallback(() => {
    if (!password.trim() || isVerifying) return;
    onConfirm(password);
  }, [password, isVerifying, onConfirm]);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onCancel}>
      <Animated.View style={[styles.overlay, { opacity: overlay }]}>
        <View style={[styles.blob, { width: 280, height: 280, left: -100, top: -120, backgroundColor: argb("#300A6CFF") }]} />
        <View style={[styles.blob, { width: 220, height: 220, right: -80, bottom: -100, backgroundColor: argb("#2600D1C6") }]} />

        <Animated.View style={[styles.cardWrap, shadow("#A000315C", 16, 30, 0.38), { opacity: card, transform: [{ scale: cardScale }] }]}>
          <LinearGradient
            colors={[argb("#F7F9FDFF"), argb("#EBE5F7FF"), argb("#E3C9F4F6")]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <LinearGradient
              colors={[argb("#BFFFFFFF"), argb("#00FFFFFF")]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.highlight}
            />

            <View style={styles.badgeRow}>
              <View style={[styles.badge, shadow("#7C00E8E8", 0, 16, 0.9), { backgroundColor: argb("#3000AFAF"), borderColor: argb("#7500C6C6") }]}>
                <Text style={styles.lock}>🔒</Text>
              </View>
            </View>

            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

            {children}

            <View style={[styles.inputRow, error ? styles.inputError : null]}>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#9AAABB"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleConfirm}
                returnKeyType="done"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isVerifying}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn} accessibilityRole="button">
                <Text style={styles.eye}>{showPassword ? "🙈" : "👁️"}</Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={[styles.divider, { backgroundColor: argb("#3B007CC4") }]} />

            <View style={styles.buttons}>
              <Pressable
                accessibilityRole="button"
                onPress={onCancel}
                disabled={isVerifying}
                style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleConfirm}
                disabled={!password.trim() || isVerifying}
                style={({ pressed }) => [styles.confirm, { opacity: !password.trim() || isVerifying ? 0.55 : pressed ? 0.9 : 1 }]}
              >
                <LinearGradient
                  colors={[argb("#0A6CFF"), argb("#008C8C")]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.confirmGradient}
                >
                  {isVerifying ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmText}>Confirm</Text>
                  )}
                </LinearGradient>
              </Pressable>
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
    gap: 14,
    overflow: "hidden",
  },
  highlight: { position: "absolute", top: 6, left: 32, right: 32, height: 46, borderRadius: 18, opacity: 0.5 },
  badgeRow: { alignItems: "center" },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lock: { fontSize: 28 },
  title: { fontFamily: fonts.publicSansBold, fontSize: 20, color: "#073B73", textAlign: "center" },
  subtitle: { fontFamily: fonts.notoSansRegular, fontSize: 13, color: "#37516E", textAlign: "center" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: argb("#DDFFFFFF"),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: argb("#8800AFAF"),
    paddingHorizontal: 12,
    height: 48,
  },
  inputError: { borderColor: "#D32F2F" },
  input: { flex: 1, fontFamily: fonts.notoSansRegular, fontSize: 14, color: "#073B73" },
  eyeBtn: { padding: 4 },
  eye: { fontSize: 16 },
  errorText: { fontFamily: fonts.notoSansRegular, fontSize: 12, color: "#D32F2F", textAlign: "center" },
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
  confirm: { flex: 1, borderRadius: 15, overflow: "hidden" },
  confirmGradient: { height: 48, alignItems: "center", justifyContent: "center" },
  confirmText: { fontFamily: fonts.publicSansBold, fontSize: 14, color: "#FFFFFF" },
});
