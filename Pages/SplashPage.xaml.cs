using Yoton_Mobile.Helper;

namespace Yoton_Mobile.Pages;

// Replaces the old MP4-based splash (SplashVideoPage): a short, native logo-reveal
// animation instead of a bundled video file — smaller app size, no codec/black-frame
// edge cases. The mark itself is Resources/Images/app_logo.png (transparent background).
public partial class SplashPage : ContentPage
{
    private const int FallbackTimeoutMs = 3500;
    private bool _hasNavigated;

    public SplashPage()
    {
        InitializeComponent();
    }

    // Started immediately in OnAppearing so the (occasionally slow, especially on Android's
    // first Keystore access) auth check runs *during* the reveal animation instead of after
    // it — previously this only started once the ~1.6s animation had fully finished, adding
    // its own latency serially on top instead of overlapping with time already being spent.
    private Task<(string? token, bool biometricEnabled)>? _authStateTask;

    protected override async void OnAppearing()
    {
        base.OnAppearing();

        _authStateTask = LoadAuthStateAsync();

        // Safety net in case something prevents the animation sequence from completing.
        Dispatcher.StartTimer(TimeSpan.FromMilliseconds(FallbackTimeoutMs), () =>
        {
            _ = ContinueToApp();
            return false;
        });

        await Task.WhenAll(
            LogoImage.FadeToAsync(1, 350, Easing.CubicOut),
            LogoImage.ScaleToAsync(1, 350, Easing.CubicOut));

        await WordmarkLabel.FadeToAsync(1, 280, Easing.CubicOut);

        // Small settle pulse so the reveal doesn't feel abrupt.
        await LogoImage.ScaleToAsync(1.05, 140, Easing.SinOut);
        await LogoImage.ScaleToAsync(1.0, 140, Easing.SinIn);

        await Task.Delay(150);
        await ContinueToApp();
    }

    private static async Task<(string? token, bool biometricEnabled)> LoadAuthStateAsync()
    {
        var token = await SecureStorage.Default.GetAsync("auth_token");
        var biometricEnabled = Preferences.Get("biometric_enabled", false);
        return (token, biometricEnabled);
    }

    private async void OnSkipTapped(object? sender, EventArgs e) => await ContinueToApp();

    private async Task ContinueToApp()
    {
        if (_hasNavigated)
            return;

        _hasNavigated = true;

        // By the time this normally runs, _authStateTask has already been resolving in the
        // background for the whole animation, so this await is typically instant rather than
        // starting a fresh SecureStorage round-trip here.
        var (token, biometricEnabled) = _authStateTask != null
            ? await _authStateTask
            : await LoadAuthStateAsync();

        // A returning user who previously opted into biometrics and still has a stored
        // session token unlocks with Face ID/fingerprint instead of the marketing Welcome
        // screen; everyone else (first run, logged out, or opted out) sees the normal flow.
        if (!string.IsNullOrEmpty(token) && biometricEnabled)
            Application.Current!.Windows[0].Page = new NavigationPage(ServiceHelper.GetService<BiometricLockPage>());
        else
            Application.Current!.Windows[0].Page = new NavigationPage(ServiceHelper.GetService<WelcomePage>());
    }
}
