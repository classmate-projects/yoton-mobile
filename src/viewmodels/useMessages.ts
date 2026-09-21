import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/api/client";
import { Endpoints } from "@/api/endpoints";
import type { ApiEnvelope, ChatContact, ChatConversationItem, ChatMessageItem, ChatPresence } from "@/api/types";
import { chatRealtime } from "@/services/chatRealtime";
import { LogService } from "@/services/logger";
import { parseServerUtcDate } from "@/utils/date";

const newestFirst = (a: ChatConversationItem, b: ChatConversationItem) => {
  const at = a.lastMessageAt ? parseServerUtcDate(a.lastMessageAt).getTime() : 0;
  const bt = b.lastMessageAt ? parseServerUtcDate(b.lastMessageAt).getTime() : 0;
  return bt - at;
};

// The Messages tab: the patient's conversation list - care-team doctors plus the shared Reception
// inbox (see ChatController.GetContacts). Tapping a row opens the thread; a contact with no
// conversation yet appears as an empty row and the conversation is created on first send.
// (Port of the MAUI MessagesViewModel.)
export function useMessages() {
  const [isBusy, setIsBusy] = useState(false);
  const loading = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ChatConversationItem[]>([]);
  // Lets the realtime handler check membership without doing side effects inside a state updater.
  const conversationsRef = useRef<ChatConversationItem[]>([]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  // Assigned a new Set on every change (not mutated) so consumers re-render.
  const [onlinePresence, setOnlinePresence] = useState<Set<string>>(new Set());

  const loadConversations = useCallback(async (): Promise<ChatConversationItem[]> => {
    try {
      const response = await api.get<ApiEnvelope<ChatConversationItem[]>>(Endpoints.chat.conversations);
      const items = response.data ?? [];

      // Every care-team doctor / Reception is reachable before a first message exists: contacts
      // with no conversation yet show as an empty row the patient can tap straight into.
      const contactsResponse = await api.get<ApiEnvelope<ChatContact[]>>(Endpoints.chat.contacts);
      const existingOtherIds = new Set(items.map((c) => c.otherId));
      const placeholders: ChatConversationItem[] = (contactsResponse.data ?? [])
        .filter((c) => !existingOtherIds.has(c.id))
        .map((c) => ({
          chatConversationId: "",
          otherId: c.id,
          otherType: c.type,
          otherName: c.name,
          otherAvatarUrl: c.avatarUrl,
          lastMessage: null,
          lastMessageAt: null,
          unreadCount: 0,
        }));

      const merged = [...items, ...placeholders].sort(newestFirst);
      setConversations(merged);
      return merged;
    } catch (error) {
      LogService.write(`Failed to load conversations: ${error}`);
      return [];
    }
  }, []);

  // Doctor/staff contacts only: a patient and the virtual Reception contact are never "online" in
  // this sense, so there's nothing to look up for those rows.
  const loadPresence = useCallback(async (list: ChatConversationItem[]) => {
    const ids = [...new Set(list.filter((c) => c.otherType === "User").map((c) => c.otherId))];
    if (ids.length === 0) return;

    try {
      const response = await api.get<ApiEnvelope<ChatPresence[]>>(Endpoints.chat.presence(ids.join(",")));
      setOnlinePresence(new Set((response.data ?? []).filter((p) => p.isOnline).map((p) => p.userId)));
    } catch (error) {
      LogService.write(`Failed to load presence: ${error}`);
    }
  }, []);

  const initialize = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    setIsBusy(true);
    try {
      const list = await loadConversations();
      void loadPresence(list);
      await chatRealtime.tryEnsureConnected();
    } finally {
      loading.current = false;
      setIsBusy(false);
    }
  }, [loadConversations, loadPresence]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadConversations();
    setIsRefreshing(false);
  }, [loadConversations]);

  // A message arriving for a conversation this list already knows about bumps it to the top with
  // one more unread; the thread screen (if open) shows the message itself via its own subscription.
  // An unknown conversation triggers a reload instead.
  useEffect(() => {
    const offMessage = chatRealtime.onMessageReceived((message: ChatMessageItem) => {
      const known = conversationsRef.current.some((c) => c.chatConversationId === message.chatConversationId);
      if (!known) {
        void loadConversations();
        return;
      }
      setConversations((current) =>
        current
          .map((c) =>
            c.chatConversationId === message.chatConversationId
              ? { ...c, lastMessage: message.content, lastMessageAt: message.createdAt, unreadCount: c.unreadCount + 1 }
              : c,
          )
          .sort(newestFirst),
      );
    });

    const offPresence = chatRealtime.onPresenceChanged((userId, isOnline) => {
      setOnlinePresence((current) => {
        const next = new Set(current);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    return () => {
      offMessage();
      offPresence();
    };
  }, [loadConversations]);

  return { isBusy, isRefreshing, conversations, onlinePresence, initialize, refresh };
}
