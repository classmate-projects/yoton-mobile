using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class SettingsPage : ContentPage
{
    public SettingsPage(SettingsViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await (BindingContext as SettingsViewModel)!.InitializeAsync();
    }
}
