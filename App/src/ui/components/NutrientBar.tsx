/** A labeled progress bar of a nutrient total against its goal. */
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../Theme";

interface Props {
  label: string;
  value: number;
  goal: number | null;
  unit: string;
  color: string;
  goalLabel?: string;
}

export function NutrientBar({ label, value, goal, unit, color, goalLabel }: Props) {
  const palette = usePalette();
  const ratio = goal ? Math.min(value / goal, 1) : 0;
  const isOver = goal !== null && value > goal;
  return (
    <View style={styles.wrapper} accessible accessibilityLabel={`${label} ${value} ${unit}${goal ? ` / ${goal}` : ""}`}>
      <View style={styles.header}>
        <Text style={{ color: palette.text, fontSize: 14 }}>{label}</Text>
        <Text style={{ color: isOver ? palette.danger : palette.textMuted, fontSize: 13 }}>
          {Math.round(value * 10) / 10} {unit}
          {goalLabel ? `  ·  ${goalLabel}` : ""}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: palette.border }]}>
        <View style={{ width: `${ratio * 100}%`, backgroundColor: isOver ? palette.danger : color, height: "100%", borderRadius: 4 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  header: { flexDirection: "row", justifyContent: "space-between" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
});
