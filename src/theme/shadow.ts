import type { ViewStyle } from "react-native";

import { argb } from "./colors";

// XAML's <Shadow Brush Offset Radius Opacity> expressed as React Native shadow props. XAML's
// radius is a blur radius in dp; iOS's shadowRadius is roughly half of that, and Android draws
// shadows via elevation (which honours shadowColor on API 28+).
export function shadow(
  color: string,
  offsetY: number,
  blurRadius: number,
  opacity: number,
): ViewStyle {
  return {
    shadowColor: argb(color),
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blurRadius / 2,
    elevation: Math.max(2, Math.round(blurRadius / 2.5)),
  };
}
