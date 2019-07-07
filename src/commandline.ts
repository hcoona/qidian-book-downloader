import {
  CommandLineFlagParameter, CommandLineParser,
} from "@microsoft/ts-command-line";
import { loggerFactory } from "./logging";
import { RunAction } from "./run";

const logger = loggerFactory.getLogger("main");

export class QidianBookDownloaderCommandLine extends CommandLineParser {
  private verbose: CommandLineFlagParameter;

  public constructor() {
    super({
      toolDescription: "Download subscribed books from QiDian",
      toolFilename: "qidian-book-downloader",
    });

    this.addAction(new RunAction());
  }

  protected onDefineParameters(): void { // abstract
    this.verbose = this.defineFlagParameter({
      description: "Show extra logging detail",
      parameterLongName: "--verbose",
      parameterShortName: "-v",
    });
  }

  protected onExecute(): Promise<void> { // override
    // BusinessLogic.configureLogger(this._verbose.value);
    return super.onExecute();
  }
}
