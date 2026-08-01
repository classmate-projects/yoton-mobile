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
        int waterIntakeCups = 0;

        [ObservableProperty]
        int waterGoalCups = 8;

        [ObservableProperty]
        int stepCount = 0;

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
            // There's no backend endpoint for this journal yet — it only lives in memory for
            // this session. Be upfront about that rather than claiming it was encrypted and
            // shared with the care team, which was never actually true.
            if (Shell.Current.CurrentPage is ContentPage page)
            {
                await LiquidGlassAlert.ShowAsync(
                    page,
                    "Saved for now",
                    "Your entries are kept on this device for this session only — sharing them with your care team isn't available yet.",
                    "OK");
            }
        }
    }
}
