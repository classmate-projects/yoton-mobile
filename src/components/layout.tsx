import type { ReactNode } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, View, type ScrollViewProps, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/ThemeProvider";

// The tap-anywhere-to-dismiss-the-keyboard behaviour the MAUI app attached to its form pages
// (DismissKeyboardBehavior). Wrap a screen that has text inputs.
export function DismissKeyboardView({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <Pressable accessible={false} onPress={Keyboard.dismiss} style={[styles.fill, style]}>
      {children}
    </Pressable>
  );
}

// A themed page: background colour + a scrolling column with the MAUI pages' standard 20pt
// padding and 20pt gaps. Taps on buttons still work while the keyboard is open. `topInset` adds
// the status-bar height for pages that have no native header of their own (the tab pages);
// `bottomInset` adds the gesture/navigation-bar height for pages that have no tab bar under them.
export function ScreenScroll({
  children,
  authBackground,
  topInset,
  bottomInset,
  contentStyle,
  ...rest
}: ScrollViewProps & {
  children: ReactNode;
  authBackground?: boolean;
  topInset?: boolean;
  bottomInset?: boolean;
  contentStyle?: ViewStyle;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ backgroundColor: authBackground ? theme.authBg : theme.pageBg }}
      contentContainerStyle={[
        styles.scrollContent,
        topInset && { paddingTop: 20 + insets.top },
        bottomInset && { paddingBottom: 20 + insets.bottom },
        contentStyle,
      ]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

// Styles.xaml "Divider": a 1pt hairline.
export function Divider({ style }: { style?: ViewStyle }) {
  const theme = useTheme();
  return <View style={[{ height: 1, backgroundColor: theme.divider }, style]} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { padding: 20, gap: 20 },
});
