using Yoton_Mobile.Helper;

namespace Yoton_Mobile.Pages
{
    public partial class SplashPage : ContentPage
    {
        public SplashPage()
        {
            InitializeComponent();
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();

            // Start pulsing logo animation
            var pulseAnimation = new Animation();
            pulseAnimation.Add(0, 0.5, new Animation(v => logoContainer.Scale = v, 1.0, 1.08, Easing.SinInOut));
            pulseAnimation.Add(0.5, 1, new Animation(v => logoContainer.Scale = v, 1.08, 1.0, Easing.SinInOut));
            pulseAnimation.Commit(this, "PulseLogo", length: 2200, repeat: () => true);

            // Start floating shape animations
            var floatAnimation = new Animation();
            floatAnimation.Add(0, 0.5, new Animation(v => {
                shape1.TranslationY = v;
                shape1.TranslationX = v * 0.5;
                shape2.TranslationY = -v;
                shape3.TranslationX = -v;
            }, 0, 12, Easing.SinInOut));
            floatAnimation.Add(0.5, 1, new Animation(v => {
                shape1.TranslationY = v;
                shape1.TranslationX = v * 0.5;
                shape2.TranslationY = -v;
                shape3.TranslationX = -v;
            }, 12, 0, Easing.SinInOut));
            floatAnimation.Commit(this, "FloatShapes", length: 5000, repeat: () => true);

            // Wait for loading simulation, then transition to WelcomePage
            await Task.Delay(3500);

            this.AbortAnimation("PulseLogo");
            this.AbortAnimation("FloatShapes");

            var welcomePage = ServiceHelper.GetService<WelcomePage>();
            Application.Current.MainPage = new NavigationPage(welcomePage);
        }
    }
}
