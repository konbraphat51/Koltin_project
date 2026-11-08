/** Bottom tab navigation. */
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { usePalette } from "../../src/ui/Theme";

export default function TabsLayout() {
  const { t } = useTranslation();
  const palette = usePalette();
  const screen = (name: string, title: string, icon: keyof typeof Ionicons.glyphMap) => <Tabs.Screen name={name} options={{ title, tabBarIcon: ({ color, size }) => <Ionicons name={icon} color={color as string} size={size} /> }} />;
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: palette.primary, tabBarStyle: { backgroundColor: palette.card } }}>
      {screen("index", t("tabs.today"), "restaurant")}
      {screen("history", t("tabs.history"), "stats-chart")}
      {screen("foods", t("tabs.foods"), "heart")}
      {screen("settings", t("tabs.settings"), "settings")}
    </Tabs>
  );
}
