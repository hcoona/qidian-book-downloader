import { QidianBookDownloaderCommandLine } from "./commandline";

class Main {
  public static async main() {
    const cmd = new QidianBookDownloaderCommandLine();
    await cmd.execute();
  }
}

Main.main();
