/** Barcode scan (or manual barcode entry) and Open Food Facts lookup. */
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, View } from "react-native";
import { Button, ScreenScroll, Field, TextBody } from "../../src/ui/components/Primitives";
import { useServices } from "../../src/ui/Services";

type State = { kind: "idle" } | { kind: "looking"; code: string } | { kind: "notFound"; code: string } | { kind: "error" };

export default function ScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  const { food, openFoodFacts } = useServices();
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const isBusy = useRef(false);

  const lookup = async (barcode: string) => {
    if (isBusy.current || !/^\d{8,14}$/.test(barcode)) return;
    isBusy.current = true;
    setState({ kind: "looking", code: barcode });
    try {
      const found = (await food.findByBarcode(barcode)) ?? (await openFoodFacts.findByBarcode(barcode));
      if (!found) {
        setState({ kind: "notFound", code: barcode });
        return;
      }
      const id = found.id ?? (await food.save(found));
      router.replace({ pathname: "/add/amount", params: { ...params, foodItemId: String(id) } });
    } catch {
      setState({ kind: "error" });
    } finally {
      isBusy.current = false;
    }
  };

  const canScan = Platform.OS !== "web" && permission?.granted;

  return (
    <ScreenScroll>
      {Platform.OS !== "web" && permission && !permission.granted ? (
        <View style={{ gap: 8 }}>
          <TextBody>{t("scan.permission")}</TextBody>
          <Button label={t("scan.grant")} onPress={() => void requestPermission()} />
        </View>
      ) : null}
      {canScan ? <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }} onBarcodeScanned={(result) => void lookup(result.data)} /> : null}

      <TextBody muted small>
        {t("scan.enterManually")}
      </TextBody>
      <Field label={t("photo.barcode")} value={code} onChangeText={(text) => setCode(text.replace(/\D/g, ""))} keyboardType="number-pad" testID="barcode-input" />
      <Button label={t("scan.lookup")} onPress={() => void lookup(code)} disabled={!/^\d{8,14}$/.test(code)} testID="barcode-lookup" />

      {state.kind === "looking" ? <TextBody muted>{t("scan.looking", { code: state.code })}</TextBody> : null}
      {state.kind === "error" ? (
        <View style={{ gap: 8 }}>
          <TextBody>{t("scan.networkError")}</TextBody>
          <Button label={t("common.retry")} variant="secondary" onPress={() => setState({ kind: "idle" })} />
        </View>
      ) : null}
      {state.kind === "notFound" ? (
        <View style={{ gap: 8 }}>
          <TextBody>{t("scan.notFound")}</TextBody>
          <Button label={t("scan.addWithPhotos")} onPress={() => router.replace({ pathname: "/add/photo", params: { ...params, barcode: state.code } })} testID="add-with-photos" />
        </View>
      ) : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({ camera: { height: 280, borderRadius: 12, overflow: "hidden" } });
