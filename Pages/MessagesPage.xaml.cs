using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class MessagesPage : ContentPage
{
    public MessagesPage(MessagesViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await (BindingContext as MessagesViewModel)!.InitializeAsync();
    }
}
