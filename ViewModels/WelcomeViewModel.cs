using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Helper;
using Yoton_Mobile.Pages;
using Yoton_Mobile.Services;

namespace Yoton_Mobile.ViewModels
{
    public partial class WelcomeViewModel : BaseViewModel
    {
        private readonly NavigationService _nav;

        public string Version => AppInfo.Current.VersionString;

        public WelcomeViewModel(NavigationService nav)
        {
            LogService.Write("WelcomeViewModel created");
            _nav = nav;
        }

        [RelayCommand]
        private async Task Login()
        {
            await _nav.Navigation.PushAsync(ServiceHelper.GetService<LoginPage>());
        }
    }

}
