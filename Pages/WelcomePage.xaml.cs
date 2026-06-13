using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class WelcomePage : ContentPage
{
    public WelcomePage(WelcomeViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await (BindingContext as WelcomeViewModel).InitializeAsync();
    }

}
