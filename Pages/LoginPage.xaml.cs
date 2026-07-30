using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class LoginPage : ContentPage
{
    public LoginPage(LoginViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();

        // Pulsing small medical icon
        var pulseAnimation = new Animation();
        pulseAnimation.Add(0, 0.5, new Animation(v => clinicalIcon.Scale = v, 1.0, 1.12, Easing.SinInOut));
        pulseAnimation.Add(0.5, 1, new Animation(v => clinicalIcon.Scale = v, 1.12, 1.0, Easing.SinInOut));
        pulseAnimation.Commit(this, "IconPulse", length: 2400, repeat: () => true);

        // Slow subtle background motion
        var motionAnimation = new Animation();
        motionAnimation.Add(0, 0.5, new Animation(v => {
            bgBubble1.TranslationY = v;
            bgBubble2.TranslationX = -v;
        }, 0, 8, Easing.SinInOut));
        motionAnimation.Add(0.5, 1, new Animation(v => {
            bgBubble1.TranslationY = v;
            bgBubble2.TranslationX = -v;
        }, 8, 0, Easing.SinInOut));
        motionAnimation.Commit(this, "BgMotion", length: 7000, repeat: () => true);
    }

    protected override void OnDisappearing()
    {
        base.OnDisappearing();
        this.AbortAnimation("IconPulse");
        this.AbortAnimation("BgMotion");
    }

    private async void OnLoginClicked(object sender, EventArgs e)
    {
        // Scale button down and up for quick pop animation
        await loginBtn.ScaleTo(0.94, 100, Easing.SinOut);
        await loginBtn.ScaleTo(1.0, 100, Easing.SinIn);
    }
}