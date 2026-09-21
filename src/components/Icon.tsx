import Svg, { Circle, Line, Path } from "react-native-svg";

// The tab and password-visibility icons from the MAUI app's Resources/Images/*.svg, drawn as
// vectors so any colour works (the MAUI app shipped a separate _active.svg for each tab).

const TAB_PATHS = {
  home: "M12 2.6c.35 0 .69.12.96.35l8 6.86c.34.3.54.73.54 1.19v8a3 3 0 0 1-3 3h-2.5a1 1 0 0 1-1-1v-5a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v5a1 1 0 0 1-1 1H6a3 3 0 0 1-3-3v-8c0-.46.2-.9.54-1.19l8-6.86c.27-.23.61-.35.96-.35Z",
  calendar:
    "M8 1.75a.75.75 0 0 1 .75.75v1h6.5v-1a.75.75 0 0 1 1.5 0v1H18a3.5 3.5 0 0 1 3.5 3.5v10.5A3.5 3.5 0 0 1 18 21H6a3.5 3.5 0 0 1-3.5-3.5V7A3.5 3.5 0 0 1 6 3.5h1.25v-1A.75.75 0 0 1 8 1.75ZM4.5 9.5V17.5A1.5 1.5 0 0 0 6 19h12a1.5 1.5 0 0 0 1.5-1.5V9.5h-15Zm11.03 2.22a.75.75 0 0 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06l1.47 1.47 3.72-3.72Z",
  records:
    "M9 1.5h6a1.5 1.5 0 0 1 1.5 1.5H17a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h.5A1.5 1.5 0 0 1 9 1.5Zm-1.5 3H7a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-.5a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 4.5Zm.5 8.75h2.1l1.02-2.04a.75.75 0 0 1 1.38.1l1.1 3.02 1.1-2.44a.75.75 0 0 1 1.37.03l.5 1.33H16a.75.75 0 0 1 0 1.5h-1.94a.75.75 0 0 1-.7-.48l-.16-.43-1.22 2.7a.75.75 0 0 1-1.38-.07l-1.14-3.13-.5 1a.75.75 0 0 1-.67.42H8a.75.75 0 0 1 0-1.5Z",
  messages:
    "M12 2.5c5.52 0 10 3.86 10 8.62 0 4.76-4.48 8.63-10 8.63a11.6 11.6 0 0 1-3.06-.4l-3.44 1.9a.9.9 0 0 1-1.33-.86l.2-3.05C2.6 15.83 1 13.62 1 11.12 1 6.36 6.48 2.5 12 2.5Zm-4 8.12a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm4 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm4 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z",
  more: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.14 0-8 2.1-8 4.5V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-2.4-3.86-4.5-8-4.5Z",
} as const;

export type TabIconName = keyof typeof TAB_PATHS;

export function TabIcon({ name, color, size = 22 }: { name: TabIconName; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={TAB_PATHS[name]} fill={color} />
    </Svg>
  );
}

const EYE_STROKE = "#94A3B8";

// Password field toggle: an open eye while the password is visible, struck through while hidden.
export function EyeIcon({ visible, size = 24 }: { visible: boolean; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={EYE_STROKE}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {visible ? (
        <>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <Circle cx={12} cy={12} r={3} />
        </>
      ) : (
        <>
          <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <Line x1={1} y1={1} x2={23} y2={23} />
        </>
      )}
    </Svg>
  );
}
