using CommunityToolkit.Maui.Core;
using CommunityToolkit.Maui.Views;
using Yoton_Mobile.Helper;

namespace Yoton_Mobile.Pages;

public partial class SplashVideoPage : ContentPage
{
    private const int FallbackTimeoutMs = 8000;
    private bool _hasNavigated;

    public SplashVideoPage()
    {
        InitializeComponent();
        SplashVideo.Source = MediaSource.FromResource("splash_video.mp4");
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();

        // Safety net in case the video fails to load or end (codec issues, slow device, etc).
        Dispatcher.StartTimer(TimeSpan.FromMilliseconds(FallbackTimeoutMs), () =>
        {
            ContinueToApp();
            return false;
        });
    }

    private void OnMediaEnded(object sender, EventArgs e) => ContinueToApp();

    private void OnMediaFailed(object sender, MediaFailedEventArgs e) => ContinueToApp();

    private void OnSkipTapped(object sender, EventArgs e) => ContinueToApp();

    private void OnStateChanged(object sender, MediaStateChangedEventArgs e)
    {
        // Wait for an actual frame to be playing before revealing the native video
        // surface; hiding the mask on Buffering/Opening exposes its black background.
        if (e.NewState == MediaElementState.Playing)
        {
            SplashMask.IsVisible = false;
        }
    }

    private async void ContinueToApp()
    {
        if (_hasNavigated)
            return;

        _hasNavigated = true;
        SplashVideo.Stop();

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
