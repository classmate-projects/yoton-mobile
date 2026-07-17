using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class PatientPerspectivePage : ContentPage
{
    public PatientPerspectivePage(PatientPerspectiveViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }
}
