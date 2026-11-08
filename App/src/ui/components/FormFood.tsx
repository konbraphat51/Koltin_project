/** Editable food form: name, brand, serving size and nutrients per 100 g. */
import { nutrientKeys, type Nutrients } from "@nutri/shared";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import type { FoodFormValues } from "../../domain/ParserFoodForm";
import { Field, TextBody } from "./Primitives";

interface Props {
  values: FoodFormValues;
  onChange: (values: FoodFormValues) => void;
}

export function FormFood({ values, onChange }: Props) {
  const { t } = useTranslation();
  const setNutrient = (key: keyof Nutrients, text: string) => onChange({ ...values, nutrients: { ...values.nutrients, [key]: text } });
  return (
    <View style={{ gap: 12 }}>
      <Field label={t("form.name")} value={values.name} onChangeText={(name) => onChange({ ...values, name })} testID="form-name" />
      <Field label={t("form.brand")} value={values.brand} onChangeText={(brand) => onChange({ ...values, brand })} />
      <Field label={t("form.serving")} value={values.servingG} onChangeText={(servingG) => onChange({ ...values, servingG })} keyboardType="decimal-pad" />
      <TextBody muted>{t("form.per100g")}</TextBody>
      {nutrientKeys.map((key) => (
        <Field key={key} label={`${t(`nutrient.${key}`)} (${key === "energyKcal" ? t("common.kcal") : t("common.g")})`} value={values.nutrients[key]} onChangeText={(text) => setNutrient(key, text)} keyboardType="decimal-pad" testID={`form-${key}`} />
      ))}
    </View>
  );
}
