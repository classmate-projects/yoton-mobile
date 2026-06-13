using CommunityToolkit.Mvvm.ComponentModel;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Models;

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
        }

        public async Task InitializeAsync()
        {
            await LoadPatients();
        }
        private async Task LoadPatients()
        {
            var response = await _api.GetAsync<PatientResponse>(APILibrary.Patient.GetAllPatients);

            if (response != null)
                Patients = response.Patients;
        }
    }
}
