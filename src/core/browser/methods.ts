import fs from "fs";
import BrowserAutomation from "./base";
import { config } from "./config";
import { AuthService } from "../game/authService";
import { ImageService } from "../game/imageService";
import { PopupService } from "../game/popupService";
import { mainLogo } from "../../types/general";
import logger from "../../unit/logger";

export default class Methods extends BrowserAutomation {
  private authService: AuthService;
  private popupService: PopupService;
  imageService: ImageService;

  constructor(threadId: number) {
    super(threadId);
    this.popupService = new PopupService(this);
    this.imageService = new ImageService(this);
    this.authService = new AuthService(this, this.popupService);

    // this.setupHeapSnapshot();
  }

  // private setupHeapSnapshot() {
  //   process.on("SIGUSR2", () => {
  //     generateHeapSnapshot();
  //   });
  // }

  public async initialize() {
    await this.prepare();

    if (this.threadId > 0) {
      const account = config.accounts[this.threadId - 1];
      await this.authService.logIntoAccount(account);
      await this.saveContext(this.threadId);
    }

    await this.popupService.observePopUp();
    await this.waitForGameWindow();
  }

  public writeToFile(buffer: Buffer, folder = "mainWindow") {
    try {
      fs.writeFileSync(`./debug/${folder}/${Date.now()}.png`, buffer);
    } catch (err) {
      console.error(err);
    }
  }

  private async waitForGameWindow(maxAttempts = 60) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const buffer = await this.imageService.makeScreenShot(mainLogo);
        const misMatchPercentage = await this.imageService.compareImages(
          "37",
          buffer
        );

        if (misMatchPercentage > 60) {
          return logger.info(`Загрузил окно игры`, { threadId: this.threadId });
        }

        if (misMatchPercentage !== 0) {
          logger.error(
            `Расхождение с главным банером: ${misMatchPercentage} %`,
            { threadId: this.threadId }
          );

          this.writeToFile(buffer);
          throw new Error(`Failed to start cause of wrong coordinates`);
        }
        attempts++;
        await this.sleep(1000);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "TimeoutError") {
          logger.warn(`Screenshot attempt timed out`, {
            threadId: this.threadId,
          });
        }
        throw error;
      }
    }
    throw new Error(`Failed to find game window after ${maxAttempts} attempts`);
  }

  async sleep(ms: number) {
    return await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
