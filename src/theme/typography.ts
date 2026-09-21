import { palette, type ThemeColors } from "./colors";

// Font families registered in app/_layout.tsx (the same nine TTFs the MAUI app bundled).
export const fonts = {
  publicSansRegular: "PublicSansRegular",
  publicSansBold: "PublicSansBold",
  publicSansLight: "PublicSansLight",
  notoSansRegular: "NotoSansRegular",
  notoSansBold: "NotoSansBold",
  notoSansLight: "NotoSansLight",
  openSansRegular: "OpenSansRegular",
  openSansBold: "OpenSansBold",
  openSansLight: "OpenSansLight",
} as const;

export type TextVariant =
  | "default"
  | "h1"
  | "h2"
  | "h3"
  | "bodyLarge"
  | "bodyMedium"
  | "bodySmall"
  | "label"
  | "labelLight"
  | "labelBold";

interface VariantSpec {
  fontFamily?: string;
  fontSize: number;
  color: (c: ThemeColors) => string;
}

// Mirrors Resources/Styles/Styles.xaml (H1..LabelBold). "default" is a Label with no style,
// which in MAUI falls back to the platform font at 14 and the platform text colour.
export const variants: Record<TextVariant, VariantSpec> = {
  default: { fontSize: 14, color: (c) => c.text },
  h1: { fontFamily: fonts.publicSansBold, fontSize: 32, color: (c) => c.heading },
  h2: { fontFamily: fonts.publicSansBold, fontSize: 26, color: (c) => c.heading },
  h3: { fontFamily: fonts.publicSansRegular, fontSize: 22, color: (c) => c.heading },
  bodyLarge: { fontFamily: fonts.notoSansRegular, fontSize: 18, color: (c) => c.body },
  bodyMedium: { fontFamily: fonts.notoSansRegular, fontSize: 16, color: (c) => c.body },
  bodySmall: { fontFamily: fonts.notoSansLight, fontSize: 14, color: (c) => c.body },
  label: { fontFamily: fonts.openSansRegular, fontSize: 14, color: (c) => c.heading },
  labelLight: { fontFamily: fonts.openSansLight, fontSize: 13, color: (c) => c.body },
  labelBold: { fontFamily: fonts.openSansBold, fontSize: 14, color: (c) => c.heading },
};

export const shadowColor = palette.neutral[900];
