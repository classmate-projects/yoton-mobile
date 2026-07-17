using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class AppointmentsPage : ContentPage
{
    public AppointmentsPage(AppointmentsViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }
}
