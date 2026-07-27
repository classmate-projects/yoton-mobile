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

    private void OnSkipTapped(object sender, EventArgs e) => ContinueToApp();

    private void ContinueToApp()
    {
        if (_hasNavigated)
            return;

        _hasNavigated = true;
        SplashVideo.Stop();
        Application.Current.MainPage = new NavigationPage(ServiceHelper.GetService<WelcomePage>());
    }
}
