import type { BottomTabBarProps } from "expo-router/js-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Animated, Easing, Keyboard, Pressable, StyleSheet, View, useAnimatedValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { argb, palette } from "@/theme/colors";
import { shadow } from "@/theme/shadow";
import { useTheme } from "@/theme/ThemeProvider";

import { TabIcon, type TabIconName } from "./Icon";

interface TabDef {
  route: string;
  icon: TabIconName;
  label: string;
}

// Same five destinations, in the same order, as the MAUI AppShell's TabBar.
const TABS: TabDef[] = [
  { route: "home", icon: "home", label: "Home" },
  { route: "appointments", icon: "calendar", label: "Appointments" },
  { route: "records", icon: "records", label: "Records" },
  { route: "messages", icon: "messages", label: "Messages" },
  { route: "more", icon: "more", label: "More" },
];

// The floating "liquid glass" bottom navigation: a translucent white gradient bar with a
// gradient pill behind the selected icon. Port of the MAUI GlassTabBar control (68pt tall,
// 30pt corners, 16/14pt margins), including its slide-and-fade entrance and the tap "squish".
export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const entrance = useAnimatedValue(0);
  const [squish] = useState(() => TABS.map(() => new Animated.Value(1)));

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [entrance]);

  // The floating bar would otherwise sit on top of the keyboard (or be pushed above it, eating the
  // space a form needs), so it steps aside while the keyboard is open.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const focusedRoute = state.routes[state.index]?.name;

  const onPress = (tab: TabDef, index: number) => {
    const route = state.routes.find((r) => r.name === tab.route);
    if (!route) return;

    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (focusedRoute === tab.route || event.defaultPrevented) return;

    Animated.sequence([
      Animated.timing(squish[index], { toValue: 0.82, duration: 70, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(squish[index], { toValue: 1, duration: 90, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    navigation.navigate(route.name, route.params);
  };

  if (keyboardOpen) return null;

  return (
    // The strip around the floating bar matches the page so it reads as one surface.
    <View style={{ backgroundColor: theme.pageBg, paddingBottom: insets.bottom }}>
      <Animated.View
        accessibilityLabel="Main navigation"
        style={{
          opacity: entrance,
          transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        }}
      >
        <View style={[styles.shadowWrap, shadow("#4000315C", 10, 22, 0.3)]}>
          <LinearGradient
            colors={[argb("#E6FFFFFF"), argb("#CCE7F3FF"), argb("#BFDDF2F0")]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bar}
          >
            {TABS.map((tab, index) => {
              const selected = focusedRoute === tab.route;
              return (
                <Pressable
                  key={tab.route}
                  accessibilityRole="tab"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected }}
                  onPress={() => onPress(tab, index)}
                  style={styles.item}
                >
                  {selected && (
                    <LinearGradient
                      colors={[palette.primary[500], palette.secondary[500]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.pill, shadow("#660A6CFF", 4, 10, 0.6)]}
                    />
                  )}
                  <Animated.View style={{ transform: [{ scale: squish[index] }], opacity: selected ? 1 : 0.65 }}>
                    <TabIcon name={tab.icon} size={22} color={selected ? "#FFFFFF" : palette.primary[700]} />
                  </Animated.View>
                </Pressable>
              );
            })}
          </LinearGradient>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: { marginHorizontal: 16, marginBottom: 14, height: 68, borderRadius: 30 },
  bar: {
    flex: 1,
    flexDirection: "row",
    padding: 10,
    borderRadius: 30,
    borderWidth: 1.2,
    borderColor: argb("#8CFFFFFF"),
    overflow: "hidden",
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center" },
  pill: { position: "absolute", width: 46, height: 46, borderRadius: 23 },
});
