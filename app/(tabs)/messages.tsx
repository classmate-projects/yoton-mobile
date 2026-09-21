import { router } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Avatar } from "@/components/Avatar";
import { useOnFocus } from "@/hooks/useFocus";
import { palette } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { useMessages } from "@/viewmodels/useMessages";
import type { ChatConversationItem } from "@/api/types";

// The patient's conversation list: care-team doctors plus the shared Reception inbox.
// (Port of the MAUI MessagesPage.)
export default function MessagesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isRefreshing, conversations, onlinePresence, initialize, refresh } = useMessages();

  useOnFocus(() => void initialize());

  const open = (c: ChatConversationItem) =>
    router.push({
      pathname: "/chat",
      params: {
        chatConversationId: c.chatConversationId,
        otherId: c.otherId,
        otherType: c.otherType,
        otherName: c.otherName,
        unreadCount: String(c.unreadCount),
      },
    });

  return (
    <View style={[styles.fill, { backgroundColor: theme.pageBg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppText variant="h2" bold>
          Messages
        </AppText>
        <AppText variant="labelLight">Chat securely with your care team and the front desk.</AppText>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(c) => c.chatConversationId || `contact-${c.otherId}`}
        ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText variant="labelLight" center>
              No conversations yet.
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => open(item)}
            style={({ pressed }) => [styles.row, { backgroundColor: theme.card }, pressed && { opacity: 0.85 }]}
          >
            <View>
              <Avatar name={item.otherName} size={46} />
              {onlinePresence.has(item.otherId) && (
                <View style={[styles.presence, { borderColor: theme.card }]} />
              )}
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <AppText bold size={15} numberOfLines={1}>
                {item.otherName}
              </AppText>
              <AppText variant="labelLight" size={13} numberOfLines={1}>
                {item.lastMessage ?? "Tap to start chatting"}
              </AppText>
            </View>

            {item.unreadCount > 0 && (
              <View style={styles.badge}>
                <AppText bold size={11} color="#FFFFFF">
                  {item.unreadCount}
                </AppText>
              </View>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10, gap: 4 },
  empty: { padding: 20, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  presence: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: palette.success,
  },
  badge: { backgroundColor: palette.primary[500], borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
});
