namespace Yoton_Mobile.Services
{
    public class NavigationService
    {
        public INavigation Navigation =>
            Application.Current.MainPage.Navigation;
    }
}
