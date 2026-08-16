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
        nameof(HasCancelAction), typeof(bool), typeof(LiquidGlassAlert), false,
        propertyChanged: OnHasCancelActionChanged);

    public string Title { get => (string)GetValue(TitleProperty); set => SetValue(TitleProperty, value); }
    public string Message { get => (string)GetValue(MessageProperty); set => SetValue(MessageProperty, value); }
    public string ConfirmText { get => (string)GetValue(ConfirmTextProperty); set => SetValue(ConfirmTextProperty, value); }
    public string CancelText { get => (string)GetValue(CancelTextProperty); set => SetValue(CancelTextProperty, value); }
    public bool HasCancelAction { get => (bool)GetValue(HasCancelActionProperty); set => SetValue(HasCancelActionProperty, value); }

    // The button row is a 2-column Grid so Confirm/Cancel can sit side by side. Hiding
    // CancelButton with IsVisible="False" removes it visually but its column still
    // reserves half the row's width, so ConfirmButton was rendering squeezed into a
    // sliver. XAML defaults ConfirmButton to Column=0/ColumnSpan=2 (spanning the full
    // row) to match HasCancelAction's own default of false; when a real cancel action
    // is requested, shift it back into just column 1 alongside CancelButton.
    private static void OnHasCancelActionChanged(BindableObject bindable, object oldValue, object newValue)
    {
        var alert = (LiquidGlassAlert)bindable;
        var hasCancel = (bool)newValue;
        Grid.SetColumn(alert.ConfirmButton, hasCancel ? 1 : 0);
        Grid.SetColumnSpan(alert.ConfirmButton, hasCancel ? 1 : 2);
    }

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
            // Only show a second button when the caller actually wants a real choice
            // (a distinct cancelText). Most callers just show a single info message —
            // hardcoding this to true meant every one of those got a redundant
            // "Close" button next to "OK" with no real difference between them.
            HasCancelAction = cancelText != null
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
            this.FadeToAsync(1, 220, Easing.CubicOut),
            GlassCard.FadeToAsync(1, 260, Easing.CubicOut),
            GlassCard.ScaleToAsync(1, 360, Easing.CubicOut));
        return await _completion.Task;
    }

    private async void OnConfirmClicked(object? sender, EventArgs e)
    {
        await FinishAsync(true, ConfirmButton);
    }

    private async void OnCancelClicked(object? sender, EventArgs e)
    {
        await FinishAsync(false, CancelButton);
    }

    private async Task FinishAsync(bool confirmed, VisualElement actionButton)
    {
        if (_completion.Task.IsCompleted)
            return;

        await actionButton.ScaleToAsync(0.96, 70, Easing.CubicOut);
        await Task.WhenAll(
            GlassCard.FadeToAsync(0, 130, Easing.CubicIn),
            GlassCard.ScaleToAsync(0.96, 130, Easing.CubicIn),
            this.FadeToAsync(0, 160, Easing.CubicIn));
        _completion.TrySetResult(confirmed);
    }
}
