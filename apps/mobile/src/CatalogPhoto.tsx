import { useContext, useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Icon, Language, Txt, colors, type IconName } from "./ui";

/** A model photo never falls back to a photo of a different product. */
export function CatalogPhoto({
  uri,
  icon = "gear",
  height = 140,
}: {
  uri: string | null;
  icon?: IconName;
  height?: number;
}) {
  const ar = useContext(Language) === "ar";
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return (
    <View style={[s.frame, { height }]}>
      {uri && !failed ? (
        <Image
          accessibilityLabel={
            ar ? "صورة الأداة من مصدرها" : "Equipment photo from its source"
          }
          source={{ uri }}
          resizeMode="contain"
          style={s.image}
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <Icon
            name={icon}
            size={height <= 100 ? 28 : 48}
            color={colors.brown}
          />
          <Txt
            style={[
              s.caption,
              height <= 100 && { fontSize: 9, lineHeight: 14 },
            ]}
          >
            {ar ? "صورة الموديل غير متوفرة" : "Model photo unavailable"}
          </Txt>
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  frame: {
    width: "100%",
    borderRadius: 18,
    backgroundColor: "#EEE6D9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    gap: 10,
  },
  image: { width: "100%", height: "100%" },
  caption: { fontSize: 11, color: colors.muted, textAlign: "center" },
});
