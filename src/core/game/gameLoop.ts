import fs from "fs";
import wtf from "wtfnode";
import { PNG } from "pngjs";
import { imageProcessor } from "../image/ImageProcessor";
import { imageComparator } from "../image/imageComperator";
import logger from "../../unit/logger";
import { ImageService } from "./imageService";

export class GameLoop {
  private static readonly waitAfterCompare = 40000;
  private addtimeOut: NodeJS.Timeout | undefined = undefined;
  private isRunning = true;
  private waitBetweenStages = 7000;
  private processErrorCount: number = 0;
  private isDevMode = process.env.NODE_ENV === "development";
  private timeExecution = 0;

  constructor(private imageService: ImageService, private threadId: number) {}

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async appendToFile(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.appendFile("./numbers.txt", data, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async waitForGameStateImages(timeOut: number): Promise<void> {
    await this.imageService.waitForImageMatch("приемСтавок");
    await this.sleep(timeOut);
    await this.imageService.waitForImageMatch("ИдетИгра");
  }

  private processScreenshot(screenshotBuffer: Buffer) {
    try {
      return imageProcessor.processImage(screenshotBuffer);
    } catch (error) {
      this.processErrorCount++;
      // const addMessage = this.processErrorCount
      //   ? ` (${this.processErrorCount})`
      //   : "";

      // if (this.processErrorCount) {
      //   const numLinesToClear = this.isDevMode ? 6 : 1;
      //   for (let i = 0; i < numLinesToClear; i++) {
      //     process.stdout.write("\x1B[A\x1B[2K");
      //   }
      // }

      // logger.error(
      //   error instanceof Error
      //     ? `${error.message}${addMessage}`
      //     : `Failed to process image`
      // );
      return undefined;
    }
  }

  private async compareImage(processedBuffer: PNG) {
    if (this.isDevMode) {
      this.timeExecution = Date.now();
    }

    const comparisonResult = await imageComparator.compareImage(
      processedBuffer
    );

    if (this.isDevMode) {
      const elapsedTime = Date.now() - this.timeExecution;
      logger.debug(`Time taken to compare images: ${elapsedTime} ms`, {
        threadId: this.threadId,
      });
    }
    if (comparisonResult.bestMatch === -1) {
      throw new Error("game window broken");
    }

    return comparisonResult;
  }

  private async logComparisonResult(comparisonResult: {
    bestMatch: number;
    mismatchPercentage: number;
  }) {
    if (this.isDevMode) {
      logger.debug(
        `Best match: ${comparisonResult.bestMatch}, Mismatch percentage: ${comparisonResult.mismatchPercentage}`,
        { threadId: this.threadId }
      );
      return;
    }

    logger.info(`${comparisonResult.bestMatch.toString()}`, {
      threadId: this.threadId,
    });
    await this.appendToFile(`${comparisonResult.bestMatch}\n`);
    if (this.isDevMode) wtf.dump();
  }

  /**
   * Sets a timeout to restart the game loop if it gets stuck on white pixels.
   * If a timeout is already set, it reduces the wait time between game state images.
   */
  private setAddTimeOut() {
    if (!this.addtimeOut) {
      this.addtimeOut = setTimeout(() => {
        throw new Error(`Always white pixels. need restart`);
      }, 40000);
    } else {
      this.waitBetweenStages = 100;
    }
  }

  /**
   * Resets the game loop state after a successful iteration.
   * Clears the timeout, resets the wait time between game state images, and resets the process error count.
   */
  private resetLoop() {
    clearTimeout(this.addtimeOut);
    this.addtimeOut = undefined;
    this.waitBetweenStages = 7000;
    this.processErrorCount = 0;
  }

  public async start() {
    while (this.isRunning) {
      try {
        await this.waitForGameStateImages(this.waitBetweenStages);

        this.setAddTimeOut();
        const screenshotBuffer = await this.imageService.makeScreenShot();
        const processedBuffer = this.processScreenshot(screenshotBuffer);
        if (!processedBuffer) continue;
        this.resetLoop();

        const comparisonResult = await this.compareImage(processedBuffer);
        await this.logComparisonResult(comparisonResult);

        await this.sleep(GameLoop.waitAfterCompare);
      } catch (error) {
        await this.imageService.makeFullScreenShot();
        throw new Error(`Game loop: ${error}`);
      }
    }
  }
}
