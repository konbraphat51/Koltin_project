/** Manual food entry. With `pendingId` it logs a provisional entry for a requested chain menu instead. */
import { scaleNutrients } from "@nutri/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../src/domain/Dates";
import { mealTypes, type MealType } from "../../src/domain/Models";
import { createEmptyFoodForm, parseFoodForm } from "../../src/domain/ParserFoodForm";
import { FormFood } from "../../src/ui/components/FormFood";
import { Button, ScreenScroll, TextBody } from "../../src/ui/components/Primitives";
import { useServices } from "../../src/ui/Services";

export default function ManualScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { date, meal, name, pendingId, barcode } = useLocalSearchParams<{ date?: string; meal?: string; name?: string; pendingId?: string; barcode?: string }>();
  const { food, diary } = useServices();
  const [values, setValues] = useState({ ...createEmptyFoodForm(), name: name ?? "" });
  const [hasError, setHasError] = useState(false);

  const mealType: MealType = mealTypes.includes(meal as MealType) ? (meal as MealType) : "snack";
  const logDate = date ?? formatDate(new Date());

  const save = async () => {
    const parsed = parseFoodForm(values);
    if (!parsed) return setHasError(true);

    if (pendingId) {
      const amountG = parsed.servingG ?? 100;
      await diary.add({ date: logDate, mealType, foodItemId: null, pendingRequestId: Number(pendingId), name: parsed.name, amountG, nutrients: scaleNutrients(parsed.per100g, amountG) });
      router.navigate("/");
      return;
    }
    const id = await food.save({ id: null, source: barcode ? "MANUAL" : "CUSTOM", sourceRef: barcode ?? null, ...parsed });
    router.push({ pathname: "/add/amount", params: { foodItemId: String(id), date: logDate, meal: mealType } });
  };

  return (
    <ScreenScroll>
      <FormFood values={values} onChange={(next) => { setValues(next); setHasError(false); }} />
      {hasError ? <TextBody>{t("form.invalid")}</TextBody> : null}
      <Button label={t("common.save")} onPress={() => void save()} testID="manual-save" />
    </ScreenScroll>
  );
}
