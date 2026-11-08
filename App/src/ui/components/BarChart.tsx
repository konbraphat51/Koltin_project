/** Simple bar chart drawn with Views (no native chart dependency); optional goal line. */
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../Theme";

export interface BarDatum {
  label: string;
  value: number;
}

interface Props {
  data: BarDatum[];
  goal: number | null;
  color: string;
  height?: number;
  /** Show a label under every Nth bar. */
  labelEvery?: number;
}

export function BarChart({ data, goal, color, height = 160, labelEvery = 1 }: Props) {
  const palette = usePalette();
  const max = Math.max(1, goal ?? 0, ...data.map((d) => d.value));
  return (
    <View accessible accessibilityLabel={data.map((d) => `${d.label}: ${Math.round(d.value)}`).join(", ")}>
      <View style={[styles.plot, { height }]}>
        {goal ? <View style={[styles.goalLine, { bottom: (goal / max) * height, borderColor: palette.textMuted }]} /> : null}
        {data.map((d, i) => (
          <View key={`${d.label}-${i}`} style={styles.column}>
            <View style={{ height: Math.max((d.value / max) * height, d.value > 0 ? 2 : 0), backgroundColor: goal && d.value > goal ? palette.danger : color, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text key={`${d.label}-${i}`} style={[styles.label, { color: palette.textMuted }]} numberOfLines={1}>
            {i % labelEvery === 0 ? d.label : ""}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  column: { flex: 1, justifyContent: "flex-end" },
  goalLine: { position: "absolute", left: 0, right: 0, borderTopWidth: 1, borderStyle: "dashed" },
  labels: { flexDirection: "row", gap: 2, marginTop: 4 },
  label: { flex: 1, fontSize: 10, textAlign: "center" },
});
