using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Services;

namespace Yoton_Mobile.ViewModels
{
    public partial class LoginViewModel : BaseViewModel
    {
        private readonly AuthService _auth;

        [ObservableProperty]
        string email;

        [ObservableProperty]
        string password;

        public LoginViewModel(AuthService auth)
        {
            _auth = auth;
            Title = "Login";
        }

        [RelayCommand]
        public async Task LoginAsync()
        {
            var token = await _auth.LoginAsync(Email, Password);

            if (token == null)
            {
                await Shell.Current.DisplayAlert("Error", "Invalid login", "OK");
                return;
            }

            Preferences.Set("auth_token", token.Token);

            Application.Current.MainPage = new AppShell();
        }
    }

}
