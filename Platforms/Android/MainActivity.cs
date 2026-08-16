using Android.App;
using Android.Content.PM;
using Android.OS;
using Android.Views;
using CommunityToolkit.Maui.Alerts;
using CommunityToolkit.Maui.Core;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Controls;

namespace Yoton_Mobile
{
    // AdjustResize (unset previously defaulted to AdjustPan on most OEMs) makes the window
    // actually shrink when the soft keyboard opens, instead of the keyboard floating on top
    // and covering whatever field is focused — pairs with the ScrollView on pages like
    // LoginPage so the shrunk viewport can scroll the focused field into view.
    [Activity(Theme = "@style/Maui.SplashTheme", Exported = true, MainLauncher = true, LaunchMode = LaunchMode.SingleTop, WindowSoftInputMode = SoftInput.AdjustResize, ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation | ConfigChanges.UiMode | ConfigChanges.ScreenLayout | ConfigChanges.SmallestScreenSize | ConfigChanges.Density)]
    public class MainActivity : MauiAppCompatActivity
    {
        private DateTime _lastBackPressAt = DateTime.MinValue;

        protected override void OnCreate(Bundle? savedInstanceState)
        {
            base.OnCreate(savedInstanceState);

            // Patient health data (records, bills, messages) is shown throughout this app —
            // FLAG_SECURE blocks screenshots (they come out black) and screen recording/
            // casting app-wide, and hides this app's content from the Recents thumbnail. Most
            // Android versions also show the OS's own "can't take screenshot" toast
            // automatically once this is set — no extra app code needed for that half.
            Window?.AddFlags(WindowManagerFlags.Secure);
        }

        public override void OnBackPressed()
        {
            if (!IsAtShellRoot())
            {
                base.OnBackPressed();
                return;
            }

            var now = DateTime.UtcNow;
            if ((now - _lastBackPressAt).TotalSeconds < 2)
            {
                base.OnBackPressed();
                return;
            }

            _lastBackPressAt = now;
            Toast.Make("Press back again to exit", ToastDuration.Short).Show();
        }

        // True only when the Home tab is selected and nothing is pushed on top of it (no
        // detail page, no modal) — every other case keeps Android/Shell's normal back
        // behavior, so there's no "confirm exit" trap on a screen where a user just expects
        // to go back one step.
        private static bool IsAtShellRoot()
        {
            var shell = Shell.Current;
            if (shell == null) return false;

            var currentRoute = shell.CurrentItem?.CurrentItem?.Route;
            var hasPushedPage = shell.Navigation.NavigationStack.Count > 0 || shell.Navigation.ModalStack.Count > 0;

            return currentRoute == "home" && !hasPushedPage;
        }
    }
}
