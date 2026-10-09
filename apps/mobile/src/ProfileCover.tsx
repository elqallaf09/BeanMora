import { useContext } from "react";
import Svg, {
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { View } from "./native";
import { Language } from "./ui";
import { useTheme } from "./theme";

/** Lightweight vector cover from the approved social-profile mockup. */
export function ProfileCover({ compact = false }: { compact?: boolean }) {
  const ar = useContext(Language) === "ar";
  const { dark } = useTheme();
  return (
    <View
      testID="profile-cover"
      style={{
        height: compact ? 96 : 128,
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 1200 128"
        preserveAspectRatio="none"
        accessible={false}
        aria-hidden
      >
        <Defs>
          <LinearGradient id="profile-sand" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0" stopColor={dark ? "#3D3026" : "#E7D9C7"} />
            <Stop offset="1" stopColor={dark ? "#28211B" : "#F7F2E9"} />
          </LinearGradient>
          <LinearGradient id="profile-teal" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0" stopColor={dark ? "#205A5D" : "#287F82"} />
            <Stop offset="1" stopColor={dark ? "#12383B" : "#104E52"} />
          </LinearGradient>
        </Defs>
        <G transform={ar ? undefined : "translate(1200 0) scale(-1 1)"}>
          <Rect width="1200" height="128" fill="url(#profile-sand)" />
          <Path
            d="M0 60C145 9 170 129 465 128H0Z"
            fill={dark ? "#46372B" : "#F5EDDF"}
          />
          <Path
            d="M330 128C510 118 645 84 780 28C875-11 1010 0 1200 0V128Z"
            fill="url(#profile-teal)"
          />
          <Path
            d="M555 128C805 108 894 28 1200 13V128Z"
            fill={dark ? "#12383B" : "#104E52"}
            opacity={0.35}
          />
        </G>
      </Svg>
    </View>
  );
}
