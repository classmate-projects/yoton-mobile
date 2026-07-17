using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class SupportPage : ContentPage
{
    public SupportPage(SupportViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }
}
