/** Add food: search own foods, MEXT and chain menus; entry points for barcode, photo and manual input. */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { convertMenuItem } from "../../src/domain/ConverterMenuItem";
import type { FoodItem } from "../../src/domain/Models";
import { searchMext } from "../../src/domain/SearchMext";
import { ListFood } from "../../src/ui/components/ListFood";
import { Button, Card, Field, ScreenScroll, Segmented, TextBody, TextHeading } from "../../src/ui/components/Primitives";
import { useServices } from "../../src/ui/Services";

type Tab = "mine" | "mext" | "chain";
type ChainState = "idle" | "loading" | "done" | "error";

export default function AddScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { date, meal } = useLocalSearchParams<{ date: string; meal: string }>();
  const { food, server, pending, mextIndex } = useServices();

  const [tab, setTab] = useState<Tab>("mine");
  const [query, setQuery] = useState("");
  const [mineResults, setMineResults] = useState<FoodItem[]>([]);
  const [favorites, setFavorites] = useState<FoodItem[]>([]);
  const [frequent, setFrequent] = useState<FoodItem[]>([]);
  const [chainResults, setChainResults] = useState<FoodItem[]>([]);
  const [chainState, setChainState] = useState<ChainState>("idle");
  const [requestChain, setRequestChain] = useState("");
  const [requestMenuName, setRequestMenuName] = useState("");

  const params = { date, meal };
  const trimmed = query.trim();

  useEffect(() => {
    void food.listFavorites().then(setFavorites);
    void food.listFrequent(10).then(setFrequent);
  }, [food]);

  useEffect(() => {
    if (tab !== "mine") return;
    if (trimmed === "") setMineResults([]);
    else void food.searchMine(trimmed).then(setMineResults);
  }, [tab, trimmed, food]);

  useEffect(() => {
    setChainState("idle");
    setRequestMenuName(trimmed);
  }, [trimmed]);

  const select = async (item: FoodItem) => {
    const id = item.id ?? (await food.save(item));
    router.push({ pathname: "/add/amount", params: { ...params, foodItemId: String(id) } });
  };

  const searchChain = async () => {
    if (trimmed === "") return;
    setChainState("loading");
    try {
      setChainResults((await server.searchMenus(trimmed)).map(convertMenuItem));
      setChainState("done");
    } catch {
      setChainState("error");
    }
  };

  const requestMenu = async () => {
    try {
      const menuName = requestMenuName.trim();
      const serverRequestId = await server.createMenuRequest(requestChain.trim(), menuName);
      const pendingId = await pending.add(serverRequestId, requestChain.trim(), menuName);
      router.push({ pathname: "/add/manual", params: { ...params, pendingId: String(pendingId), name: menuName } });
    } catch {
      setChainState("error");
    }
  };

  const mextResults = tab === "mext" ? searchMext(mextIndex, trimmed) : [];

  return (
    <ScreenScroll>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label={t("add.scan")} variant="secondary" onPress={() => router.push({ pathname: "/add/scan", params })} testID="open-scan" />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t("add.photo")} variant="secondary" onPress={() => router.push({ pathname: "/add/photo", params })} testID="open-photo" />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t("add.manual")} variant="secondary" onPress={() => router.push({ pathname: "/add/manual", params })} testID="open-manual" />
        </View>
      </View>

      <Segmented<Tab>
        options={[
          { value: "mine", label: t("add.tabMine") },
          { value: "mext", label: t("add.tabMext") },
          { value: "chain", label: t("add.tabChain") },
        ]}
        value={tab}
        onChange={setTab}
      />
      <Field label={t("add.searchPlaceholder")} value={query} onChangeText={setQuery} testID="search-input" />

      {tab === "mine" ? (
        trimmed === "" ? (
          <>
            {favorites.length > 0 ? (
              <Card>
                <TextHeading>{t("add.favorites")}</TextHeading>
                <ListFood items={favorites} onSelect={select} />
              </Card>
            ) : null}
            {frequent.length > 0 ? (
              <Card>
                <TextHeading>{t("add.frequent")}</TextHeading>
                <ListFood items={frequent} onSelect={select} />
              </Card>
            ) : null}
          </>
        ) : mineResults.length === 0 ? (
          <TextBody muted>{t("add.noResults")}</TextBody>
        ) : (
          <Card>
            <ListFood items={mineResults} onSelect={select} />
          </Card>
        )
      ) : null}

      {tab === "mext" ? (
        <>
          <TextBody muted small>
            {t("add.mextNote")}
          </TextBody>
          {trimmed !== "" && mextResults.length === 0 ? (
            <TextBody muted>{t("add.noResults")}</TextBody>
          ) : (
            <Card>
              <ListFood items={mextResults} onSelect={select} />
            </Card>
          )}
        </>
      ) : null}

      {tab === "chain" ? (
        <>
          <Button label={t("common.search")} onPress={() => void searchChain()} disabled={trimmed === "" || chainState === "loading"} testID="search-chain" />
          {chainState === "idle" ? (
            <TextBody muted small>
              {t("add.chainHint")}
            </TextBody>
          ) : null}
          {chainState === "loading" ? <TextBody muted>{t("common.loading")}</TextBody> : null}
          {chainState === "error" ? <TextBody>{t("add.chainOffline")}</TextBody> : null}
          {chainState === "done" && chainResults.length > 0 ? (
            <Card>
              <ListFood items={chainResults} onSelect={select} />
            </Card>
          ) : null}
          {chainState === "done" && chainResults.length === 0 ? (
            <Card>
              <TextHeading>{t("add.requestTitle")}</TextHeading>
              <TextBody muted small>
                {t("add.requestHint")}
              </TextBody>
              <Field label={t("add.chainName")} value={requestChain} onChangeText={setRequestChain} testID="request-chain" />
              <Field label={t("add.menuName")} value={requestMenuName} onChangeText={setRequestMenuName} />
              <Button label={t("add.requestButton")} onPress={() => void requestMenu()} disabled={requestChain.trim() === "" || requestMenuName.trim() === ""} testID="request-menu" />
            </Card>
          ) : null}
        </>
      ) : null}
    </ScreenScroll>
  );
}
