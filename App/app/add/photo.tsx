/** Add a product from photos: optional AI label reading (user's OpenAI key), manual review, and sharing with Open Food Facts. */
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Switch, View } from "react-native";
import { LlmError } from "../../src/data/ClientOpenAi";
import { formatDate } from "../../src/domain/Dates";
import { mealTypes, type MealType } from "../../src/domain/Models";
import { createEmptyFoodForm, parseFoodForm, toFoodForm } from "../../src/domain/ParserFoodForm";
import { FormFood } from "../../src/ui/components/FormFood";
import { Button, Card, Field, ScreenScroll, TextBody, TextHeading } from "../../src/ui/components/Primitives";
import { readOpenAiKey } from "../../src/data/StoreSecret";
import { useServices } from "../../src/ui/Services";

type Slot = "front" | "nutrition" | "ingredients";
const slots: Slot[] = ["front", "nutrition", "ingredients"];
interface Photo {
  uri: string;
  base64: string;
}

/** Resizes to at most 1280 px wide and encodes as JPEG. */
async function preparePhoto(uri: string): Promise<Photo> {
  const result = await manipulateAsync(uri, [{ resize: { width: 1280 } }], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
  return { uri: result.uri, base64: result.base64 ?? "" };
}

export default function PhotoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { date, meal, barcode: barcodeParam } = useLocalSearchParams<{ date?: string; meal?: string; barcode?: string }>();
  const { food, server, settings, createLlmClient } = useServices();

  const [photos, setPhotos] = useState<Partial<Record<Slot, Photo>>>({});
  const [values, setValues] = useState(createEmptyFoodForm());
  const [barcode, setBarcode] = useState(barcodeParam ?? "");
  const [ingredientsText, setIngredientsText] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [status, setStatus] = useState<"idle" | "reading" | "read">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [contribute, setContribute] = useState(settings.getContributeToOff());
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    void readOpenAiKey().then((key) => setHasKey(Boolean(key)));
  }, []);

  const mealType: MealType = mealTypes.includes(meal as MealType) ? (meal as MealType) : "snack";
  const logDate = date ?? formatDate(new Date());

  const pick = async (slot: Slot, source: "camera" | "gallery") => {
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.8 };
    if (source === "camera") await ImagePicker.requestCameraPermissionsAsync();
    const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) {
      const prepared = await preparePhoto(asset.uri);
      setPhotos((current) => ({ ...current, [slot]: prepared }));
    }
  };

  const read = async () => {
    const images = slots.flatMap((slot) => (photos[slot] ? [photos[slot]!.base64] : []));
    if (images.length === 0) return setMessage(t("photo.noImages"));
    const client = await createLlmClient();
    if (!client) return setMessage(t("photo.needKey"));
    setStatus("reading");
    setMessage(null);
    try {
      const product = await client.extractProduct(images);
      setValues(toFoodForm({ name: product.name, brand: product.brand, servingG: product.servingG, per100g: product.per100g }));
      setIngredientsText(product.ingredientsText);
      setStatus("read");
      setMessage(t("photo.reviewNote"));
    } catch (error) {
      setStatus("idle");
      const kind = error instanceof LlmError ? error.kind : "failed";
      setMessage(t(kind === "invalidKey" ? "photo.invalidKey" : kind === "rateLimited" ? "photo.rateLimited" : "photo.failed"));
    }
  };

  const shareWithOff = async (parsed: NonNullable<ReturnType<typeof parseFoodForm>>): Promise<boolean> => {
    try {
      await server.contributeProduct({ barcode, name: parsed.name, brand: parsed.brand || undefined, ingredientsText: ingredientsText || undefined, servingG: parsed.servingG ?? undefined, nutrients: parsed.per100g });
      for (const slot of slots) {
        const photo = photos[slot];
        if (photo) await server.contributeImage(barcode, slot, await (await fetch(photo.uri)).blob());
      }
      return true;
    } catch {
      return false;
    }
  };

  const save = async () => {
    const parsed = parseFoodForm(values);
    if (!parsed) return setHasError(true);
    const hasBarcode = /^\d{8,14}$/.test(barcode);
    const id = await food.save({ id: null, source: hasBarcode ? "OFF" : "MANUAL", sourceRef: hasBarcode ? barcode : null, ...parsed });
    if (contribute && hasBarcode) setMessage((await shareWithOff(parsed)) ? t("photo.contributed") : t("photo.contributeFailed"));
    router.replace({ pathname: "/add/amount", params: { foodItemId: String(id), date: logDate, meal: mealType } });
  };

  return (
    <ScreenScroll>
      {slots.map((slot) => (
        <Card key={slot}>
          <TextHeading>{t(`photo.${slot}`)}</TextHeading>
          {photos[slot] ? <Image source={{ uri: photos[slot]!.uri }} style={{ height: 120, borderRadius: 8 }} resizeMode="cover" accessibilityLabel={t("photo.attached")} /> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button variant="secondary" label={t("photo.camera")} onPress={() => void pick(slot, "camera")} />
            </View>
            <View style={{ flex: 1 }}>
              <Button variant="secondary" label={t("photo.gallery")} onPress={() => void pick(slot, "gallery")} />
            </View>
          </View>
        </Card>
      ))}

      <Button label={status === "reading" ? t("photo.reading") : t("photo.read")} onPress={() => void read()} disabled={status === "reading"} testID="read-ai" />
      {!hasKey ? <TextBody muted small>{t("photo.needKey")}</TextBody> : null}
      {message ? <TextBody>{message}</TextBody> : null}

      <Field label={t("photo.barcode")} value={barcode} onChangeText={(text) => setBarcode(text.replace(/\D/g, ""))} keyboardType="number-pad" />
      <FormFood values={values} onChange={(next) => { setValues(next); setHasError(false); }} />

      {/^\d{8,14}$/.test(barcode) ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <TextBody>{t("photo.contribute")}</TextBody>
          </View>
          <Switch value={contribute} onValueChange={setContribute} />
        </View>
      ) : null}
      {hasError ? <TextBody>{t("form.invalid")}</TextBody> : null}
      <Button label={t("common.save")} onPress={() => void save()} testID="photo-save" />
    </ScreenScroll>
  );
}
