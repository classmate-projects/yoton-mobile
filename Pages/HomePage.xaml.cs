using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class HomePage : ContentPage
{
	public HomePage(HomeViewModel vm)
	{
		InitializeComponent();
        BindingContext = vm;
    }
    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await (BindingContext as HomeViewModel).InitializeAsync();
    }

    private void OnMenuClicked(object sender, EventArgs e)
    {
        Shell.Current.FlyoutIsPresented = true;
    }
}
