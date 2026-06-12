using CommunityToolkit.Mvvm.ComponentModel;
using Yoton_Mobile.Models;
using Yoton_Mobile.Services;

namespace Yoton_Mobile.ViewModels
{
    public partial class HomeViewModel : BaseViewModel
    {
        private readonly ApiService _api;

        [ObservableProperty]
        List<Patient> patients;

        public HomeViewModel(ApiService api)
        {
            _api = api;
            LoadPatients();
        }

        private async void LoadPatients()
        {
            Patients = await _api.GetAsync<List<Patient>>("/api/patient");
        }
    }
}
