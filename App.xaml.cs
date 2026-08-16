using Yoton_Mobile.Helper;
using Yoton_Mobile.Pages;
using Yoton_Mobile.Services;

namespace Yoton_Mobile
{
    public partial class App : Application
    {
        public App()
        {
            InitializeComponent();

            AppDomain.CurrentDomain.FirstChanceException += (s, e) =>
            {
                LogService.Write("⚠️ FirstChanceException: " + e.Exception.Message);
            };
        }

        protected override Window CreateWindow(IActivationState? activationState)
        {
            return new Window(new NavigationPage(ServiceHelper.GetService<SplashPage>()));
        }
    }
}
