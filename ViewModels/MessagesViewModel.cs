using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Collections.ObjectModel;
using Yoton_Mobile.BaseLibrary;

namespace Yoton_Mobile.ViewModels
{
    public class MessageItem
    {
        public string SenderName { get; set; }
        public string Content { get; set; }
        public string Time { get; set; }
        public bool IsMe { get; set; }
    }

    public partial class MessagesViewModel : BaseViewModel
    {
        [ObservableProperty]
        ObservableCollection<MessageItem> messages;

        [ObservableProperty]
        string newMessageText;

        public MessagesViewModel()
        {
            Title = "Messages";
            LoadMessages();
        }

        private void LoadMessages()
        {
            Messages = new ObservableCollection<MessageItem>
            {
                new MessageItem
                {
                    SenderName = "Dr. Michael Chen",
                    Content = "Hi there, I reviewed your blood reports from yesterday. The levels look much better since we adjusted the Metformin dosage.",
                    Time = "Yesterday, 3:45 PM",
                    IsMe = false
                },
                new MessageItem
                {
                    SenderName = "You",
                    Content = "That is great to hear! Should I continue taking it with breakfast and dinner?",
                    Time = "Yesterday, 4:10 PM",
                    IsMe = true
                },
                new MessageItem
                {
                    SenderName = "Dr. Michael Chen",
                    Content = "Yes, please continue that regimen. Let's schedule a follow-up in three weeks.",
                    Time = "Today, 10:15 AM",
                    IsMe = false
                }
            };
        }

        [RelayCommand]
        private void SendMessage()
        {
            if (string.IsNullOrWhiteSpace(NewMessageText))
                return;

            Messages.Add(new MessageItem
            {
                SenderName = "You",
                Content = NewMessageText,
                Time = DateTime.Now.ToString("h:mm tt"),
                IsMe = true
            });

            NewMessageText = string.Empty;
        }
    }
}
