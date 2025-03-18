import type { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright";
import { newInjectedContext } from "fingerprint-injector";
import logger from "../../unit/logger";
import { config } from "./config";
import { checkFileExists } from "../../unit/fsHelper";
import { fingerprintManager } from "./fingerprinUtils";

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

    const filePath = `./state/state${this.threadId}.json`;
    checkFileExists(filePath);

    // Get generated values BEFORE injection
    const { fingerprint, headers } = await fingerprintManager.getFingerprint(
      this.threadId
    );

    // Create a new context with fingerprint injection
    this.context = await newInjectedContext(this.browser, {
      fingerprint: { fingerprint, headers },
      newContextOptions: {
        storageState: filePath,
        viewport: {
          height: fingerprint.screen.height,
          width: fingerprint.screen.width,
        },
        screen: {
          height: fingerprint.screen.height,
          width: fingerprint.screen.width,
        },
        reducedMotion: "reduce",
      },
    });

    // Create a new page
    this.page = await this.context.newPage();
    // Optional: Use CDP to override device metrics (if args don't work)
    // const session = await this.context.newCDPSession(this.page);
    // await session.send("Emulation.setDeviceMetricsOverride", {
    //   width: 1920,
    //   height: 1080,
    //   deviceScaleFactor: 1,
    //   mobile: false,
    //   screenWidth: 1920,
    //   screenHeight: 1080,
    // });

    const innerDemensions = await this.page.evaluate(() => ({
      viewport: { width: window.innerWidth, height: window.innerHeight },
      outerWindow: { width: window.outerWidth, height: window.outerHeight },
    }));

    if (innerDemensions.outerWindow.height < 1020) {
      throw new Error(JSON.stringify(innerDemensions.outerWindow));
    }

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
