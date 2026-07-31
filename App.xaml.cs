using Yoton_Mobile.Helper;
using Yoton_Mobile.Pages;
using Yoton_Mobile.Resources.Styles;
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

            MainPage = new NavigationPage(ServiceHelper.GetService<SplashPage>());
        }
        private void ApplyTheme()
        {
            Resources.MergedDictionaries.Clear();

            if (Application.Current.RequestedTheme == AppTheme.Dark)
            {
                Resources.MergedDictionaries.Add(new DarkTheme());
            }
            else
            {
                Resources.MergedDictionaries.Add(new LightTheme());
            }
        }
    }
}
