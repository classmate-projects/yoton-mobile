import * as DocumentPicker from "expo-document-picker";
import { useCallback, useEffect, useRef, useState } from "react";

import { api, type UploadFile } from "@/api/client";
import { Endpoints } from "@/api/endpoints";
import type { ApiEnvelope, ChatConversationItem, ChatMessageItem, ChatPresence } from "@/api/types";
import { useAlert } from "@/components/GlassDialogs";
import { withoutAppLock } from "@/services/appLock";
import { chatRealtime } from "@/services/chatRealtime";
import { LogService } from "@/services/logger";

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const TYPING_SEND_INTERVAL_MS = 2000;
const TYPING_LABEL_MS = 3000;

export interface ThreadSeed {
  chatConversationId: string;
  otherId: string;
  otherType: string;
  otherName: string;
  unreadCount: number;
}

export interface PendingFile extends UploadFile {
  size: number | null;
}

// One 1:1 conversation: history, live delivery, presence + typing indicators, reply-to, emoji
// reactions and attachments. (Port of the MAUI ChatThreadViewModel.)
export function useChatThread(seed: ThreadSeed) {
  const { showAlert } = useAlert();

  // A conversation the patient hasn't messaged yet has no id: nothing to load until they send the
  // first message, which creates it server-side.
  const [conversationId, setConversationId] = useState(seed.chatConversationId);
  const conversationIdRef = useRef(conversationId);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [isOtherOnline, setIsOtherOnline] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessageItem | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  // Which message's emoji row is open - a two-step "pick the message, then the emoji" flow.
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);

  const lastTypingSentAt = useRef(0);
  const typingClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isUserContact = seed.otherType === "User";

  // ---------------- loading ----------------

  const load = useCallback(async () => {
    if (!conversationIdRef.current) return;
    try {
      const response = await api.get<ApiEnvelope<ChatMessageItem[]>>(Endpoints.chat.messages(conversationIdRef.current));
      setMessages(response.data ?? []);

      if (seed.unreadCount > 0) {
        await api.post(Endpoints.chat.markRead(conversationIdRef.current), {});
      }
    } catch (error) {
      LogService.write(`Failed to load chat thread: ${error}`);
    }
  }, [seed.unreadCount]);

  const loadPresence = useCallback(async () => {
    if (!isUserContact) return;
    try {
      const response = await api.get<ApiEnvelope<ChatPresence[]>>(Endpoints.chat.presence(seed.otherId));
      setIsOtherOnline(response.data?.find((p) => p.userId === seed.otherId)?.isOnline ?? false);
    } catch (error) {
      LogService.write(`Failed to load presence: ${error}`);
    }
  }, [isUserContact, seed.otherId]);

  // ---------------- realtime ----------------

  const replaceMessage = useCallback((updated: ChatMessageItem) => {
    setMessages((current) => current.map((m) => (m.chatMessageId === updated.chatMessageId ? updated : m)));
  }, []);

  useEffect(() => {
    void load();
    // Both loaders only set state after their request resolves - never synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPresence();
    void chatRealtime.tryEnsureConnected();

    const offMessage = chatRealtime.onMessageReceived((message) => {
      if (!conversationIdRef.current || message.chatConversationId !== conversationIdRef.current) return;
      setMessages((current) =>
        current.some((m) => m.chatMessageId === message.chatMessageId) ? current : [...current, message],
      );
      void api.post(Endpoints.chat.markRead(conversationIdRef.current), {});
    });

    const offUpdated = chatRealtime.onMessageUpdated(replaceMessage);

    const offTyping = chatRealtime.onTyping((incomingConversationId) => {
      if (!conversationIdRef.current || incomingConversationId !== conversationIdRef.current) return;
      setTypingLabel(`${seed.otherName} is typing…`);
      if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
      typingClearTimer.current = setTimeout(() => setTypingLabel(null), TYPING_LABEL_MS);
    });

    const offPresence = chatRealtime.onPresenceChanged((userId, isOnline) => {
      if (userId === seed.otherId) setIsOtherOnline(isOnline);
    });

    return () => {
      offMessage();
      offUpdated();
      offTyping();
      offPresence();
      if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
    };
  }, [load, loadPresence, replaceMessage, seed.otherId, seed.otherName]);

  // ---------------- composing ----------------

  const onChangeText = useCallback(
    (value: string) => {
      setNewMessageText(value);

      if (!isUserContact || !conversationIdRef.current) return;
      if (Date.now() - lastTypingSentAt.current < TYPING_SEND_INTERVAL_MS) return;

      lastTypingSentAt.current = Date.now();
      void chatRealtime.sendTyping(conversationIdRef.current, seed.otherId);
    },
    [isUserContact, seed.otherId],
  );

  const pickAttachment = useCallback(async () => {
    try {
      const result = await withoutAppLock(() =>
        DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true }),
      );
      if (result.canceled) return;

      const accepted: PendingFile[] = [];
      for (const asset of result.assets) {
        if (asset.size != null && asset.size > MAX_ATTACHMENT_BYTES) {
          await showAlert({ title: "File too large", message: `${asset.name} is over the 5MB attachment limit.`, confirmText: "OK" });
          continue;
        }
        accepted.push({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size ?? null });
      }
      if (accepted.length > 0) setPendingFiles((current) => [...current, ...accepted]);
    } catch (error) {
      LogService.write(`Failed to pick attachment: ${error}`);
    }
  }, [showAlert]);

  const removePendingFile = useCallback((file: PendingFile) => {
    setPendingFiles((current) => current.filter((f) => f !== file));
  }, []);

  const toggleReactionPicker = useCallback((message: ChatMessageItem) => {
    setReactionPickerMessageId((current) => (current === message.chatMessageId ? null : message.chatMessageId));
  }, []);

  const pickEmoji = useCallback(
    async (emoji: string) => {
      const message = messages.find((m) => m.chatMessageId === reactionPickerMessageId);
      setReactionPickerMessageId(null);
      if (!message) return;

      // Picking the emoji you already reacted with removes your reaction.
      const alreadyReacted = message.reactions.some((r) => r.emoji === emoji && r.reactedByMe);
      try {
        const response = await api.post<ApiEnvelope<ChatMessageItem>>(Endpoints.chat.reactions(message.chatMessageId), {
          emoji: alreadyReacted ? null : emoji,
        });
        if (response?.data) replaceMessage(response.data);
      } catch (error) {
        LogService.write(`Failed to set reaction: ${error}`);
      }
    },
    [messages, reactionPickerMessageId, replaceMessage],
  );

  const sendMessage = useCallback(async () => {
    const content = newMessageText.trim();
    if (!content && pendingFiles.length === 0) return;

    const files = pendingFiles;
    const replyToId = replyingTo?.chatMessageId;
    setNewMessageText("");
    setPendingFiles([]);
    setReplyingTo(null);

    const restoreDraft = () => {
      setNewMessageText(content);
      setPendingFiles(files);
    };

    try {
      // Lazily creates the conversation server-side on first send (ChatController.StartConversation):
      // a patient can open any care-team doctor straight from the contact list with no prior thread.
      let id = conversationIdRef.current;
      if (!id) {
        const started = await api.post<ApiEnvelope<ChatConversationItem>>(Endpoints.chat.conversations, {
          otherId: seed.otherId,
          otherType: seed.otherType,
        });
        id = started?.data?.chatConversationId ?? "";
        if (id) setConversationId(id);
      }
      if (!id) throw new Error("Could not start the conversation");

      const fields: Record<string, string> = { conversationId: id, content };
      if (replyToId) fields.replyToMessageId = replyToId;

      const response = await api.postMultipart<ApiEnvelope<ChatMessageItem>>(Endpoints.chat.sendMessage, fields, files);
      if (!response?.data) throw new Error(response?.message ?? "The message was not accepted");

      const sent = response.data;
      setMessages((current) => (current.some((m) => m.chatMessageId === sent.chatMessageId) ? current : [...current, sent]));
    } catch (error) {
      LogService.write(`Failed to send chat message: ${error}`);
      restoreDraft();
      await showAlert({ title: "Message not sent", message: "Please check your connection and try again.", confirmText: "OK" });
    }
  }, [newMessageText, pendingFiles, replyingTo, seed.otherId, seed.otherType, showAlert]);

  return {
    messages,
    newMessageText,
    onChangeText,
    isOtherOnline,
    typingLabel,
    replyingTo,
    setReplyingTo,
    pendingFiles,
    reactionPickerMessageId,
    pickAttachment,
    removePendingFile,
    toggleReactionPicker,
    pickEmoji,
    sendMessage,
  };
}
