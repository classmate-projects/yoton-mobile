namespace Yoton_Mobile.Models
{
    // Client-side mirrors of Yoton_API.DTOs.ChatDTO — shared with the web app's /api/chat/*
    // endpoints (see APILibrary.Chat). A patient's ParticipantType is always "Patient", so
    // contacts/conversations here are always the *other* side: a doctor ("User") or the
    // shared front-desk inbox ("Reception").

    public class ChatContact
    {
        public string Id { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Role { get; set; }
        public string? AvatarUrl { get; set; }
    }

    public class ChatConversationItem
    {
        public string ChatConversationId { get; set; } = string.Empty;
        public string OtherId { get; set; } = string.Empty;
        public string OtherType { get; set; } = string.Empty;
        public string OtherName { get; set; } = string.Empty;
        public string? OtherAvatarUrl { get; set; }
        public string? LastMessage { get; set; }
        public DateTime LastMessageAt { get; set; }
        public int UnreadCount { get; set; }
    }

    public class ChatAttachment
    {
        public string ChatMessageAttachmentId { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; }
        public string? ContentType { get; set; }
    }

    public class ChatReactionSummary
    {
        public string Emoji { get; set; } = string.Empty;
        public int Count { get; set; }
        public bool ReactedByMe { get; set; }
    }

    public class ChatMessageItem
    {
        public string ChatMessageId { get; set; } = string.Empty;
        public string ChatConversationId { get; set; } = string.Empty;
        public string SenderId { get; set; } = string.Empty;
        public string SenderType { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? ReadAt { get; set; }
        public string? ReplyToMessageId { get; set; }
        public string? ReplyToPreview { get; set; }
        public List<ChatAttachment> Attachments { get; set; } = new();
        public List<ChatReactionSummary> Reactions { get; set; } = new();
    }

    public class ChatPresence
    {
        public string UserId { get; set; } = string.Empty;
        public bool IsOnline { get; set; }
    }

    // Fixed, small reaction set - matches the web app's CHAT_REACTION_EMOJIS, deliberately
    // not a full emoji keyboard (keeps this "professional", per the ask, not a consumer-chat
    // sticker picker).
    public static class ChatReactionEmojis
    {
        public static readonly string[] All = { "👍", "❤️", "😂", "😮", "😢", "🙏" };
    }
}
