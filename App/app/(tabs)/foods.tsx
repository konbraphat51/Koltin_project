/** My foods: favorites, foods the user created, and frequently eaten foods. */
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { formatDate } from "../../src/domain/Dates";
import { guessMealType } from "../../src/domain/Goals";
import type { FoodItem } from "../../src/domain/Models";
import { confirmAction } from "../../src/ui/Confirm";
import { ListFood } from "../../src/ui/components/ListFood";
import { Card, ScreenScroll, TextBody, TextHeading } from "../../src/ui/components/Primitives";
import { useServices } from "../../src/ui/Services";
import { usePalette } from "../../src/ui/Theme";

export default function FoodsScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const router = useRouter();
  const { food } = useServices();
  const [favorites, setFavorites] = useState<FoodItem[]>([]);
  const [mine, setMine] = useState<FoodItem[]>([]);
  const [frequent, setFrequent] = useState<FoodItem[]>([]);

  const reload = useCallback(async () => {
    setFavorites(await food.listFavorites());
    setMine(await food.listCustom());
    setFrequent(await food.listFrequent());
  }, [food]);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const open = (item: FoodItem) => router.push({ pathname: "/add/amount", params: { foodItemId: String(item.id), date: formatDate(new Date()), meal: guessMealType(new Date().getHours()) } });
  const remove = (item: FoodItem) =>
    confirmAction(t("foods.deleteFood"), t("common.delete"), t("common.cancel"), () => {
      if (item.id !== null) void food.delete(item.id).then(reload);
    });

  const section = (title: string, items: FoodItem[], isDeletable = false) => (
    <Card>
      <TextHeading>{title}</TextHeading>
      {items.length === 0 ? (
        <TextBody muted small>{t("foods.empty")}</TextBody>
      ) : (
        <ListFood
          items={items}
          onSelect={open}
          renderAction={
            isDeletable
              ? (item) => (
                  <Pressable accessibilityRole="button" accessibilityLabel={t("common.delete")} onPress={() => remove(item)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={20} color={palette.textMuted} />
                  </Pressable>
                )
              : undefined
          }
        />
      )}
    </Card>
  );

  return (
    <ScreenScroll>
      {section(t("foods.favorites"), favorites)}
      {section(t("foods.mine"), mine, true)}
      {section(t("foods.frequent"), frequent)}
    </ScreenScroll>
  );
}
