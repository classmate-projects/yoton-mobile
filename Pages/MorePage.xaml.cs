using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class MorePage : ContentPage
{
    public MorePage(MoreViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();
        (BindingContext as MoreViewModel)?.RefreshProfile();
    }
}
