using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Helper;
using Yoton_Mobile.Models;
using Yoton_Mobile.Pages;
using Yoton_Mobile.Services;

namespace Yoton_Mobile.ViewModels
{
    public partial class WelcomeViewModel : BaseViewModel
    {
        private readonly ApiService _api;
        private readonly NavigationService _nav;

        [ObservableProperty]
        APIData apidata;

        public WelcomeViewModel(ApiService api, NavigationService nav)
        {
            LogService.Write("WelcomeViewModel created");
            LogService.Write("ApiService null? " + (api == null));
            LogService.Write("NavigationService null? " + (nav == null));

            _api = api;
            _nav = nav;
        }

        public async Task InitializeAsync()
        {
            LogService.Write("InitializeAsync started");

            try
            {
                await LoadAPI();
            }
            catch (Exception ex)
            {
                LogService.Write("❌ InitializeAsync Error: " + ex);
            }
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
            await _nav.Navigation.PushAsync(ServiceHelper.GetService<LoginPage>());
        }
    }

}
