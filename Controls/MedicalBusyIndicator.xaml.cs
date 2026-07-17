namespace Yoton_Mobile.Controls;

public partial class MedicalBusyIndicator : ContentView
{
    public static readonly BindableProperty IsRunningProperty = BindableProperty.Create(
        nameof(IsRunning), typeof(bool), typeof(MedicalBusyIndicator), false,
        propertyChanged: OnIsRunningChanged);

    public static readonly BindableProperty MessageProperty = BindableProperty.Create(
        nameof(Message), typeof(string), typeof(MedicalBusyIndicator), "Preparing your health space");

    public bool IsRunning
    {
        get => (bool)GetValue(IsRunningProperty);
        set => SetValue(IsRunningProperty, value);
    }

    public string Message
    {
        get => (string)GetValue(MessageProperty);
        set => SetValue(MessageProperty, value);
    }

    public MedicalBusyIndicator()
    {
        InitializeComponent();
    }

    protected override void OnHandlerChanged()
    {
        base.OnHandlerChanged();
        if (Handler is not null && IsRunning)
            StartAnimations();
    }

    private static void OnIsRunningChanged(BindableObject bindable, object oldValue, object newValue)
    {
        var indicator = (MedicalBusyIndicator)bindable;
        if ((bool)newValue && indicator.Handler is not null)
            indicator.StartAnimations();
        else
            indicator.StopAnimations();
    }

    private void StartAnimations()
    {
        StopAnimations();

        var haloPulse = new Animation();
        haloPulse.Add(0, 0.5, new Animation(value => OuterHalo.Scale = value, 0.96, 1.08, Easing.SinInOut));
        haloPulse.Add(0.5, 1, new Animation(value => OuterHalo.Scale = value, 1.08, 0.96, Easing.SinInOut));
        haloPulse.Commit(this, "MedicalHaloPulse", length: 1800, repeat: () => IsRunning);

        var capsuleBreath = new Animation();
        capsuleBreath.Add(0, 0.5, new Animation(value => Capsule.Scale = value, 1, 1.045, Easing.SinInOut));
        capsuleBreath.Add(0.5, 1, new Animation(value => Capsule.Scale = value, 1.045, 1, Easing.SinInOut));
        capsuleBreath.Commit(this, "MedicalCapsuleBreath", length: 1450, repeat: () => IsRunning);

        var orbit = new Animation(value => Orbit.Rotation = value, 0, 360, Easing.Linear);
        orbit.Commit(this, "MedicalOrbit", length: 3800, repeat: () => IsRunning);
    }

    private void StopAnimations()
    {
        this.AbortAnimation("MedicalHaloPulse");
        this.AbortAnimation("MedicalCapsuleBreath");
        this.AbortAnimation("MedicalOrbit");
        OuterHalo.Scale = 1;
        Capsule.Scale = 1;
        Orbit.Rotation = 0;
    }
}
