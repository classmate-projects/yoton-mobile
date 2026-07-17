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

            // Set initial hidden state
            headerStack.Opacity = 0;
            headerStack.TranslationY = 24;
            badgesGrid.Opacity = 0;
            badgesGrid.TranslationY = 16;

            // Start subtle pulse on illustration
            var pulse = new Animation();
            pulse.Add(0, 0.5, new Animation(v => illustrationGroup.Scale = v, 1.0, 1.06, Easing.SinInOut));
            pulse.Add(0.5, 1, new Animation(v => illustrationGroup.Scale = v, 1.06, 1.0, Easing.SinInOut));
            pulse.Commit(this, "IllustrationPulse", length: 3200, repeat: () => true);

            // Fade + slide in brand copy
            _ = headerStack.FadeTo(1, 900, Easing.CubicOut);
            await headerStack.TranslateTo(0, 0, 900, Easing.CubicOut);

            // Stagger badges entry
            await Task.Delay(120);
            _ = badgesGrid.FadeTo(1, 700, Easing.CubicOut);
            await badgesGrid.TranslateTo(0, 0, 700, Easing.CubicOut);
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
        await getStartedBtn.ScaleTo(0.94, 90, Easing.SinOut);
        await getStartedBtn.ScaleTo(1.0, 90, Easing.SinIn);
    }
}
