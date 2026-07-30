using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class BiometricLockPage : ContentPage
{
    public BiometricLockPage(BiometricLockViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        if (BindingContext is BiometricLockViewModel vm)
            await vm.UnlockCommand.ExecuteAsync(null);
    }
}
