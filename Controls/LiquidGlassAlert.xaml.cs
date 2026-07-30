namespace Yoton_Mobile.Controls;

public partial class LiquidGlassAlert : ContentView
{
    private readonly TaskCompletionSource<bool> _completion = new();

    public static readonly BindableProperty TitleProperty = BindableProperty.Create(
        nameof(Title), typeof(string), typeof(LiquidGlassAlert), string.Empty);
    public static readonly BindableProperty MessageProperty = BindableProperty.Create(
        nameof(Message), typeof(string), typeof(LiquidGlassAlert), string.Empty);
    public static readonly BindableProperty ConfirmTextProperty = BindableProperty.Create(
        nameof(ConfirmText), typeof(string), typeof(LiquidGlassAlert), "Continue");
    public static readonly BindableProperty CancelTextProperty = BindableProperty.Create(
        nameof(CancelText), typeof(string), typeof(LiquidGlassAlert), "Not now");
    public static readonly BindableProperty HasCancelActionProperty = BindableProperty.Create(
        nameof(HasCancelAction), typeof(bool), typeof(LiquidGlassAlert), false);

    public string Title { get => (string)GetValue(TitleProperty); set => SetValue(TitleProperty, value); }
    public string Message { get => (string)GetValue(MessageProperty); set => SetValue(MessageProperty, value); }
    public string ConfirmText { get => (string)GetValue(ConfirmTextProperty); set => SetValue(ConfirmTextProperty, value); }
    public string CancelText { get => (string)GetValue(CancelTextProperty); set => SetValue(CancelTextProperty, value); }
    public bool HasCancelAction { get => (bool)GetValue(HasCancelActionProperty); set => SetValue(HasCancelActionProperty, value); }

    public LiquidGlassAlert()
    {
        InitializeComponent();
    }

    public static async Task<bool> ShowAsync(
        ContentPage page,
        string title,
        string message,
        string confirmText = "Continue",
        string? cancelText = null)
    {
        if (page.Content is null)
            return false;

        var originalContent = page.Content;
        var host = new Grid();
        page.Content = host;
        host.Children.Add(originalContent);

        var alert = new LiquidGlassAlert
        {
            Title = title,
            Message = message,
            ConfirmText = confirmText,
            CancelText = cancelText ?? "Close",
            HasCancelAction = true
        };

        host.Children.Add(alert);
        var confirmed = await alert.PresentAsync();
        host.Children.Remove(alert);
        host.Children.Remove(originalContent);
        page.Content = originalContent;
        return confirmed;
    }

    private async Task<bool> PresentAsync()
    {
        IsVisible = true;
        GlassCard.Opacity = 0;
        GlassCard.Scale = 0.92;
        await Task.WhenAll(
            this.FadeTo(1, 220, Easing.CubicOut),
            GlassCard.FadeTo(1, 260, Easing.CubicOut),
            GlassCard.ScaleTo(1, 360, Easing.CubicOut));
        return await _completion.Task;
    }

    private async void OnConfirmClicked(object sender, EventArgs e)
    {
        await FinishAsync(true, ConfirmButton);
    }

    private async void OnCancelClicked(object sender, EventArgs e)
    {
        await FinishAsync(false, CancelButton);
    }

    private async Task FinishAsync(bool confirmed, VisualElement actionButton)
    {
        if (_completion.Task.IsCompleted)
            return;

        await actionButton.ScaleTo(0.96, 70, Easing.CubicOut);
        await Task.WhenAll(
            GlassCard.FadeTo(0, 130, Easing.CubicIn),
            GlassCard.ScaleTo(0.96, 130, Easing.CubicIn),
            this.FadeTo(0, 160, Easing.CubicIn));
        _completion.TrySetResult(confirmed);
    }
}
