import { TokenBucket } from "limiter";
import promiseRetry = require("promise-retry");
import * as playwright from "playwright-core";
import { loggerFactory } from "./logging";

const logger = loggerFactory.getLogger("downloader");

export interface IDownloaderOptions {
  readonly username: string;
  readonly password: string;
  readonly bookId: number;
}

export interface IArticleInformation {
  readonly author: string;
  readonly title: string;
  readonly sections: IArticleSectionInformation[];
}

export interface IArticleSectionInformation {
  readonly title: string;
  readonly subsections: IArticleSubsectionInformation[];
}

export interface IArticleSubsectionInformation {
  readonly title: string;
  readonly contentHtml: string;
}

export class Downloader {
  private browser: playwright.Browser;
  private throttler: TokenBucket;
  private options: IDownloaderOptions;

  constructor(browser: playwright.Browser, options: IDownloaderOptions) {
    this.browser = browser;
    this.throttler = new TokenBucket({
      bucketSize: 5,
      tokensPerInterval: 2,
      interval: "second",
    });
    this.options = options;
  }

  public async run(): Promise<IArticleInformation> {
    logger.info(`Start downloading book with id ${this.options.bookId}.`);

    logger.info("Start login.");
    await this.login();
    logger.info("Login succeed.");

    logger.info(`Start downloading catalog information for ${this.options.bookId}`);
    const catalog = await this.catalog();
    logger.info(`Finish downloading catalog information for ${this.options.bookId}`);

    logger.info(`Start downloading chapter contents for ${this.options.bookId}`);
    const sections = await Promise.all(catalog.sections.map(async (s) => {
      const subsections = await Promise.all(s.subsections.map(async (ss) => {
        await this.acquire(1);
        const contentHtml = await this.chapter(ss);
        return {
          contentHtml,
          title: ss.title,
        } as IArticleSubsectionInformation;
      }));
      return {
        subsections,
        title: s.title,
      } as IArticleSectionInformation;
    }));
    logger.info(`Finish downloading chapter contents for ${this.options.bookId}`);

    return {
      author: catalog.author,
      sections,
      title: catalog.title,
    } as IArticleInformation;
  }

  private delay(ms: number) {
    return new Promise( (resolve) => setTimeout(resolve, ms) );
  }

  private acquire(count: number): Promise<void> {
    return new Promise((resolve) => {
      this.throttler.removeTokens(count).then(() => resolve());
    });
  }

  private async login() {
    const page = await this.browser.newPage();
    try {
      await page.goto("https://passport.qidian.com/");
      await page.fill("#username", this.options.username);
      await page.fill("#password", this.options.password);
      await Promise.all([
        page.waitForNavigation(),
        page.click(".login-button"),
      ]);
    } finally {
      await page.close();
    }
  }

  private async catalog(): Promise<ICatalogInformation> {
    const page = await this.browser.newPage();
    try {
      await page.goto(`https://book.qidian.com/info/${this.options.bookId}#Catalog`);

      const bookInfo = await page.$("div.book-info");
      const h1 = await bookInfo.$("h1");
      const bookTitle = await h1.$eval("em", (em) => em.textContent);
      const authorName = await h1.$eval("a.writer", (a) => a.textContent);

      logger.info("bookTitle=" + bookTitle + ", authorName=" + authorName);

      const volumes = await page.$$("div.volume");
      const sections = await Promise.all(volumes.map(async (volume, index) => {
        const sectionHeader = await volume.$eval("h3", (h) => {
          if (h.children[0].nodeName === "A") {
            return h.childNodes[2].textContent.trim();
          } else {
            return h.childNodes[0].textContent.trim();
          }
        });
        logger.debug(`# ${sectionHeader} #`);

        const subsections = await volume.$$eval("li", (lis) => lis.map((li) => {
          const a = li.children[0] as HTMLAnchorElement;
          return {
            href: a.href,
            title: a.textContent,
          } as ICatalogSubsectionInformation;
        }));
        subsections.forEach((ss) => logger.debug(`## ${ss.title} ##`));

        return {
          subsections,
          title: sectionHeader,
        } as ICatalogSectionInformation;
      }));

      return {
        author: authorName,
        sections,
        title: bookTitle,
      } as ICatalogInformation;
    } finally {
      await page.close();
    }
  }

  private async chapter(subsectionInfo: ICatalogSubsectionInformation): Promise<string> {
    const page = await this.browser.newPage();
    try {
      logger.debug(`Start downloading ${subsectionInfo.title} from ${subsectionInfo.href}`);
      await promiseRetry((retry) => page.goto(subsectionInfo.href).catch(retry));

      const content = await page.$eval("div.read-content", (div) => div.innerHTML);
      logger.debug(`Finish downloading ${subsectionInfo.title}`);

      return content;
    } catch (error) {
      logger.error(`Failed to download ${subsectionInfo.title}`, error);
    } finally {
      await page.close();
    }
  }
}

interface ICatalogInformation {
  readonly author: string;
  readonly title: string;
  readonly sections: ICatalogSectionInformation[];
}

interface ICatalogSectionInformation {
  readonly title: string;
  readonly subsections: ICatalogSubsectionInformation[];
}

interface ICatalogSubsectionInformation {
  readonly href: string;
  readonly title: string;
}
