import { ImageService } from "./imageService";
import { sleep } from "../../unit/sleep";

export class GameLoop {
  private readonly OPERATION_TIMEOUT = 10000;
  private activeTimeout?: NodeJS.Timeout;
  private isRunning = true;

  constructor(private imageService: ImageService, private startTime: number) {}

  private processScreenshot(screenshotBuffer: Buffer) {
    try {
      return screenshotBuffer;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Sets a timeout to restart the game loop if it gets stuck on white pixels.
   * If a timeout is already set, it reduces the wait time between game state images.
   */
  private setAddTimeOut() {
    return new Promise<void>((_, reject) => {
      this.activeTimeout = setTimeout(() => {
        reject(new Error("Operation timeout: Always white pixels"));
      }, this.OPERATION_TIMEOUT);
    });
  }

  private clearTimeout() {
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
      this.activeTimeout = undefined;
    }
  }

  private resetLoopState() {
    this.clearTimeout();
  }

  private async executeGameLoopCycle() {
    const screenshotBuffer = await this.imageService.makeScreenShot();
    const processedBuffer = this.processScreenshot(screenshotBuffer);
    if (!processedBuffer) {
      await sleep(100);
      return;
    }
    this.resetLoopState();
  }

  public async start() {
    while (this.isRunning) {
      try {
        await Promise.race([this.executeGameLoopCycle(), this.setAddTimeOut()]);
      } catch (error) {
        this.clearTimeout();
        throw new Error(`Game loop: ${error}`, {
          cause: { startTime: this.startTime },
        });
      }
    }
  }
}
