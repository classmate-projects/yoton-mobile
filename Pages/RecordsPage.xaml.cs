using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class RecordsPage : ContentPage
{
    public RecordsPage(RecordsViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await (BindingContext as RecordsViewModel)!.InitializeAsync();
    }
}
