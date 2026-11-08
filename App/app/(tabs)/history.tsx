/** History: weekly / monthly charts of energy and PFC against the goal. */
import type { Nutrients } from "@nutri/shared";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { addDays, formatDate, listDatesEndingAt } from "../../src/domain/Dates";
import { resolveGoal } from "../../src/domain/Goals";
import { BarChart } from "../../src/ui/components/BarChart";
import { Card, ScreenScroll, Segmented, TextBody, TextHeading } from "../../src/ui/components/Primitives";
import { useServices } from "../../src/ui/Services";
import { usePalette } from "../../src/ui/Theme";

type Range = "week" | "month";
type Metric = "energyKcal" | "proteinG" | "fatG" | "carbohydrateG";

export default function HistoryScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { diary, settings } = useServices();
  const [range, setRange] = useState<Range>("week");
  const [metric, setMetric] = useState<Metric>("energyKcal");
  const [sums, setSums] = useState<Record<string, Nutrients>>({});
  const [dates, setDates] = useState<string[]>([]);
  const goal = resolveGoal(settings.getProfile(), settings.getGoalOverrides());

  useFocusEffect(
    useCallback(() => {
      const count = range === "week" ? 7 : 30;
      const list = listDatesEndingAt(formatDate(new Date()), count);
      setDates(list);
      void diary.sumByDate(addDays(list[0]!, 0), list[list.length - 1]!).then(setSums);
    }, [diary, range]),
  );

  const colors: Record<Metric, string> = { energyKcal: palette.energy, proteinG: palette.protein, fatG: palette.fat, carbohydrateG: palette.carbohydrate };
  const data = dates.map((date) => ({ label: date.slice(range === "week" ? 5 : 8), value: sums[date]?.[metric] ?? 0 }));
  const loggedDays = data.filter((d) => d.value > 0);
  const average = loggedDays.length ? loggedDays.reduce((acc, d) => acc + d.value, 0) / loggedDays.length : 0;
  const unit = metric === "energyKcal" ? t("common.kcal") : t("common.g");

  return (
    <ScreenScroll>
      <Segmented<Range> options={[{ value: "week", label: t("history.week") }, { value: "month", label: t("history.month") }]} value={range} onChange={setRange} />
      <Segmented<Metric>
        options={[
          { value: "energyKcal", label: t("nutrient.energyKcal") },
          { value: "proteinG", label: "P" },
          { value: "fatG", label: "F" },
          { value: "carbohydrateG", label: "C" },
        ]}
        value={metric}
        onChange={setMetric}
      />
      <Card>
        <TextHeading>{t(`nutrient.${metric}`)}</TextHeading>
        {loggedDays.length === 0 ? (
          <TextBody muted>{t("history.noData")}</TextBody>
        ) : (
          <View style={{ gap: 8 }}>
            <BarChart data={data} goal={goal?.[metric] ?? null} color={colors[metric]} labelEvery={range === "week" ? 1 : 5} />
            <TextBody small muted>
              {t("history.average")}: {Math.round(average)} {unit}
              {goal ? `  ·  ${t("history.goalLine")}: ${goal[metric]} ${unit}` : ""}
            </TextBody>
          </View>
        )}
      </Card>
    </ScreenScroll>
  );
}
