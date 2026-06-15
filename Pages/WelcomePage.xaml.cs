using Yoton_Mobile.Services;
using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class WelcomePage : ContentPage
{
    public WelcomePage(WelcomeViewModel vm)
    {
        LogService.Write("WelcomePage constructor called");
        LogService.Write("VM is null? " + (vm == null));

        InitializeComponent();
        BindingContext = vm;
    }

    protected override async void OnAppearing()
    {
        LogService.Write("WelcomePage OnAppearing");

        base.OnAppearing();

        try
        {
            await (BindingContext as WelcomeViewModel)!.InitializeAsync();
        }
        catch (Exception ex)
        {
            LogService.Write("❌ OnAppearing Error: " + ex);
        }
    }

}
