using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;

namespace Yoton_Mobile.ViewModels
{
    public partial class PatientPerspectiveViewModel : BaseViewModel
    {
        [ObservableProperty]
        double moodScore = 7; // Default mood (Good)

        [ObservableProperty]
        double painScore = 3; // Default pain (Mild)

        [ObservableProperty]
        string painLocation = "Left Knee";

        [ObservableProperty]
        int waterIntakeCups = 5;

        [ObservableProperty]
        int waterGoalCups = 8;

        [ObservableProperty]
        int stepCount = 6420;

        [ObservableProperty]
        int stepGoal = 10000;

        [ObservableProperty]
        string healthJournal = "Feeling much stronger today. Did my physical therapy exercises in the morning with minimal discomfort.";

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
            await Shell.Current.DisplayAlert("Log Saved", "Your perspective journal has been saved and shared with your clinical team.", "Great!");
        }
    }
}
