using Yoton_Mobile.Controls;
using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class HomePage : ContentPage
{
	private IDispatcherTimer? _refreshTimer;

	public HomePage(HomeViewModel vm)
	{
		InitializeComponent();
        BindingContext = vm;
    }
    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await (BindingContext as HomeViewModel).InitializeAsync();

        // Set by LoginViewModel the moment it detects the patient has come back and
        // logged in with a real password after previously agreeing to change their
        // default one — shown exactly once, here, since this is the first fully-loaded
        // page reachable after that login.
        if (Preferences.Get("show_security_confirmed", false))
        {
            Preferences.Remove("show_security_confirmed");
            await SecurityConfirmedAlert.ShowAsync(this);
        }

        // Catches a front-office confirmation (Pending -> Scheduled) while the patient is
        // sitting on the dashboard, without needing a real push notification (see
        // Services/AppointmentStatusTracker.cs).
        _refreshTimer = Dispatcher.CreateTimer();
        _refreshTimer.Interval = TimeSpan.FromSeconds(60);
        _refreshTimer.Tick += OnRefreshTimerTick;
        _refreshTimer.Start();
    }

    protected override void OnDisappearing()
    {
        base.OnDisappearing();
        _refreshTimer?.Stop();
        if (_refreshTimer != null)
            _refreshTimer.Tick -= OnRefreshTimerTick;
        _refreshTimer = null;
    }

    private async void OnRefreshTimerTick(object? sender, EventArgs e)
    {
        if (BindingContext is HomeViewModel vm)
        {
            await vm.RefreshSilentlyAsync();
        }
    }

    private async void OnMenuClicked(object sender, EventArgs e)
    {
        // The flyout is gone — Settings/Support/Patient Perspective now live behind
        // the "More" tab so they're reachable (and leavable) from the same
        // persistent tab bar as everything else.
        await Shell.Current.GoToAsync("//dashboard/more");
    }

    private async void OnBookAppointmentTapped(object sender, EventArgs e)
    {
        await Shell.Current.GoToAsync("//dashboard/appointments");
    }
}
