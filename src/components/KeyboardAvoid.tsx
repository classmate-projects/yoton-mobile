import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Lifts a form above the soft keyboard on both platforms. iOS never resized the window (the MAUI
// app padded the page by the keyboard height by hand in AppDelegate); Android used to
// (WindowSoftInputMode=AdjustResize), but Android 15 apps are edge-to-edge and the system no longer
// resizes an edge-to-edge window, so it has to be handled here as well. Pass `underHeader` on
// screens that sit below a native navigation header, so its height is discounted.
export function KeyboardAvoid({
  children,
  underHeader,
  style,
}: {
  children: ReactNode;
  underHeader?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const offset = underHeader ? insets.top + (Platform.OS === "ios" ? 44 : 56) : 0;

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={offset} style={[styles.fill, style]}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
