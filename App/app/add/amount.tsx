/** Amount entry: choose grams and meal, preview nutrients, then log the food to the diary. */
import { scaleNutrients } from "@nutri/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch, View } from "react-native";
import { formatDate } from "../../src/domain/Dates";
import { mealTypes, type FoodItem, type MealType } from "../../src/domain/Models";
import { parseNumberText } from "../../src/domain/ParserFoodForm";
import { NutrientBar } from "../../src/ui/components/NutrientBar";
import { Button, Card, Field, ScreenScroll, Segmented, TextBody, TextHeading } from "../../src/ui/components/Primitives";
import { useServices } from "../../src/ui/Services";
import { usePalette } from "../../src/ui/Theme";

export default function AmountScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const router = useRouter();
  const { foodItemId, date, meal } = useLocalSearchParams<{ foodItemId: string; date?: string; meal?: string }>();
  const { food, diary } = useServices();

  const [item, setItem] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState("100");
  const [mealType, setMealType] = useState<MealType>(mealTypes.includes(meal as MealType) ? (meal as MealType) : "snack");
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const id = Number(foodItemId);
    void food.getById(id).then((loaded) => {
      setItem(loaded);
      if (loaded?.servingG) setGrams(String(loaded.servingG));
    });
    void food.isFavorite(id).then(setIsFavorite);
  }, [food, foodItemId]);

  if (!item)
    return (
      <ScreenScroll>
        <TextBody muted>{t("common.loading")}</TextBody>
      </ScreenScroll>
    );

  const amount = parseNumberText(grams);
  const nutrients = amount ? scaleNutrients(item.per100g, amount) : null;

  const save = async () => {
    if (!amount || !nutrients) return setHasError(true);
    await diary.add({ date: date ?? formatDate(new Date()), mealType, foodItemId: item.id, pendingRequestId: null, name: item.name, amountG: amount, nutrients });
    router.navigate("/");
  };

  return (
    <ScreenScroll>
      <Card>
        <TextHeading>{item.name}</TextHeading>
        {item.brand ? (
          <TextBody muted small>
            {item.brand}
          </TextBody>
        ) : null}
        <Field
          label={t("amount.grams")}
          value={grams}
          onChangeText={(v) => {
            setGrams(v);
            setHasError(false);
          }}
          keyboardType="decimal-pad"
          testID="amount-grams"
        />
        {item.servingG ? <Button variant="secondary" label={t("amount.oneServing", { g: item.servingG })} onPress={() => setGrams(String(item.servingG))} /> : null}
        {hasError ? <TextBody>{t("amount.invalid")}</TextBody> : null}
      </Card>

      <TextBody muted small>
        {t("amount.meal")}
      </TextBody>
      <Segmented<MealType> options={mealTypes.map((m) => ({ value: m, label: t(`meal.${m}`) }))} value={mealType} onChange={setMealType} />

      {nutrients ? (
        <Card>
          <TextHeading>{t("amount.preview")}</TextHeading>
          <NutrientBar label={t("nutrient.energyKcal")} value={nutrients.energyKcal} goal={null} unit={t("common.kcal")} color={palette.energy} />
          <NutrientBar label={t("nutrient.proteinG")} value={nutrients.proteinG} goal={null} unit={t("common.g")} color={palette.protein} />
          <NutrientBar label={t("nutrient.fatG")} value={nutrients.fatG} goal={null} unit={t("common.g")} color={palette.fat} />
          <NutrientBar label={t("nutrient.carbohydrateG")} value={nutrients.carbohydrateG} goal={null} unit={t("common.g")} color={palette.carbohydrate} />
          <NutrientBar label={t("nutrient.fiberG")} value={nutrients.fiberG} goal={null} unit={t("common.g")} color={palette.textMuted} />
          <NutrientBar label={t("nutrient.saltG")} value={nutrients.saltG} goal={null} unit={t("common.g")} color={palette.textMuted} />
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <TextBody>{t("amount.favorite")}</TextBody>
        <Switch
          value={isFavorite}
          onValueChange={() => {
            if (item.id !== null) void food.toggleFavorite(item.id).then(setIsFavorite);
          }}
        />
      </View>
      <Button label={t("common.save")} onPress={() => void save()} testID="amount-save" />
    </ScreenScroll>
  );
}
