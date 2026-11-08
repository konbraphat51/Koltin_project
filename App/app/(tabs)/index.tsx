/** Today: daily totals against goals and the diary grouped by meal. */
import { Ionicons } from "@expo/vector-icons";
import { sumNutrients } from "@nutri/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { subscribeDiaryChanged } from "../../src/ui/DiaryEvents";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { addDays, formatDate } from "../../src/domain/Dates";
import { resolveGoal } from "../../src/domain/Goals";
import { mealTypes, type DiaryEntry, type MealType } from "../../src/domain/Models";
import { confirmAction } from "../../src/ui/Confirm";
import { NutrientBar } from "../../src/ui/components/NutrientBar";
import { Card, ScreenScroll, TextBody, TextHeading } from "../../src/ui/components/Primitives";
import { useServices } from "../../src/ui/Services";
import { usePalette } from "../../src/ui/Theme";

export default function TodayScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const router = useRouter();
  const { diary, settings } = useServices();
  const [date, setDate] = useState(formatDate(new Date()));
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [goal, setGoal] = useState(resolveGoal(settings.getProfile(), settings.getGoalOverrides()));

  const reload = useCallback(
    async (target: string) => {
      setGoal(resolveGoal(settings.getProfile(), settings.getGoalOverrides()));
      setEntries(await diary.listByDate(target));
    },
    [diary, settings],
  );
  useFocusEffect(
    useCallback(() => {
      void reload(date);
    }, [reload, date]),
  );

  useEffect(() => subscribeDiaryChanged(() => void reload(date)), [reload, date]);

  const total = sumNutrients(entries.map((e) => e.nutrients));
  const removeEntry = (entry: DiaryEntry) =>
    confirmAction(t("today.deleteEntry"), t("common.delete"), t("common.cancel"), () => {
      void diary.delete(entry.id).then(() => reload(date));
    });

  return (
    <ScreenScroll>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable accessibilityLabel="previous day" onPress={() => setDate(addDays(date, -1))} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Pressable>
        <TextHeading>{date}</TextHeading>
        <Pressable accessibilityLabel="next day" onPress={() => setDate(addDays(date, 1))} hitSlop={12}>
          <Ionicons name="chevron-forward" size={24} color={palette.text} />
        </Pressable>
      </View>

      <Card>
        <TextHeading>{t("today.total")}</TextHeading>
        <NutrientBar label={t("nutrient.energyKcal")} value={total.energyKcal} goal={goal?.energyKcal ?? null} unit={t("common.kcal")} color={palette.energy} goalLabel={goal ? t("today.goal", { value: goal.energyKcal }) : undefined} />
        <NutrientBar label={t("nutrient.proteinG")} value={total.proteinG} goal={goal?.proteinG ?? null} unit={t("common.g")} color={palette.protein} goalLabel={goal ? t("today.goal", { value: goal.proteinG }) : undefined} />
        <NutrientBar label={t("nutrient.fatG")} value={total.fatG} goal={goal?.fatG ?? null} unit={t("common.g")} color={palette.fat} goalLabel={goal ? t("today.goal", { value: goal.fatG }) : undefined} />
        <NutrientBar label={t("nutrient.carbohydrateG")} value={total.carbohydrateG} goal={goal?.carbohydrateG ?? null} unit={t("common.g")} color={palette.carbohydrate} goalLabel={goal ? t("today.goal", { value: goal.carbohydrateG }) : undefined} />
        {!goal ? <TextBody muted small>{t("today.noProfile")}</TextBody> : null}
      </Card>

      {mealTypes.map((meal: MealType) => {
        const items = entries.filter((e) => e.mealType === meal);
        const mealKcal = Math.round(sumNutrients(items.map((e) => e.nutrients)).energyKcal);
        return (
          <Card key={meal}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <TextHeading>
                {t(`meal.${meal}`)} · {mealKcal} {t("common.kcal")}
              </TextHeading>
              <Pressable testID={`add-${meal}`} accessibilityRole="button" accessibilityLabel={t("today.addTo", { meal: t(`meal.${meal}`) })} onPress={() => router.push({ pathname: "/add", params: { date, meal } })} hitSlop={10}>
                <Ionicons name="add-circle" size={30} color={palette.primary} />
              </Pressable>
            </View>
            {items.length === 0 ? (
              <TextBody muted small>{t("today.empty")}</TextBody>
            ) : (
              items.map((entry) => (
                <View key={entry.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.text, fontSize: 15 }}>{entry.name}</Text>
                    <Text style={{ color: entry.pendingRequestId ? palette.energy : palette.textMuted, fontSize: 12 }}>
                      {Math.round(entry.amountG)} {t("common.g")} · {Math.round(entry.nutrients.energyKcal)} {t("common.kcal")}
                      {entry.pendingRequestId ? ` · ${t("today.pending")}` : ""}
                    </Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={t("common.delete")} onPress={() => removeEntry(entry)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={20} color={palette.textMuted} />
                  </Pressable>
                </View>
              ))
            )}
          </Card>
        );
      })}
    </ScreenScroll>
  );
}
