import { Tabs } from "expo-router/js-tabs";

import { GlassTabBar } from "@/components/GlassTabBar";

// The five persistent destinations (Home, Appointments, Records, Messages, More), rendered with
// the app's own floating glass bar. Back never hops between tabs (as in the MAUI Shell): on
// Android, back from Home shows the "press again to exit" toast, and from any other tab leaves
// the app - see useExitOnDoubleBack.
export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="none"
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="appointments" options={{ title: "Appointments" }} />
      <Tabs.Screen name="records" options={{ title: "Records" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
