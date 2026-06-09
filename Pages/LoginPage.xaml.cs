using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class LoginPage : ContentPage
{
	public LoginPage(LoginViewModel vm)
	{
		InitializeComponent();
        BindingContext = vm;
    }
}