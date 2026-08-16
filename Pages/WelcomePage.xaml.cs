using Yoton_Mobile.Services;
using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class WelcomePage : ContentPage
{
    public WelcomePage(WelcomeViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();

        try
        {
            // Set initial hidden state
            headerStack.Opacity = 0;
            headerStack.TranslationY = 24;
            featuresStack.Opacity = 0;
            featuresStack.TranslationY = 14;
            getStartedWrap.Opacity = 0;
            getStartedWrap.Scale = 0.88;
            badgesGrid.Opacity = 0;
            badgesGrid.TranslationY = 16;

            // Start subtle pulse on illustration
            var pulse = new Animation();
            pulse.Add(0, 0.5, new Animation(v => illustrationGroup.Scale = v, 1.0, 1.06, Easing.SinInOut));
            pulse.Add(0.5, 1, new Animation(v => illustrationGroup.Scale = v, 1.06, 1.0, Easing.SinInOut));
            pulse.Commit(this, "IllustrationPulse", length: 3200, repeat: () => true);

            // Fade + slide in brand copy
            _ = headerStack.FadeToAsync(1, 900, Easing.CubicOut);
            await headerStack.TranslateToAsync(0, 0, 900, Easing.CubicOut);

            // Stagger the "what you can do" highlights in next
            await Task.Delay(100);
            _ = featuresStack.FadeToAsync(1, 600, Easing.CubicOut);
            await featuresStack.TranslateToAsync(0, 0, 600, Easing.CubicOut);

            // Get Started pops in with a little more presence, since it's the primary action
            await Task.Delay(80);
            _ = getStartedWrap.FadeToAsync(1, 500, Easing.CubicOut);
            await getStartedWrap.ScaleToAsync(1, 500, Easing.SpringOut);

            // Stagger badges entry last
            await Task.Delay(100);
            _ = badgesGrid.FadeToAsync(1, 700, Easing.CubicOut);
            await badgesGrid.TranslateToAsync(0, 0, 700, Easing.CubicOut);

            // Gentle continuous "breathing" pulse invites the tap once everything has settled in.
            var ctaPulse = new Animation();
            ctaPulse.Add(0, 0.5, new Animation(v => getStartedWrap.Scale = v, 1.0, 1.03, Easing.SinInOut));
            ctaPulse.Add(0.5, 1, new Animation(v => getStartedWrap.Scale = v, 1.03, 1.0, Easing.SinInOut));
            ctaPulse.Commit(this, "GetStartedPulse", length: 1800, repeat: () => true);
        }
        catch (Exception ex)
        {
            LogService.Write("❌ WelcomePage OnAppearing Error: " + ex);
        }
    }

    protected override void OnDisappearing()
    {
        base.OnDisappearing();
        this.AbortAnimation("IllustrationPulse");
        this.AbortAnimation("GetStartedPulse");
    }

    private async void OnGetStartedClicked(object? sender, EventArgs e)
    {
        await getStartedBtn.ScaleToAsync(0.94, 90, Easing.SinOut);
        await getStartedBtn.ScaleToAsync(1.0, 90, Easing.SinIn);
    }
}
