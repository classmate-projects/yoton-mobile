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

    private void ContinueToApp()
    {
        if (_hasNavigated)
            return;

        _hasNavigated = true;
        SplashVideo.Stop();
        Application.Current.MainPage = new NavigationPage(ServiceHelper.GetService<WelcomePage>());
    }
}
