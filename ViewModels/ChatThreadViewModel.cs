using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Controls;
using Yoton_Mobile.Models;
using Yoton_Mobile.Services;

namespace Yoton_Mobile.ViewModels
{
    [QueryProperty(nameof(Conversation), "Conversation")]
    public partial class ChatThreadViewModel : BaseViewModel, IDisposable
    {
        private const long MaxAttachmentBytes = 5 * 1024 * 1024;

        private readonly ApiService _api;
        private readonly ChatRealtimeService _chat;
        private IDispatcherTimer? _typingClearTimer;
        private DateTime _lastTypingSentAt = DateTime.MinValue;

        [ObservableProperty]
        ChatConversationItem? conversation;

        [ObservableProperty]
        ObservableCollection<ChatMessageItem> messages = new();

        [ObservableProperty]
        string newMessageText = string.Empty;

        [ObservableProperty]
        bool isOtherOnline;

        [ObservableProperty]
        string? typingLabel;

        [ObservableProperty]
        ChatMessageItem? replyingTo;

        [ObservableProperty]
        ObservableCollection<Microsoft.Maui.Storage.FileResult> pendingFiles = new();

        // Which message's reaction row is currently expanded - a two-step "pick the message,
        // then pick the emoji" flow, since MAUI command bindings only carry one parameter and
        // a message+emoji pair would need a converter otherwise.
        [ObservableProperty]
        string? reactionPickerMessageId;

        public string[] ReactionEmojis => ChatReactionEmojis.All;

        public ChatThreadViewModel(ApiService api, ChatRealtimeService chat)
        {
            _api = api;
            _chat = chat;
        }

        partial void OnConversationChanged(ChatConversationItem? value)
        {
            Title = value?.OtherName ?? "Messages";
            _ = LoadAsync();
            _ = LoadPresenceAsync();
        }

        public async Task InitializeAsync()
        {
            await _chat.EnsureConnectedAsync();
            _chat.MessageReceived -= OnMessageReceived;
            _chat.MessageUpdated -= OnMessageUpdated;
            _chat.TypingReceived -= OnTypingReceived;
            _chat.PresenceChanged -= OnPresenceChanged;
            _chat.MessageReceived += OnMessageReceived;
            _chat.MessageUpdated += OnMessageUpdated;
            _chat.TypingReceived += OnTypingReceived;
            _chat.PresenceChanged += OnPresenceChanged;
        }

        public void Dispose()
        {
            _chat.MessageReceived -= OnMessageReceived;
            _chat.MessageUpdated -= OnMessageUpdated;
            _chat.TypingReceived -= OnTypingReceived;
            _chat.PresenceChanged -= OnPresenceChanged;
            _typingClearTimer?.Stop();
        }

        private async Task LoadAsync()
        {
            if (IsBusy || Conversation == null) return;
            IsBusy = true;
            try
            {
                // A conversation the patient hasn't messaged yet has no ChatConversationId
                // (see MessagesViewModel's placeholder rows) - nothing to load until they
                // send the first message, which creates it server-side.
                if (string.IsNullOrEmpty(Conversation.ChatConversationId))
                {
                    Messages = new ObservableCollection<ChatMessageItem>();
                    return;
                }

                var response = await _api.GetAsync<ApiEnvelope<List<ChatMessageItem>>>(
                    APILibrary.Chat.Messages(Conversation.ChatConversationId));
                Messages = new ObservableCollection<ChatMessageItem>(response?.Data ?? new List<ChatMessageItem>());

                if (Conversation.UnreadCount > 0)
                {
                    await _api.PostAsync<object>(APILibrary.Chat.MarkRead(Conversation.ChatConversationId), new { });
                }
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to load chat thread: {ex}");
            }
            finally
            {
                IsBusy = false;
            }
        }

        private async Task LoadPresenceAsync()
        {
            if (Conversation?.OtherType != "User") return;
            try
            {
                var response = await _api.GetAsync<ApiEnvelope<List<ChatPresence>>>(APILibrary.Chat.Presence(Conversation.OtherId));
                IsOtherOnline = response?.Data?.FirstOrDefault(p => p.UserId == Conversation.OtherId)?.IsOnline ?? false;
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to load presence: {ex}");
            }
        }

        [RelayCommand]
        private async Task PickAttachment()
        {
            try
            {
                var results = await Microsoft.Maui.Storage.FilePicker.Default.PickMultipleAsync();
                foreach (var file in results)
                {
                    if (file == null || string.IsNullOrEmpty(file.FullPath))
                        continue;

                    var info = new FileInfo(file.FullPath);
                    if (info.Exists && info.Length > MaxAttachmentBytes)
                    {
                        if (Shell.Current.CurrentPage is ContentPage page)
                            await LiquidGlassAlert.ShowAsync(page, "File too large", $"{file.FileName} is over the 5MB attachment limit.", "OK");
                        continue;
                    }
                    PendingFiles.Add(file);
                }
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to pick attachment: {ex}");
            }
        }

        [RelayCommand]
        private void RemovePendingFile(Microsoft.Maui.Storage.FileResult file) => PendingFiles.Remove(file);

        [RelayCommand]
        private void Reply(ChatMessageItem message) => ReplyingTo = message;

        [RelayCommand]
        private void CancelReply() => ReplyingTo = null;

        [RelayCommand]
        private void ToggleReactionPicker(ChatMessageItem message) =>
            ReactionPickerMessageId = ReactionPickerMessageId == message.ChatMessageId ? null : message.ChatMessageId;

        [RelayCommand]
        private async Task PickEmoji(string emoji)
        {
            var message = Messages.FirstOrDefault(m => m.ChatMessageId == ReactionPickerMessageId);
            ReactionPickerMessageId = null;
            if (message == null) return;

            var alreadyReacted = message.Reactions.Any(r => r.Emoji == emoji && r.ReactedByMe);
            try
            {
                var response = await _api.PostAsync<ApiEnvelope<ChatMessageItem>>(
                    APILibrary.Chat.Reactions(message.ChatMessageId),
                    new { emoji = alreadyReacted ? null : emoji });

                if (response?.Data != null)
                    ReplaceMessage(response.Data);
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to set reaction: {ex}");
            }
        }

        partial void OnNewMessageTextChanged(string value)
        {
            if (Conversation?.OtherType != "User" || string.IsNullOrEmpty(Conversation.ChatConversationId)) return;
            if ((DateTime.UtcNow - _lastTypingSentAt).TotalSeconds < 2) return;

            _lastTypingSentAt = DateTime.UtcNow;
            _ = _chat.SendTypingAsync(Conversation.ChatConversationId, Conversation.OtherId);
        }

        [RelayCommand]
        private async Task SendMessage()
        {
            if ((string.IsNullOrWhiteSpace(NewMessageText) && PendingFiles.Count == 0) || Conversation == null) return;
            var content = NewMessageText.Trim();
            var files = PendingFiles.ToList();
            var replyToId = ReplyingTo?.ChatMessageId;
            NewMessageText = string.Empty;
            PendingFiles = new ObservableCollection<Microsoft.Maui.Storage.FileResult>();
            ReplyingTo = null;

            try
            {
                // Lazily creates the conversation server-side on first send (see
                // ChatController.StartConversation) - a patient can open any of their care-
                // team doctors straight from the contact list with no prior thread.
                if (string.IsNullOrEmpty(Conversation.ChatConversationId))
                {
                    var started = await _api.PostAsync<ApiEnvelope<ChatConversationItem>>(
                        APILibrary.Chat.Conversations,
                        new { otherId = Conversation.OtherId, otherType = Conversation.OtherType });
                    if (started?.Data != null)
                        Conversation.ChatConversationId = started.Data.ChatConversationId;
                }

                var fields = new Dictionary<string, string> { ["conversationId"] = Conversation.ChatConversationId, ["content"] = content };
                if (!string.IsNullOrEmpty(replyToId)) fields["replyToMessageId"] = replyToId;

                var streams = new List<(string, string, Stream)>();
                try
                {
                    foreach (var file in files)
                        streams.Add(("files", file.FileName, await file.OpenReadAsync()));

                    var response = await _api.PostMultipartAsync<ApiEnvelope<ChatMessageItem>>(APILibrary.Chat.SendMessage, fields, streams);
                    if (response?.Data != null)
                        Messages.Add(response.Data);
                }
                finally
                {
                    foreach (var (_, _, stream) in streams) stream.Dispose();
                }
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to send chat message: {ex}");
                NewMessageText = content;
            }
        }

        private void ReplaceMessage(ChatMessageItem updated) =>
            MainThread.BeginInvokeOnMainThread(() =>
            {
                var index = Messages.ToList().FindIndex(m => m.ChatMessageId == updated.ChatMessageId);
                if (index >= 0) Messages[index] = updated;
            });

        private void OnMessageReceived(ChatMessageItem message)
        {
            if (Conversation == null || message.ChatConversationId != Conversation.ChatConversationId) return;

            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (Messages.Any(m => m.ChatMessageId == message.ChatMessageId)) return;
                Messages.Add(message);
                _ = _api.PostAsync<object>(APILibrary.Chat.MarkRead(Conversation.ChatConversationId), new { });
            });
        }

        private void OnMessageUpdated(ChatMessageItem message) => ReplaceMessage(message);

        private void OnTypingReceived(string conversationId, string userId)
        {
            if (Conversation == null || conversationId != Conversation.ChatConversationId) return;

            MainThread.BeginInvokeOnMainThread(() =>
            {
                TypingLabel = $"{Conversation.OtherName} is typing…";
                _typingClearTimer?.Stop();
                _typingClearTimer = Application.Current!.Dispatcher.CreateTimer();
                _typingClearTimer.Interval = TimeSpan.FromSeconds(3);
                _typingClearTimer.IsRepeating = false;
                _typingClearTimer.Tick += (_, _) => TypingLabel = null;
                _typingClearTimer.Start();
            });
        }

        private void OnPresenceChanged(string userId, bool isOnline)
        {
            if (Conversation?.OtherId != userId) return;
            MainThread.BeginInvokeOnMainThread(() => IsOtherOnline = isOnline);
        }
    }
}
