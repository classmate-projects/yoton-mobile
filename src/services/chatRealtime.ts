import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from "@microsoft/signalr";

import { Endpoints } from "@/api/endpoints";
import type { ChatMessageItem } from "@/api/types";

import { LogService } from "./logger";
import { secure, SecureKeys } from "./storage";

type Listener<T extends unknown[]> = (...args: T) => void;

interface TypingPayload {
  conversationId: string;
  userId: string;
}

interface PresencePayload {
  userId: string;
  isOnline: boolean;
}

// Mirrors the MAUI ChatRealtimeService (and the web app's lib/chatSignalR.ts): one authenticated
// connection to /chat-hub, shared by every screen so navigating around doesn't reconnect each
// time. The JWT is read from secure storage lazily, at (re)connect time.
class ChatRealtimeService {
  private connection: HubConnection | null = null;
  private startPromise: Promise<void> | null = null;

  private messageReceived = new Set<Listener<[ChatMessageItem]>>();
  private messageUpdated = new Set<Listener<[ChatMessageItem]>>();
  private typingReceived = new Set<Listener<[string, string]>>(); // conversationId, userId
  private presenceChanged = new Set<Listener<[string, boolean]>>(); // userId, isOnline

  onMessageReceived(listener: Listener<[ChatMessageItem]>): () => void {
    this.messageReceived.add(listener);
    return () => this.messageReceived.delete(listener);
  }

  onMessageUpdated(listener: Listener<[ChatMessageItem]>): () => void {
    this.messageUpdated.add(listener);
    return () => this.messageUpdated.delete(listener);
  }

  onTyping(listener: Listener<[string, string]>): () => void {
    this.typingReceived.add(listener);
    return () => this.typingReceived.delete(listener);
  }

  onPresenceChanged(listener: Listener<[string, boolean]>): () => void {
    this.presenceChanged.add(listener);
    return () => this.presenceChanged.delete(listener);
  }

  private build(): HubConnection {
    const connection = new HubConnectionBuilder()
      .withUrl(Endpoints.chat.hub, {
        accessTokenFactory: async () => (await secure.get(SecureKeys.authToken)) ?? "",
      })
      .withAutomaticReconnect()
      // The default logger writes to console.error, which pops a red error toast in dev builds every
      // time the OS suspends the socket in the background (the client then reconnects by itself).
      // Route warnings and errors to the app's own log file instead.
      .configureLogging({
        log: (level, message) => {
          if (level >= LogLevel.Warning) LogService.write(`SignalR: ${message}`);
        },
      })
      .build();

    connection.on("messageReceived", (message: ChatMessageItem) =>
      this.messageReceived.forEach((listener) => listener(message)),
    );
    connection.on("messageUpdated", (message: ChatMessageItem) =>
      this.messageUpdated.forEach((listener) => listener(message)),
    );
    connection.on("typing", (payload: TypingPayload) =>
      this.typingReceived.forEach((listener) => listener(payload.conversationId, payload.userId)),
    );
    connection.on("presenceChanged", (payload: PresencePayload) =>
      this.presenceChanged.forEach((listener) => listener(payload.userId, payload.isOnline)),
    );

    return connection;
  }

  /** Connects if needed. Safe to call repeatedly and from several screens at once. */
  async ensureConnected(): Promise<void> {
    if (!this.connection) this.connection = this.build();
    const connection = this.connection;

    if (connection.state === HubConnectionState.Disconnected) {
      this.startPromise ??= connection.start().finally(() => {
        this.startPromise = null;
      });
    }
    if (this.startPromise) await this.startPromise;
  }

  /** Like ensureConnected, but a failure is logged instead of thrown - chat is best-effort UI. */
  async tryEnsureConnected(): Promise<void> {
    try {
      await this.ensureConnected();
    } catch (error) {
      LogService.write(`Chat connection failed: ${error}`);
    }
  }

  async sendTyping(conversationId: string, recipientId: string): Promise<void> {
    if (this.connection?.state !== HubConnectionState.Connected) return;
    try {
      await this.connection.invoke("Typing", conversationId, recipientId);
    } catch {
      // A dropped typing indicator is not worth surfacing.
    }
  }

  /** Called on logout so the next account never inherits the previous user's connection. */
  async disconnect(): Promise<void> {
    const connection = this.connection;
    this.connection = null;
    this.startPromise = null;
    if (!connection) return;
    try {
      await connection.stop();
    } catch {
      // Already stopped.
    }
  }
}

export const chatRealtime = new ChatRealtimeService();
