using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class MessagesPage : ContentPage
{
    public MessagesPage(MessagesViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }
}
