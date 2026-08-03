using Android.App;
using Android.Content.PM;
using Android.Views;

namespace Yoton_Mobile
{
    // AdjustResize (unset previously defaulted to AdjustPan on most OEMs) makes the window
    // actually shrink when the soft keyboard opens, instead of the keyboard floating on top
    // and covering whatever field is focused — pairs with the ScrollView on pages like
    // LoginPage so the shrunk viewport can scroll the focused field into view.
    [Activity(Theme = "@style/Maui.SplashTheme", Exported = true, MainLauncher = true, LaunchMode = LaunchMode.SingleTop, WindowSoftInputMode = SoftInput.AdjustResize, ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation | ConfigChanges.UiMode | ConfigChanges.ScreenLayout | ConfigChanges.SmallestScreenSize | ConfigChanges.Density)]
    public class MainActivity : MauiAppCompatActivity
    {
    }
}
