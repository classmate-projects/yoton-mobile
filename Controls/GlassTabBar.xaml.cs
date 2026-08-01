namespace Yoton_Mobile.Controls;

public partial class GlassTabBar : ContentView
{
    public static readonly BindableProperty SelectedRouteProperty = BindableProperty.Create(
        nameof(SelectedRoute), typeof(string), typeof(GlassTabBar), string.Empty,
        propertyChanged: OnSelectedRouteChanged);

    public string SelectedRoute
    {
        get => (string)GetValue(SelectedRouteProperty);
        set => SetValue(SelectedRouteProperty, value);
    }

    public GlassTabBar()
    {
        InitializeComponent();
    }

    protected override void OnHandlerChanged()
    {
        base.OnHandlerChanged();
        if (Handler is null)
            return;

        UpdateSelection();

        this.Opacity = 0;
        this.TranslationY = 24;
        _ = this.FadeTo(1, 260, Easing.CubicOut);
        _ = this.TranslateTo(0, 0, 260, Easing.CubicOut);
    }

    private static void OnSelectedRouteChanged(BindableObject bindable, object oldValue, object newValue) =>
        ((GlassTabBar)bindable).UpdateSelection();

    private void UpdateSelection()
    {
        SetTabState(HomePill, HomeIcon, "tab_home", SelectedRoute == "home");
        SetTabState(AppointmentsPill, AppointmentsIcon, "tab_calendar", SelectedRoute == "appointments");
        SetTabState(RecordsPill, RecordsIcon, "tab_records", SelectedRoute == "records");
        SetTabState(MessagesPill, MessagesIcon, "tab_messages", SelectedRoute == "messages");
        SetTabState(MorePill, MoreIcon, "tab_more", SelectedRoute == "more");
    }

    private static void SetTabState(Border pill, Image icon, string iconBaseName, bool selected)
    {
        pill.IsVisible = selected;
        icon.Opacity = selected ? 1 : 0.65;
        icon.Source = selected ? $"{iconBaseName}_active.svg" : $"{iconBaseName}.svg";
    }

    private void OnHomeTapped(object sender, EventArgs e) => _ = NavigateAsync("home", HomeIcon);
    private void OnAppointmentsTapped(object sender, EventArgs e) => _ = NavigateAsync("appointments", AppointmentsIcon);
    private void OnRecordsTapped(object sender, EventArgs e) => _ = NavigateAsync("records", RecordsIcon);
    private void OnMessagesTapped(object sender, EventArgs e) => _ = NavigateAsync("messages", MessagesIcon);
    private void OnMoreTapped(object sender, EventArgs e) => _ = NavigateAsync("more", MoreIcon);

    private async Task NavigateAsync(string route, Image icon)
    {
        if (SelectedRoute == route)
            return;

        await icon.ScaleTo(0.82, 70, Easing.CubicOut);
        await icon.ScaleTo(1, 90, Easing.CubicOut);
        await Shell.Current.GoToAsync($"//dashboard/{route}");
    }
}
