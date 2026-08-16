using Microsoft.AspNetCore.SignalR.Client;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Models;

namespace Yoton_Mobile.Services
{
    // Mirrors the web app's lib/chatSignalR.ts: a single authenticated connection to
    // /chat-hub, reused across pages, reading the JWT from SecureStorage the same way
    // ApiService does for ordinary REST calls. Registered as AddSingleton in MauiProgram so
    // every page shares one live connection instead of reconnecting per-visit.
    public class ChatRealtimeService
    {
        private HubConnection? _connection;
        private Task? _startTask;

        public event Action<ChatMessageItem>? MessageReceived;
        public event Action<ChatMessageItem>? MessageUpdated; // reaction added/removed
        public event Action<string, string>? TypingReceived; // conversationId, userId
        public event Action<string, bool>? PresenceChanged; // userId, isOnline

        public async Task EnsureConnectedAsync()
        {
            if (_connection == null)
            {
                _connection = new HubConnectionBuilder()
                    .WithUrl($"{APILibrary.BaseUrl}/chat-hub", options =>
                    {
                        options.AccessTokenProvider = () => SecureStorage.Default.GetAsync("auth_token");
                    })
                    .WithAutomaticReconnect()
                    .Build();

                _connection.On<ChatMessageItem>("messageReceived", message => MessageReceived?.Invoke(message));
                _connection.On<ChatMessageItem>("messageUpdated", message => MessageUpdated?.Invoke(message));
                _connection.On<TypingPayload>("typing", payload => TypingReceived?.Invoke(payload.ConversationId, payload.UserId));
                _connection.On<PresencePayload>("presenceChanged", payload => PresenceChanged?.Invoke(payload.UserId, payload.IsOnline));
            }

            if (_connection.State == HubConnectionState.Disconnected)
            {
                _startTask ??= _connection.StartAsync();
                await _startTask;
                _startTask = null;
            }
        }

        public Task SendTypingAsync(string conversationId, string recipientId)
        {
            if (_connection == null || _connection.State != HubConnectionState.Connected)
                return Task.CompletedTask;
            return _connection.InvokeAsync("Typing", conversationId, recipientId);
        }

        public async Task DisconnectAsync()
        {
            if (_connection != null)
            {
                await _connection.StopAsync();
            }
        }

        private class TypingPayload
        {
            public string ConversationId { get; set; } = string.Empty;
            public string UserId { get; set; } = string.Empty;
        }

        private class PresencePayload
        {
            public string UserId { get; set; } = string.Empty;
            public bool IsOnline { get; set; }
        }
    }
}
