import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { variants, type TextVariant } from "@/theme/typography";

export interface AppTextProps extends TextProps {
  /** One of the MAUI Styles.xaml label styles (H1..LabelBold). Plain `default` if omitted. */
  variant?: TextVariant;
  /** XAML FontAttributes="Bold". */
  bold?: boolean;
  size?: number;
  color?: string;
  center?: boolean;
}

export function AppText({ variant = "default", bold, size, color, center, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const spec = variants[variant];

  const base: TextStyle = {
    fontFamily: spec.fontFamily,
    fontSize: size ?? spec.fontSize,
    color: color ?? spec.color(theme),
  };
  // A family that's already the bold face needs no extra weight (it would be synthesised twice).
  if (bold && !spec.fontFamily?.endsWith("Bold")) base.fontWeight = "700";
  if (center) base.textAlign = "center";

  return <Text {...rest} style={StyleSheet.flatten([base, style])} />;
}
