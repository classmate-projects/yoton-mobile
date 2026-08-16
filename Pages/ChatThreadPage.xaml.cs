using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class ChatThreadPage : ContentPage
{
    public ChatThreadPage(ChatThreadViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await (BindingContext as ChatThreadViewModel)!.InitializeAsync();
    }

    protected override void OnDisappearing()
    {
        base.OnDisappearing();
        (BindingContext as ChatThreadViewModel)?.Dispose();
    }
}
