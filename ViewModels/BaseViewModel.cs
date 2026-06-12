using CommunityToolkit.Mvvm.ComponentModel;

namespace Yoton_Mobile.ViewModels
{
    public partial class BaseViewModel : ObservableObject
    {
        [ObservableProperty]
        [NotifyPropertyChangedFor(nameof(IsNotBusy))] 
        bool isBusy;

        public bool IsNotBusy => !IsBusy;

        [ObservableProperty]
        string title;
    }

}
