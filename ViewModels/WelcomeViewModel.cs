using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Models;
using Yoton_Mobile.Pages;

namespace Yoton_Mobile.ViewModels
{
    public partial class WelcomeViewModel : BaseViewModel
    {
        private readonly ApiService _api;

        [ObservableProperty]
        APIData apidata;

        public WelcomeViewModel(ApiService api)
        {
            _api = api;
        }

        public async Task InitializeAsync()
        {
            await LoadAPI();
        }

        private async Task LoadAPI()
        {
            var response = await _api.GetAsync<APIData>(APILibrary.BaseUrl);

            if (response != null)
                Apidata = response;
        }

        [RelayCommand]
        private async Task Login()
        {
            await Shell.Current.GoToAsync(nameof(LoginPage));
        }
    }

}
