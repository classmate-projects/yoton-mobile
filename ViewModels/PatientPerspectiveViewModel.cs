using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Controls;

namespace Yoton_Mobile.ViewModels
{
    public partial class PatientPerspectiveViewModel : BaseViewModel
    {
        [ObservableProperty]
        double moodScore = 7; // Default mood (Good)

        [ObservableProperty]
        double painScore = 3; // Default pain (Mild)

        [ObservableProperty]
        string painLocation = "";

        [ObservableProperty]
        int waterIntakeCups = 5;

        [ObservableProperty]
        int waterGoalCups = 8;

        [ObservableProperty]
        int stepCount = 6420;

        [ObservableProperty]
        int stepGoal = 10000;

        [ObservableProperty]
        string healthJournal = "";

        public double WaterProgress => (double)WaterIntakeCups / WaterGoalCups;
        public double StepProgress => (double)StepCount / StepGoal;

        public PatientPerspectiveViewModel()
        {
            Title = "Patient Perspective";
        }

        [RelayCommand]
        private void IncrementWater()
        {
            if (WaterIntakeCups < WaterGoalCups * 2)
            {
                WaterIntakeCups++;
                OnPropertyChanged(nameof(WaterProgress));
            }
        }

        [RelayCommand]
        private void AddSteps()
        {
            StepCount += 500;
            OnPropertyChanged(nameof(StepProgress));
        }

        [RelayCommand]
        private async Task SaveDailyLog()
        {
            // Perform a mock save
            if (Shell.Current.CurrentPage is ContentPage page)
            {
                await LiquidGlassAlert.ShowAsync(
                    page,
                    "Care log protected",
                    "Your perspective journal has been encrypted and shared with your clinical team.",
                    "Great");
            }
        }
    }
}
