import { File, Paths } from "expo-file-system";

// Mirrors the MAUI app's LogService: a timestamped, append-only app_log.txt in the app's own
// document directory, used to diagnose problems on a device with no debugger attached.
const LOG_FILE_NAME = "app_log.txt";
// Keeps the log from growing without bound - once it passes this it starts over.
const MAX_LOG_BYTES = 512 * 1024;

// Writing a log line can itself fail (storage full, permissions); that failure must never be
// logged through the same path, or a global error handler would recurse forever.
let isWriting = false;

export const LogService = {
  write(message: string): void {
    if (isWriting) return;
    isWriting = true;
    try {
      if (__DEV__) console.log(message);

      const file = new File(Paths.document, LOG_FILE_NAME);
      if (!file.exists) file.create();

      const line = `${new Date().toISOString()}  ${message}\n`;
      if ((file.size ?? 0) > MAX_LOG_BYTES) {
        file.write(line);
      } else {
        file.write(line, { append: true });
      }
    } catch (error) {
      if (__DEV__) console.warn("LogService error:", error);
    } finally {
      isWriting = false;
    }
  },
};

// The MAUI app hooked AppDomain.UnhandledException / UnobservedTaskException; the React Native
// equivalent for uncaught JS errors is ErrorUtils' global handler. The previous handler still
// runs afterwards, so the normal red-box / crash behaviour is unchanged.
export function installGlobalErrorLogging(): void {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  if (!errorUtils) return;

  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    LogService.write(`🔥 ${isFatal ? "FATAL" : "UNHANDLED"} EXCEPTION: ${error?.stack ?? String(error)}`);
    previous?.(error, isFatal);
  });
}

interface ErrorUtilsShape {
  getGlobalHandler: () => ((error: Error, isFatal?: boolean) => void) | undefined;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
}
