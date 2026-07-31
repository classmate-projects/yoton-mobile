using Yoton_Mobile.Helper;

namespace Yoton_Mobile.Pages;

// Replaces the old MP4-based splash (SplashVideoPage): a short, native logo-reveal
// animation instead of a bundled video file — smaller app size, no codec/black-frame
// edge cases, and it scales crisply on every screen density since the mark is a
// vector asset (Resources/Images/app_logo.svg).
public partial class SplashPage : ContentPage
{
    private const int FallbackTimeoutMs = 3500;
    private bool _hasNavigated;

    public SplashPage()
    {
        InitializeComponent();
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();

        // Safety net in case something prevents the animation sequence from completing.
        Dispatcher.StartTimer(TimeSpan.FromMilliseconds(FallbackTimeoutMs), () =>
        {
            ContinueToApp();
            return false;
        });

        await Task.WhenAll(
            LogoImage.FadeTo(1, 450, Easing.CubicOut),
            LogoImage.ScaleTo(1, 450, Easing.CubicOut));

        await Task.Delay(80);
        await WordmarkLabel.FadeTo(1, 350, Easing.CubicOut);

        // Small settle pulse so the reveal doesn't feel abrupt.
        await LogoImage.ScaleTo(1.05, 220, Easing.SinOut);
        await LogoImage.ScaleTo(1.0, 220, Easing.SinIn);

        await Task.Delay(300);
        ContinueToApp();
    }

    private void OnSkipTapped(object sender, EventArgs e) => ContinueToApp();

    private async void ContinueToApp()
    {
        if (_hasNavigated)
            return;

        _hasNavigated = true;

        // A returning user who previously opted into biometrics and still has a stored
        // session token unlocks with Face ID/fingerprint instead of the marketing Welcome
        // screen; everyone else (first run, logged out, or opted out) sees the normal flow.
        var token = await SecureStorage.Default.GetAsync("auth_token");
        var biometricEnabled = Preferences.Get("biometric_enabled", false);

        if (!string.IsNullOrEmpty(token) && biometricEnabled)
            Application.Current.MainPage = new NavigationPage(ServiceHelper.GetService<BiometricLockPage>());
        else
            Application.Current.MainPage = new NavigationPage(ServiceHelper.GetService<WelcomePage>());
    }
}
