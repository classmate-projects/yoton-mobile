// Design tokens carried over 1:1 from the MAUI app's Resources/Styles/Colors.xaml, plus the
// per-theme (AppThemeBinding) values its pages used inline.

export const palette = {
  primary: { 900: "#003A80", 700: "#0055CC", 500: "#0A6CFF", 300: "#66A6FF", 100: "#D6E7FF" },
  secondary: { 900: "#004444", 700: "#006F6F", 500: "#008C8C", 300: "#4DB8B8", 100: "#CCEEEE" },
  tertiary: { 900: "#732F00", 700: "#A34700", 500: "#D95A00", 300: "#FF9A4D", 100: "#FFE1CC" },
  neutral: { 900: "#1C1F23", 700: "#2A2E33", 500: "#4A4F55", 300: "#7A8088", 100: "#D5D7DA" },
  // Same value in both themes - they always sit on a coloured chip, not the page background.
  success: "#16A34A",
  warning: "#D97706",
  danger: "#D32F2F",
} as const;

export type ColorScheme = "light" | "dark";

export interface ThemeColors {
  scheme: ColorScheme;
  isDark: boolean;
  /** Page background used by the main tab pages. */
  pageBg: string;
  /** Background of the welcome/login pages (slightly bluer). */
  authBg: string;
  /** Surface of cards / list rows. */
  card: string;
  /** Plain label with no style applied (platform default in MAUI). */
  text: string;
  /** H1/H2/H3 + LabelDefault + LabelBold. */
  heading: string;
  /** BodyLarge/Medium/Small + LabelLight. */
  body: string;
  /** Hairline dividers (Styles.xaml "Divider"). */
  divider: string;
  /** Filled neutral button / chip (SecondaryButton). */
  neutralFill: string;
  /** Bordered "CardBorder" stroke. */
  cardStroke: string;
  /** Composer / bottom bars. */
  bar: string;
  barStroke: string;
  /** Input placeholder colour. */
  placeholder: string;
}

export function themeColors(scheme: ColorScheme): ThemeColors {
  const dark = scheme === "dark";
  return {
    scheme,
    isDark: dark,
    pageBg: dark ? "#121417" : "#F5F7FA",
    authBg: dark ? "#080B12" : "#F4F7FF",
    card: dark ? "#1C1F23" : "#FFFFFF",
    text: dark ? "#FFFFFF" : "#000000",
    heading: dark ? palette.neutral[100] : palette.neutral[900],
    body: dark ? palette.neutral[300] : palette.neutral[700],
    divider: dark ? palette.neutral[500] : palette.neutral[100],
    neutralFill: dark ? palette.neutral[700] : palette.neutral[100],
    cardStroke: dark ? palette.neutral[500] : palette.neutral[300],
    bar: dark ? "#1C1F23" : "#FFFFFF",
    barStroke: "#E0E0E0",
    placeholder: dark ? palette.neutral[500] : palette.neutral[300],
  };
}

// MAUI/XAML writes translucent colours as #AARRGGBB; React Native expects #RRGGBBAA. Converting
// at runtime lets the original literals (e.g. "#8CFFFFFF") be reused verbatim from the XAML
// instead of hand-transposing every one. 6-digit colours pass through untouched.
export function argb(color: string): string {
  if (/^#[0-9a-fA-F]{8}$/.test(color)) return `#${color.slice(3)}${color.slice(1, 3)}`;
  return color;
}
