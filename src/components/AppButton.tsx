import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { palette } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/typography";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface AppButtonProps extends Omit<PressableProps, "style" | "children"> {
  title: string;
  variant?: Variant;
  height?: number;
  fontSize?: number;
  radius?: number;
  loading?: boolean;
  /** Overrides the variant's fill / label colour (e.g. the Secondary-500 "Call" buttons). */
  backgroundColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

// Styles.xaml: PrimaryButton (Primary-500, PublicSansBold 16, radius 8, padding 14,10),
// SecondaryButton (neutral fill), DangerButton (Danger-500).
export function AppButton({
  title,
  variant = "primary",
  height,
  fontSize = 16,
  radius = 8,
  loading,
  backgroundColor,
  textColor,
  disabled,
  style,
  textStyle,
  ...rest
}: AppButtonProps) {
  const theme = useTheme();

  const fill =
    backgroundColor ??
    {
      primary: palette.primary[500],
      secondary: theme.neutralFill,
      danger: palette.danger,
      ghost: "transparent",
    }[variant];
  const label =
    textColor ??
    {
      primary: "#FFFFFF",
      secondary: theme.heading,
      danger: "#FFFFFF",
      ghost: palette.primary[500],
    }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: fill, borderRadius: radius, height, minHeight: height ? undefined : 44 },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={label} />
      ) : (
        <Text style={[{ color: label, fontFamily: fonts.publicSansBold, fontSize }, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

interface GradientButtonProps extends Omit<PressableProps, "style" | "children"> {
  title: string;
  colors: readonly [string, string, ...string[]];
  height?: number;
  fontSize?: number;
  radius?: number;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

// The diagonal-gradient action buttons (Get Started, Sign In Securely, dialog "Continue").
export function GradientButton({
  title,
  colors,
  height = 52,
  fontSize = 16,
  radius = 14,
  loading,
  disabled,
  style,
  ...rest
}: GradientButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      style={({ pressed }) => [{ borderRadius: radius, opacity: disabled ? 0.6 : pressed ? 0.9 : 1 }, style]}
      {...rest}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { height, borderRadius: radius }]}
      >
        <View>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontFamily: fonts.publicSansBold, fontSize }}>{title}</Text>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", paddingHorizontal: 14, paddingVertical: 10 },
  gradient: { alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
});
