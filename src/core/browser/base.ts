import type { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright";
import logger from "../../unit/logger";
import { config } from "./config";

class BrowserAutomation {
  public browser: Browser | undefined;
  context!: BrowserContext;
  page!: Page;

  constructor(public threadId: number) {
    if (config.options.threads < 1) {
      throw new Error("Потоков не может быть меньше 1");
    }
    if (config.options.onlyRead && config.options.threads > 1) {
      logger.warn(
        `Игнориую количество потоков [threads=${config.options.threads}], поскольку стоит режим чтения [onlyRead=${config.options.onlyRead}]`
      );
      config.options.threads = 1;
    }
  }

  public async initialize() {
    await this.prepare();
  }

  protected async prepare() {
    await this.create();
    await this.navigate("https://betboom.ru/game/tennis37_v2");
  }

  async connectToBrowserWithRetry(): Promise<Browser> {
    let retries = 0;
    const maxRetries = 10; // Maximum number of retries
    const retryDelay = 1000; // Delay between retries in milliseconds

    while (retries < maxRetries) {
      try {
        const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
        logger.info(`Connected to browser via CDP`, {
          threadId: this.threadId,
        });
        return browser; // Return the connected browser
      } catch (error) {
        logger.warn(
          `Attempt ${retries + 1}: Failed to connect to browser. Retrying...`,
          { threadId: this.threadId }
        );
        retries++;
        await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Wait before retrying
      }
    }

    throw new Error(`Failed to connect to browser after multiple retries`);
  }

  private async create() {
    logger.info(`Launching ${config.options.browserType} browser...`, {
      threadId: this.threadId,
    });

    if (!this.browser) {
      this.browser = await this.connectToBrowserWithRetry();
    }

    this.context = await this.browser.newContext();
    // Create a new page
    this.page = await this.context.newPage();

    logger.info(`Browser context and page created successfully`, {
      threadId: this.threadId,
    });
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error(`Page not initialized`);
    }
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
  }

  async close(): Promise<void> {
    if (!this.context) {
      throw new Error("Context not initialized");
    }
    if (!this.browser) {
      throw new Error("Browser not initialized");
    }

    await this.context.close();
    await this.browser.close();
    // принудительно очищаю все
    this.browser = undefined;

    logger.warn(`Закрыл весь контекст, Restart thread ${this.threadId}`, {
      threadId: this.threadId,
    });
  }
}

export default BrowserAutomation;
