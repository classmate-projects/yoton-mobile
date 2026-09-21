import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

interface CardProps extends ViewProps {
  /** Corner radius - the MAUI screens use 12, 14 and 16 for different card sizes. */
  radius?: number;
  padding?: number;
  /** Background override (e.g. the Primary-700 profile header). Defaults to the theme card colour. */
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

// The recurring "boxed content" Border (white card in light theme / #1C1F23 in dark) used for
// list rows, info panels and dashboard tiles. Rounded, clipped, no stroke by default.
export function Card({ radius = 12, padding = 15, backgroundColor, style, children, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor: backgroundColor ?? theme.card, borderRadius: radius, padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
});
