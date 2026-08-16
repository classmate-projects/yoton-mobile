using System.Linq;
using Foundation;
using UIKit;

namespace Yoton_Mobile
{
    // iOS has no equivalent of Android's WindowSoftInputMode=AdjustResize (see
    // Platforms/Android/MainActivity.cs) - the keyboard floats on top of the page instead
    // of shrinking it, so a focused field near the bottom of a form (e.g. the booking
    // panel's Notes editor, or the login form) ends up hidden behind it. This mirrors that
    // Android behavior manually: on keyboard show, pad the current page's bottom by the
    // keyboard height so its ScrollView has room to scroll the focused field into view; on
    // hide, remove the padding.
    [Register("AppDelegate")]
    public class AppDelegate : MauiUIApplicationDelegate
    {
        protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();

        public override bool FinishedLaunching(UIApplication application, NSDictionary launchOptions)
        {
            var result = base.FinishedLaunching(application, launchOptions);

            NSNotificationCenter.DefaultCenter.AddObserver(UIKeyboard.WillShowNotification, notification =>
            {
                var frame = UIKeyboard.FrameEndFromNotification(notification);
                SetCurrentPageBottomPadding(frame.Height);
            });

            NSNotificationCenter.DefaultCenter.AddObserver(UIKeyboard.WillHideNotification, _ =>
            {
                SetCurrentPageBottomPadding(0);
            });

            return result;
        }

        private static void SetCurrentPageBottomPadding(double bottom)
        {
            var page = Microsoft.Maui.Controls.Application.Current?.Windows.FirstOrDefault()?.Page;
            if (page == null)
                return;

            var p = page.Padding;
            page.Padding = new Microsoft.Maui.Thickness(p.Left, p.Top, p.Right, bottom);
        }
    }
}
