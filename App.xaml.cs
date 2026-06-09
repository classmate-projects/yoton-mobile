using Microsoft.Extensions.DependencyInjection;
using Yoton_Mobile.Pages;

namespace Yoton_Mobile
{
    public partial class App : Application
    {
        public App()
        {
            InitializeComponent();
            MainPage = new WelcomePage();
        }
    }
}