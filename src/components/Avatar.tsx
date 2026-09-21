import { View } from "react-native";

import { palette } from "@/theme/colors";
import { getInitials } from "@/utils/initials";

import { AppText } from "./AppText";

// Initials circle (Primary-100 fill, Primary-700 bold letters) as used for chat contacts.
export function Avatar({ name, size = 46 }: { name: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette.primary[100],
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AppText bold size={Math.round(size * 0.35)} color={palette.primary[700]}>
        {getInitials(name)}
      </AppText>
    </View>
  );
}
