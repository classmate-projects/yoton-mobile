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
            await (BindingContext as WelcomeViewModel)!.InitializeAsync();

            // Set initial state
            headerStack.Opacity = 0;
            headerStack.TranslationY = 20;
            badgesGrid.Opacity = 0;
            badgesGrid.TranslationY = 15;

            // Start pulse on the illustration
            var pulseAnim = new Animation();
            pulseAnim.Add(0, 0.5, new Animation(v => illustrationGroup.Scale = v, 1.0, 1.05, Easing.SinInOut));
            pulseAnim.Add(0.5, 1, new Animation(v => illustrationGroup.Scale = v, 1.05, 1.0, Easing.SinInOut));
            pulseAnim.Commit(this, "IllustrationPulse", length: 3000, repeat: () => true);

            // Animate fade-in of text and description
            _ = headerStack.FadeTo(1, 800, Easing.CubicOut);
            await headerStack.TranslateTo(0, 0, 800, Easing.CubicOut);

            // Animate fade-in of clinical badges
            await Task.Delay(100);
            _ = badgesGrid.FadeTo(1, 600, Easing.CubicOut);
            await badgesGrid.TranslateTo(0, 0, 600, Easing.CubicOut);
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
    }

    private async void OnGetStartedClicked(object sender, EventArgs e)
    {
        // Scale down and up button pop interaction
        await getStartedBtn.ScaleTo(0.92, 100, Easing.SinOut);
        await getStartedBtn.ScaleTo(1.0, 100, Easing.SinIn);
    }
}
