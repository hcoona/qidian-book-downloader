import { LogLevel } from "typescript-logging";
import { Log4TSProvider } from "typescript-logging-log4ts-style";

export const loggerFactory = Log4TSProvider.createProvider(
  "QiDianBookDownloaderLogProvider",
  {
    level: LogLevel.Debug,
    groups: [{
      expression: new RegExp(".+"),
    }]
  });
