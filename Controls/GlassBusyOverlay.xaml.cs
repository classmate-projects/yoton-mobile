namespace Yoton_Mobile.Controls;

public partial class GlassBusyOverlay : ContentView
{
    public static readonly BindableProperty IsRunningProperty = BindableProperty.Create(
        nameof(IsRunning), typeof(bool), typeof(GlassBusyOverlay), false,
        propertyChanged: OnIsRunningChanged);

    public static readonly BindableProperty MessageProperty = BindableProperty.Create(
        nameof(Message), typeof(string), typeof(GlassBusyOverlay), "Preparing your health space");

    public bool IsRunning
    {
        get => (bool)GetValue(IsRunningProperty);
        set => SetValue(IsRunningProperty, value);
    }

    public string Message
    {
        get => (string)GetValue(MessageProperty);
        set => SetValue(MessageProperty, value);
    }

    public GlassBusyOverlay()
    {
        InitializeComponent();
    }

    protected override void OnHandlerChanged()
    {
        base.OnHandlerChanged();
        if (Handler is not null && IsRunning)
            _ = PresentAsync();
    }

    private static void OnIsRunningChanged(BindableObject bindable, object oldValue, object newValue)
    {
        var overlay = (GlassBusyOverlay)bindable;
        if (overlay.Handler is null)
            return;

        if ((bool)newValue)
            _ = overlay.PresentAsync();
        else
            _ = overlay.DismissAsync();
    }

    private async Task PresentAsync()
    {
        IsVisible = true;
        Indicator.IsRunning = true;
        Card.Opacity = 0;
        Card.Scale = 0.9;
        await Task.WhenAll(
            this.FadeToAsync(1, 220, Easing.CubicOut),
            Card.FadeToAsync(1, 280, Easing.CubicOut),
            Card.ScaleToAsync(1, 320, Easing.CubicOut));
    }

    private async Task DismissAsync()
    {
        await Task.WhenAll(
            Card.FadeToAsync(0, 150, Easing.CubicIn),
            Card.ScaleToAsync(0.94, 150, Easing.CubicIn),
            this.FadeToAsync(0, 200, Easing.CubicIn));
        IsVisible = false;
        Indicator.IsRunning = false;
    }
}
