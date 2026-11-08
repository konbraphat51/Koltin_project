/** Tappable list of foods used by search results, favorites and my foods. */
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { FoodItem } from "../../domain/Models";
import { usePalette } from "../Theme";

interface Props {
  items: FoodItem[];
  onSelect: (item: FoodItem) => void;
  /** Optional trailing action, e.g. delete. */
  renderAction?: (item: FoodItem) => React.ReactNode;
}

export function ListFood({ items, onSelect, renderAction }: Props) {
  const palette = usePalette();
  const { t } = useTranslation();
  return (
    <View>
      {items.map((item, index) => (
        <View key={`${item.source}-${item.sourceRef ?? item.id ?? index}`} style={[styles.row, { borderColor: palette.border }]}>
          <Pressable accessibilityRole="button" onPress={() => onSelect(item)} style={styles.main}>
            <Text style={{ color: palette.text, fontSize: 15 }} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }} numberOfLines={1}>
              {[item.brand, `${Math.round(item.per100g.energyKcal)} ${t("common.kcal")} / 100 ${t("common.g")}`].filter(Boolean).join(" · ")}
            </Text>
          </Pressable>
          {renderAction?.(item)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10, gap: 8 },
  main: { flex: 1, gap: 2 },
});
