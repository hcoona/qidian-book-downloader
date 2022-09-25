import {
  CommandLineAction,
  CommandLineFlagParameter,
  CommandLineIntegerParameter,
  CommandLineStringParameter,
} from "@rushstack/ts-command-line";
import * as fs from "fs";
import * as puppeteer from "puppeteer-core";
import { Downloader, IArticleInformation } from "./downloader";

export class RunAction extends CommandLineAction {
  private chrome: CommandLineStringParameter;
  private noChromeHeadless: CommandLineFlagParameter;
  private username: CommandLineStringParameter;
  private password: CommandLineStringParameter;
  private bookId: CommandLineIntegerParameter;

  public constructor() {
    super({
      actionName: "run",
      documentation: "Run the downloading process.",
      summary: "Run the downloading process.",
    });
  }

  protected async onExecute() { // abstract
    const browser = await puppeteer.launch({
      executablePath: this.chrome.value,
      headless: !this.noChromeHeadless.value,
    });
    try {
      await this.run(browser);
    } finally {
      browser.close();
    }
  }

  protected onDefineParameters(): void { // abstract
    this.chrome = this.defineStringParameter({
      argumentName: "CHROME",
      description: "The path of Chrome/Chromium browser executor.",
      parameterLongName: "--chrome",
      parameterShortName: "-c",
    });
    this.noChromeHeadless = this.defineFlagParameter({
      description: "Launch Chrome/Chromium browser not in headless mode.",
      parameterLongName: "--no-chrome-headless",
    });
    this.username = this.defineStringParameter({
      argumentName: "USERNAME",
      description: "The username of your account in QiDian.",
      parameterLongName: "--username",
      parameterShortName: "-u",
    });
    this.password = this.defineStringParameter({
      argumentName: "PASSWORD",
      description: "The password of your account in QiDian.",
      parameterLongName: "--password",
      parameterShortName: "-p",
    });
    this.bookId = this.defineIntegerParameter({
      argumentName: "BOOK_ID",
      description: "ID of the book you want to download from QiDian.",
      parameterLongName: "--book",
      parameterShortName: "-i",
    });
  }

  private async run(browser: puppeteer.Browser) {
    const downloader = new Downloader(browser, {
      bookId: this.bookId.value,
      password: this.password.value,
      username: this.username.value,
    });
    const article = await downloader.run();

    fs.writeFileSync(`./${article.title}.html`, this.articleToString(article));
  }

  private articleToString(article: IArticleInformation): string {
    return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-hans" xml:lang="zh-hans">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
  <meta name="author" content="${article.author}" />
  <title>${article.title}</title>
</head>
<body>`
      + article.sections.map((s) => {
        return `<h1>${s.title}</h1>
` + s.subsections.map((ss) => {
          return `<h2>${ss.title}</h2>
` + ss.contentHtml;
        }).join("");
      }).join("")
      + `</body>
</html>
`;
  }
}
