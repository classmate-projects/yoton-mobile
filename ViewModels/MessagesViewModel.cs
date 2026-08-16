using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Models;
using Yoton_Mobile.Pages;
using Yoton_Mobile.Services;

namespace Yoton_Mobile.ViewModels
{
    // The "Messages" tab: the patient's conversation list (care-team doctors + the shared
    // Reception inbox - see ChatController.GetContacts). Tapping a conversation pushes
    // ChatThreadPage; tapping a contact with no conversation yet creates one first.
    public partial class MessagesViewModel : BaseViewModel
    {
        private readonly ApiService _api;
        private readonly ChatRealtimeService _chat;

        [ObservableProperty]
        ObservableCollection<ChatConversationItem> conversations = new();

        [ObservableProperty]
        bool isRefreshing;

        [ObservableProperty]
        HashSet<string> onlinePresence = new();

        public MessagesViewModel(ApiService api, ChatRealtimeService chat)
        {
            _api = api;
            _chat = chat;
            Title = "Messages";
        }

        public async Task InitializeAsync()
        {
            if (IsBusy) return;
            IsBusy = true;
            try
            {
                await LoadConversationsAsync();
                _ = LoadPresenceAsync();
                await _chat.EnsureConnectedAsync();
                _chat.MessageReceived -= OnMessageReceived;
                _chat.PresenceChanged -= OnPresenceChanged;
                _chat.MessageReceived += OnMessageReceived;
                _chat.PresenceChanged += OnPresenceChanged;
            }
            finally
            {
                IsBusy = false;
            }
        }

        // Doctor/staff contacts only - Patient and the virtual Reception contact are never
        // "online" in this sense, so there's nothing to look up for those rows.
        private async Task LoadPresenceAsync()
        {
            var ids = Conversations.Where(c => c.OtherType == "User").Select(c => c.OtherId).Distinct().ToList();
            if (ids.Count == 0) return;

            try
            {
                var response = await _api.GetAsync<ApiEnvelope<List<ChatPresence>>>(APILibrary.Chat.Presence(string.Join(",", ids)));
                OnlinePresence = (response?.Data ?? new List<ChatPresence>())
                    .Where(p => p.IsOnline)
                    .Select(p => p.UserId)
                    .ToHashSet();
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to load presence: {ex}");
            }
        }

        private void OnPresenceChanged(string userId, bool isOnline)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                var updated = new HashSet<string>(OnlinePresence);
                if (isOnline) updated.Add(userId); else updated.Remove(userId);
                OnlinePresence = updated;
            });
        }

        private async Task LoadConversationsAsync()
        {
            try
            {
                var response = await _api.GetAsync<ApiEnvelope<List<ChatConversationItem>>>(APILibrary.Chat.Conversations);
                var items = response?.Data ?? new List<ChatConversationItem>();

                // Every care-team doctor / Reception should be reachable even before a first
                // message exists, so contacts with no conversation yet appear as an empty row
                // the patient can tap straight into (ChatThreadPage creates the conversation
                // lazily on first send).
                var contactsResponse = await _api.GetAsync<ApiEnvelope<List<ChatContact>>>(APILibrary.Chat.Contacts);
                var existingOtherIds = items.Select(c => c.OtherId).ToHashSet();
                var placeholders = (contactsResponse?.Data ?? new List<ChatContact>())
                    .Where(c => !existingOtherIds.Contains(c.Id))
                    .Select(c => new ChatConversationItem
                    {
                        ChatConversationId = string.Empty,
                        OtherId = c.Id,
                        OtherType = c.Type,
                        OtherName = c.Name,
                        OtherAvatarUrl = c.AvatarUrl,
                        LastMessage = null,
                        LastMessageAt = DateTime.MinValue
                    });

                Conversations = new ObservableCollection<ChatConversationItem>(
                    items.Concat(placeholders).OrderByDescending(c => c.LastMessageAt));
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to load conversations: {ex}");
            }
        }

        [RelayCommand]
        private async Task Refresh()
        {
            IsRefreshing = true;
            await LoadConversationsAsync();
            IsRefreshing = false;
        }

        [RelayCommand]
        private async Task OpenConversation(ChatConversationItem conversation)
        {
            if (conversation == null) return;
            await Shell.Current.GoToAsync(nameof(ChatThreadPage), new Dictionary<string, object>
            {
                ["Conversation"] = conversation
            });
        }

        // A message arriving for a conversation this list already knows about just bumps it
        // to the top with an incremented unread count; the thread page itself (if open) shows
        // the message live via its own subscription.
        private void OnMessageReceived(ChatMessageItem message)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                var existing = Conversations.FirstOrDefault(c => c.ChatConversationId == message.ChatConversationId);
                if (existing == null)
                {
                    _ = LoadConversationsAsync();
                    return;
                }

                existing.LastMessage = message.Content;
                existing.LastMessageAt = message.CreatedAt;
                existing.UnreadCount++;
                Conversations = new ObservableCollection<ChatConversationItem>(Conversations.OrderByDescending(c => c.LastMessageAt));
            });
        }
    }
}
