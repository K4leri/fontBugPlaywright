import type { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright";
import { newInjectedContext } from "fingerprint-injector";
import logger from "../../unit/logger";
import { config } from "./config";
import { checkFileExists } from "../unit/fsHelper";
import { generateHeapSnapshot } from "../../unit/heapSnapshot";

class BrowserAutomation {
  public browser: Browser | undefined;
  private intervalId: NodeJS.Timeout[] = [];
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

    const intervalId = setInterval(() => {
      this.saveContext(this.threadId);
    }, 60 * 1000 * 15);

    this.intervalId.push(intervalId);

    if (process.env.NODE_ENV === "development") {
      this.setupHeapSnapshot();
    }

    // process.once("SIGINT", async () => {
    //   logger.warn(`Stopping gracefully...`);
    //   await this.saveContext(this.threadId);
    //   await this.close();
    //   process.exit(0);
    // });
  }

  private setupHeapSnapshot() {
    const timeoutId = setTimeout(() => {
      generateHeapSnapshot();
    }, 60 * 1000 * 5);
    const intervalId = setInterval(() => {
      generateHeapSnapshot();
    }, 60 * 1000 * 60); // каждый час

    this.intervalId.push(timeoutId);
    this.intervalId.push(intervalId);
    // process.on("SIGUSR2", () => {
    //   generateHeapSnapshot();
    // });
  }

  protected clearTimers() {
    this.intervalId.forEach((intervalId) => clearInterval(intervalId));
  }

  protected async prepare() {
    await this.create();
    await this.navigate("https://betboom.ru/game/tennis37_v2");
  }

  protected async saveContext(threadId: number) {
    const path = `./state/state${threadId}.json`;
    await this.context.storageState({ path }).catch((error) => {
      logger.error(`cant save state to ${path}: ${error}`);
      this.clearTimers();
    });
  }

  async connectToBrowserWithRetry(): Promise<Browser> {
    let retries = 0;
    const maxRetries = 10; // Maximum number of retries
    const retryDelay = 1000; // Delay between retries in milliseconds

    while (retries < maxRetries) {
      try {
        const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
        logger.info(` Connected to browser via CDP`, {
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

    // Create a new context with fingerprint injection
    this.context = await newInjectedContext(this.browser, {
      fingerprintOptions: {
        devices: ["desktop"],
        operatingSystems: ["windows"],
        screen: {
          minHeight: 1080,
          maxHeight: 1080,
          minWidth: 1920,
          maxWidth: 1920,
        },
      },
      newContextOptions: {
        storageState: filePath,
        viewport: { height: 1080, width: 1920 },
        screen: { height: 1080, width: 1920 },
      },
    });

    // Create a new page
    this.page = await this.context.newPage();
    // Set device metrics for the page
    // const session = await this.context.newCDPSession(this.page);
    // await session.send("Emulation.setDeviceMetricsOverride", {
    //   width: 1920,
    //   height: 1080,
    //   deviceScaleFactor: 1,
    //   mobile: false,
    // });

    logger.info(`Browser context and page created successfully`, {
      threadId: this.threadId,
    });
  }

  // private getBrowserType(): typeof chromium | typeof firefox | typeof webkit {
  //   switch (config.options.browserType) {
  //     case "chromium":
  //       return chromium;
  //     case "firefox":
  //       return firefox;
  //     case "webkit":
  //       return webkit;
  //     default:
  //       throw new Error(
  //         `Unsupported browser type: ${config.options.browserType}`
  //       );
  //   }
  // }

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

    this.clearTimers();

    await this.context.close();
    await this.browser.close().catch((error) => {
      console.log(error);
    });
    // принудительно очищаю все
    this.browser = undefined;

    logger.warn(`Закрыл весь контекст, Restart thread ${this.threadId}`, {
      threadId: this.threadId,
    });
  }
}

export default BrowserAutomation;
