import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useAnimatedValue,
} from "react-native";

import { AppText } from "@/components/AppText";
import { GradientButton } from "@/components/AppButton";
import { GlassBusyOverlay } from "@/components/GlassBusyOverlay";
import { KeyboardAvoid } from "@/components/KeyboardAvoid";
import { EyeIcon } from "@/components/Icon";
import { argb, palette } from "@/theme/colors";
import { shadow } from "@/theme/shadow";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/typography";
import { useLogin } from "@/viewmodels/useLogin";

// Sign-in. (Port of the MAUI LoginPage: gradient hero with a pulsing brand mark and drifting orbs,
// then the form card.)
export default function LoginScreen() {
  const theme = useTheme();
  const { email, setEmail, password, setPassword, isBusy, submit, openForgotPassword } = useLogin();

  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const iconPulse = useAnimatedValue(0);
  const drift = useAnimatedValue(0);

  useEffect(() => {
    const loop = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    const pulseLoop = loop(iconPulse, 2400);
    const driftLoop = loop(drift, 7000);
    pulseLoop.start();
    driftLoop.start();
    return () => {
      pulseLoop.stop();
      driftLoop.stop();
    };
  }, [iconPulse, drift]);

  const labelColor = theme.isDark ? "#FFFFFF" : palette.neutral[900];

  const fieldStyle = (name: "email" | "password") => {
    const isFocused = focused === name;
    return [
      styles.field,
      {
        backgroundColor: isFocused ? (theme.isDark ? "#111930" : "#F0F5FF") : theme.isDark ? "#0E1220" : "#F8FAFF",
        borderColor: isFocused ? palette.primary[500] : theme.isDark ? "#2A3050" : "#E2E8F0",
        borderWidth: isFocused ? 2 : 1.5,
      },
    ];
  };

  const inputStyle = [styles.input, { color: theme.isDark ? "#FFFFFF" : palette.neutral[900], fontFamily: fonts.notoSansRegular }];

  return (
    <KeyboardAvoid style={{ backgroundColor: theme.authBg }}>
      {/* The hero is a solid blue-teal gradient in both themes, so the status-bar icons stay light. */}
      <StatusBar style="light" />

      {/* GRADIENT HERO */}
      <View style={styles.hero}>
        <LinearGradient
          colors={[palette.primary[700], palette.secondary[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              width: 200,
              height: 200,
              right: -50,
              top: -60,
              backgroundColor: argb("#200A6CFF"),
              transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              width: 100,
              height: 100,
              left: 30,
              bottom: -30,
              backgroundColor: argb("#2000E676"),
              transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }],
            },
          ]}
        />

        <View style={styles.heroText}>
          <Animated.View
            style={[
              styles.brandMark,
              { transform: [{ scale: iconPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] },
            ]}
          >
            <Image source={require("../assets/images/app-logo.png")} style={{ width: 28, height: 28 }} resizeMode="contain" />
          </Animated.View>
          <AppText size={28} color="#FFFFFF" style={{ fontFamily: fonts.publicSansBold }}>
            Welcome Back
          </AppText>
          <AppText size={14} color={argb("#CCFFFFFF")} style={{ fontFamily: fonts.notoSansLight }}>
            Sign in to your clinical portal
          </AppText>
        </View>
      </View>

      {/* FORM CARD - the ScrollView lets the focused field scroll into view above the keyboard. */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.formScroll}
      >
        <Pressable accessible={false} onPress={Keyboard.dismiss}>
          <View style={[styles.card, { backgroundColor: theme.isDark ? "#12172A" : "#FFFFFF" }, shadow("#000000", 8, 30, 0.1)]}>
            <View style={{ gap: 20 }}>
              {/* Email */}
              <View style={{ gap: 6 }}>
                <AppText size={13} color={labelColor} style={{ fontFamily: fonts.publicSansBold }}>
                  Email Address
                </AppText>
                <View style={fieldStyle("email")}>
                  <TextInput
                    underlineColorAndroid="transparent"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused((f) => (f === "email" ? null : f))}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    placeholder="username@hospital.com"
                    placeholderTextColor={palette.neutral[300]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    returnKeyType="next"
                    style={inputStyle}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={{ gap: 6 }}>
                <View style={styles.passwordHeader}>
                  <AppText size={13} color={labelColor} style={{ fontFamily: fonts.publicSansBold }}>
                    Password
                  </AppText>
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={() => void openForgotPassword()}>
                    <AppText size={12} color={palette.primary[500]} style={{ fontFamily: fonts.notoSansRegular }}>
                      Forgot Password?
                    </AppText>
                  </Pressable>
                </View>
                <View style={[fieldStyle("password"), styles.passwordField]}>
                  <TextInput
                    underlineColorAndroid="transparent"
                    ref={passwordRef}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused((f) => (f === "password" ? null : f))}
                    onSubmitEditing={() => void submit()}
                    placeholder="Enter secure password"
                    placeholderTextColor={palette.neutral[300]}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    returnKeyType="go"
                    style={[inputStyle, { flex: 1 }]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    hitSlop={10}
                    onPress={() => setShowPassword((v) => !v)}
                  >
                    <EyeIcon visible={showPassword} />
                  </Pressable>
                </View>
              </View>

              <View style={[{ borderRadius: 14, marginTop: 6 }, shadow("#0055CC", 6, 14, 0.28)]}>
                <GradientButton
                  title="Sign In Securely"
                  colors={[palette.primary[700], palette.secondary[500]]}
                  height={52}
                  radius={14}
                  disabled={isBusy}
                  onPress={() => void submit()}
                />
              </View>

              <View style={styles.securityNote}>
                <AppText size={11}>🔒</AppText>
                <AppText size={11} color={palette.neutral[500]} style={{ fontFamily: fonts.notoSansLight }}>
                  Protected by 256-bit TLS encryption
                </AppText>
              </View>
            </View>
          </View>
        </Pressable>
      </ScrollView>

      <GlassBusyOverlay isRunning={isBusy} message="Signing you in" />
    </KeyboardAvoid>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hero: { height: 250, overflow: "hidden", justifyContent: "flex-end" },
  bubble: { position: "absolute", borderRadius: 999 },
  heroText: { paddingHorizontal: 28, paddingBottom: 24, gap: 5, alignItems: "flex-start" },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  formScroll: { flexGrow: 1, justifyContent: "flex-end", paddingHorizontal: 20, paddingBottom: 120 },
  card: { borderRadius: 24, paddingHorizontal: 24, paddingVertical: 28 },
  field: { borderRadius: 12, paddingHorizontal: 14, justifyContent: "center" },
  passwordField: { flexDirection: "row", alignItems: "center", gap: 8 },
  passwordHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  input: { height: 48, fontSize: 14, padding: 0 },
  securityNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
});
