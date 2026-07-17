using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Helper;
using Yoton_Mobile.Pages;

namespace Yoton_Mobile.ViewModels
{
    public partial class SettingsViewModel : BaseViewModel
    {
        [ObservableProperty]
        bool isDarkModeEnabled;

        [ObservableProperty]
        bool isNotificationsEnabled = true;

        [ObservableProperty]
        string appVersion = "1.0.4";

        public SettingsViewModel()
        {
            Title = "Settings";
            IsDarkModeEnabled = Application.Current.UserAppTheme == AppTheme.Dark;
        }

        partial void OnIsDarkModeEnabledChanged(bool value)
        {
            Application.Current.UserAppTheme = value ? AppTheme.Dark : AppTheme.Light;
        }

        [RelayCommand]
        private void Logout()
        {
            Preferences.Clear();
            var welcomePage = ServiceHelper.GetService<WelcomePage>();
            Application.Current.MainPage = new NavigationPage(welcomePage);
        }
    }
}
