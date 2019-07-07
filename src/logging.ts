import { LFService, LoggerFactoryOptions, LogGroupRule, LogLevel } from "typescript-logging";

export const loggerFactory = LFService.createLoggerFactory(
  new LoggerFactoryOptions()
    .addLogGroupRule(new LogGroupRule(new RegExp(".+"), LogLevel.Debug)));
