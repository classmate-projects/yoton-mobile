namespace Yoton_Mobile.Controls;

// One-time celebration shown after a patient who was still on their temporary
// (DOB-derived) password successfully logs in with a real one they've set
// themselves — see LoginViewModel's IsDefaultPassword handling and HomeViewModel's
// "pending_password_reset_confirmation" flag.
public partial class SecurityConfirmedAlert : ContentView
{
    private readonly TaskCompletionSource _completion = new();

    public static readonly BindableProperty MessageProperty = BindableProperty.Create(
        nameof(Message), typeof(string), typeof(SecurityConfirmedAlert),
        "Your password has been updated. Your account is now secured with your new credentials.");

    public string Message { get => (string)GetValue(MessageProperty); set => SetValue(MessageProperty, value); }

    public SecurityConfirmedAlert()
    {
        InitializeComponent();
    }

    public static async Task ShowAsync(ContentPage page, string? message = null)
    {
        if (page.Content is null)
            return;

        var originalContent = page.Content;
        var host = new Grid();
        page.Content = host;
        host.Children.Add(originalContent);

        var alert = new SecurityConfirmedAlert();
        if (message != null)
            alert.Message = message;

        host.Children.Add(alert);
        await alert.PresentAsync();
        host.Children.Remove(alert);
        host.Children.Remove(originalContent);
        page.Content = originalContent;
    }

    private async Task PresentAsync()
    {
        IsVisible = true;
        GlassCard.Opacity = 0;
        GlassCard.Scale = 0.92;
        ShieldBadge.Scale = 0;

        await Task.WhenAll(
            this.FadeToAsync(1, 220, Easing.CubicOut),
            GlassCard.FadeToAsync(1, 260, Easing.CubicOut),
            GlassCard.ScaleToAsync(1, 360, Easing.CubicOut));

        // Shield pops in with a spring overshoot, then a couple of "secured!" pulse
        // rings radiate outward and fade — reads as a distinct, celebratory moment
        // rather than just another info dialog.
        await ShieldBadge.ScaleToAsync(1.15, 260, Easing.CubicOut);
        _ = ShieldBadge.ScaleToAsync(1.0, 160, Easing.SpringOut);

        _ = PlayPulseAsync();

        await _completion.Task;
    }

    private async Task PlayPulseAsync()
    {
        for (var i = 0; i < 2; i++)
        {
            PulseRing.Scale = 1.0;
            PulseRing.Opacity = 0.6;
            await Task.WhenAll(
                PulseRing.ScaleToAsync(1.7, 700, Easing.CubicOut),
                PulseRing.FadeToAsync(0, 700, Easing.CubicOut));
        }
    }

    private async void OnConfirmClicked(object? sender, EventArgs e)
    {
        await ConfirmButton.ScaleToAsync(0.96, 70, Easing.CubicOut);
        await Task.WhenAll(
            GlassCard.FadeToAsync(0, 130, Easing.CubicIn),
            GlassCard.ScaleToAsync(0.96, 130, Easing.CubicIn),
            this.FadeToAsync(0, 160, Easing.CubicIn));
        _completion.TrySetResult();
    }
}
