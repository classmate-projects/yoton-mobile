import { useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import * as WebBrowser from "expo-web-browser";
import { useMemo, useRef } from "react";
import {
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { backendAssetUrl } from "@/api/endpoints";
import { CHAT_REACTION_EMOJIS, type ChatMessageItem } from "@/api/types";
import { AppButton } from "@/components/AppButton";
import { AppText } from "@/components/AppText";
import { KeyboardAvoid } from "@/components/KeyboardAvoid";
import { withoutAppLock } from "@/services/appLock";
import { LogService } from "@/services/logger";
import { argb, palette } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/typography";
import { formatChatStamp, parseServerUtcDate } from "@/utils/date";
import { useChatThread, type ThreadSeed } from "@/viewmodels/useChatThread";

const DOUBLE_TAP_MS = 300;

// One conversation. The conversation summary arrives as route params (the MAUI app passed the
// ChatConversationItem through Shell query properties). (Port of the MAUI ChatThreadPage.)
export default function ChatThreadScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    chatConversationId?: string;
    otherId: string;
    otherType: string;
    otherName: string;
    unreadCount?: string;
  }>();

  const seed = useMemo<ThreadSeed>(
    () => ({
      chatConversationId: params.chatConversationId ?? "",
      otherId: params.otherId,
      otherType: params.otherType,
      otherName: params.otherName,
      unreadCount: Number(params.unreadCount ?? 0),
    }),
    [params.chatConversationId, params.otherId, params.otherType, params.otherName, params.unreadCount],
  );

  const t = useChatThread(seed);
  const listRef = useRef<FlatList<ChatMessageItem>>(null);

  const inputColor = theme.isDark ? "#FFFFFF" : palette.neutral[900];

  return (
    <KeyboardAvoid underHeader style={{ backgroundColor: theme.pageBg }}>
      <Stack.Screen options={{ title: seed.otherName }} />

      {/* PRESENCE + TYPING */}
      {(t.isOtherOnline || !!t.typingLabel) && (
        <View style={styles.status}>
          {t.isOtherOnline && (
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <AppText variant="labelLight" size={11}>
                Online
              </AppText>
            </View>
          )}
          {!!t.typingLabel && (
            <AppText size={11} color={palette.primary[500]}>
              {t.typingLabel}
            </AppText>
          )}
        </View>
      )}

      {/* MESSAGE THREAD */}
      <Pressable accessible={false} onPress={Keyboard.dismiss} style={styles.fill}>
        <FlatList
          ref={listRef}
          data={t.messages}
          keyExtractor={(m) => m.chatMessageId}
          keyboardShouldPersistTaps="handled"
          style={styles.fill}
          contentContainerStyle={{ paddingHorizontal: 15, paddingVertical: 5 }}
          ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
          // New messages (sent, received, or the initial history) scroll into view.
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <MessageRow
              message={item}
              otherName={seed.otherName}
              pickerOpen={t.reactionPickerMessageId === item.chatMessageId}
              onToggleReactions={() => t.toggleReactionPicker(item)}
              onPickEmoji={(emoji) => void t.pickEmoji(emoji)}
              onReply={() => t.setReplyingTo(item)}
            />
          )}
        />
      </Pressable>

      {/* REPLY BAR */}
      {t.replyingTo && (
        <View style={[styles.replyBar, { backgroundColor: theme.isDark ? "#1A1D21" : "#EFF3F8" }]}>
          <AppText variant="labelLight" size={12} numberOfLines={1} style={{ flex: 1 }}>
            {`Replying to: ${t.replyingTo.content}`}
          </AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel reply" hitSlop={10} onPress={() => t.setReplyingTo(null)}>
            <AppText size={12}>✕</AppText>
          </Pressable>
        </View>
      )}

      {/* STAGED ATTACHMENTS */}
      {t.pendingFiles.length > 0 && (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginVertical: 4 }}
          contentContainerStyle={{ paddingHorizontal: 15, gap: 8 }}
        >
          {t.pendingFiles.map((file, index) => (
            <View key={`${file.uri}-${index}`} style={styles.pending}>
              <AppText size={11} numberOfLines={1} style={{ maxWidth: 180 }}>
                {file.name}
              </AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${file.name}`} hitSlop={8} onPress={() => t.removePendingFile(file)}>
                <AppText size={11}>✕</AppText>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {/* COMPOSER */}
      <View style={[styles.composer, { backgroundColor: theme.card, paddingBottom: 12 + insets.bottom }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Attach a file" hitSlop={8} onPress={() => void t.pickAttachment()}>
          <AppText size={20}>📎</AppText>
        </Pressable>
        <TextInput
          underlineColorAndroid="transparent"
          value={t.newMessageText}
          onChangeText={t.onChangeText}
          placeholder="Type a secure message..."
          placeholderTextColor={theme.placeholder}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => void t.sendMessage()}
          style={[styles.input, { color: inputColor, fontFamily: fonts.notoSansRegular }]}
        />
        <AppButton title="Send" height={42} style={{ width: 70, paddingHorizontal: 0, paddingVertical: 0 }} onPress={() => void t.sendMessage()} />
      </View>
    </KeyboardAvoid>
  );
}

interface MessageRowProps {
  message: ChatMessageItem;
  otherName: string;
  pickerOpen: boolean;
  onToggleReactions: () => void;
  onPickEmoji: (emoji: string) => void;
  onReply: () => void;
}

function MessageRow({ message, otherName, pickerOpen, onToggleReactions, onPickEmoji, onReply }: MessageRowProps) {
  const theme = useTheme();
  const mine = message.senderType === "Patient";
  const lastTap = useRef(0);

  // Double-tap a bubble to open its reaction row (long-press does too - the natural phone gesture).
  const onBubblePress = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      onToggleReactions();
      return;
    }
    lastTap.current = now;
  };

  const textColor = mine ? "#FFFFFF" : theme.isDark ? "#F9FAFB" : "#111827";
  const align = mine ? "flex-end" : "flex-start";

  const openAttachment = async (filePath: string) => {
    const url = backendAssetUrl(filePath);
    if (!url) return;
    try {
      await withoutAppLock(() => WebBrowser.openBrowserAsync(url));
    } catch (error) {
      LogService.write(`Failed to open attachment: ${error}`);
    }
  };

  return (
    <View style={{ gap: 4 }}>
      <Pressable
        onPress={onBubblePress}
        onLongPress={onToggleReactions}
        style={[
          styles.bubble,
          {
            alignSelf: align,
            backgroundColor: mine ? palette.primary[500] : theme.isDark ? "#2A2E33" : "#E5E7EB",
          },
        ]}
      >
        {!mine && (
          <AppText bold size={11} color={palette.primary[700]}>
            {otherName}
          </AppText>
        )}

        {!!message.replyToPreview && (
          <View style={styles.replyPreview}>
            <AppText size={11} color={textColor} numberOfLines={1}>
              {message.replyToPreview}
            </AppText>
          </View>
        )}

        {!!message.content && (
          <AppText size={14} color={textColor}>
            {message.content}
          </AppText>
        )}

        {message.attachments.length > 0 && (
          <View style={{ gap: 4 }}>
            {message.attachments.map((attachment) => (
              <Pressable
                key={attachment.chatMessageAttachmentId}
                accessibilityRole="button"
                accessibilityLabel={`Open ${attachment.fileName}`}
                onPress={() => void openAttachment(attachment.filePath)}
                style={styles.attachment}
              >
                <AppText size={12} color={textColor} numberOfLines={1}>
                  {attachment.fileName}
                </AppText>
              </Pressable>
            ))}
          </View>
        )}

        {message.reactions.length > 0 && (
          <View style={styles.reactions}>
            {message.reactions.map((reaction) => (
              <View
                key={reaction.emoji}
                style={[
                  styles.reaction,
                  reaction.reactedByMe && { borderColor: palette.primary[500], backgroundColor: argb("#220A6CFF") },
                ]}
              >
                <AppText size={11} color={textColor}>{`${reaction.emoji} ${reaction.count}`}</AppText>
              </View>
            ))}
          </View>
        )}
      </Pressable>

      {/* Emoji row: only visible for the one message currently toggled open. */}
      {pickerOpen && (
        <View style={styles.emojiRow}>
          {CHAT_REACTION_EMOJIS.map((emoji) => (
            <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`React ${emoji}`} hitSlop={6} onPress={() => onPickEmoji(emoji)}>
              <AppText size={18}>{emoji}</AppText>
            </Pressable>
          ))}
        </View>
      )}

      {/* React / Reply actions - always visible under each bubble. */}
      <View style={[styles.actions, { alignSelf: align }]}>
        <Pressable accessibilityRole="button" hitSlop={6} onPress={onToggleReactions}>
          <AppText size={11} color={palette.primary[500]}>
            React
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" hitSlop={6} onPress={onReply}>
          <AppText size={11} color={palette.primary[500]}>
            Reply
          </AppText>
        </Pressable>
      </View>

      <AppText variant="labelLight" size={10} style={{ alignSelf: align, marginHorizontal: 5 }}>
        {formatChatStamp(parseServerUtcDate(message.createdAt))}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  status: { paddingHorizontal: 15, paddingVertical: 6, gap: 1 },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.success },
  bubble: { maxWidth: 280, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  replyPreview: { backgroundColor: argb("#22000000"), borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, opacity: 0.75 },
  attachment: { backgroundColor: argb("#22000000"), borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  reactions: { flexDirection: "row", flexWrap: "wrap" },
  reaction: {
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: argb("#22000000"),
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    marginRight: 4,
  },
  emojiRow: { flexDirection: "row", gap: 6, marginHorizontal: 5 },
  actions: { flexDirection: "row", gap: 14, marginHorizontal: 5 },
  replyBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15, paddingVertical: 6 },
  pending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: palette.neutral[100],
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  input: { flex: 1, height: 42, fontSize: 14 },
});
