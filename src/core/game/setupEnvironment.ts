import { GameLoop } from "./gameLoop";
import settings from "../../../settings.json";
import logger from "../../unit/logger";
import { ErrorCause } from "../../types/error";
import BrowserAutomation from "../browser/base";
import { ImageService } from "./imageService";
import { prepare } from "./prepare";

export class ThreadManager {
  private threads = new Map<number, BrowserAutomation>();
  private LoopLastStartTime = new Map<number, number>();

  private createGameLoop(base: BrowserAutomation, threadId: number) {
    return new GameLoop(new ImageService(base.page), threadId);
  }

  private async createThread(threadId: number) {
    const base = new BrowserAutomation(threadId);
    this.threads.set(threadId, base);

    logger.info(`Пытаюсь запустить поток`, { threadId });

    try {
      await base.initialize();
      await prepare(base);

      if (threadId === 0) {
        const gameLoop = this.createGameLoop(base, threadId);
        await gameLoop.start();
      } else {
        await new Promise(() => {});
      }
    } catch (error) {
      throw error;
    }
  }

  private async handleRestartNeeded(threadId: number) {
    const base = this.threads.get(threadId);
    if (!base) return;
    await base.close();
    this.threads.delete(threadId);
  }

  async setupEnvironment() {
    for (let threadId = 0; threadId < settings.threads; threadId++) {
      (async () => {
        while (true) {
          try {
            await this.createThread(threadId);
          } catch (error) {
            const err = error as Error & { cause: ErrorCause };
            logger.error(err, { threadId });
            this.LoopLastStartTime.set(threadId, err.cause?.startTime || 0);
            await this.handleRestartNeeded(threadId);
          }
        }
      })();
    }
  }
}

export const threadManager = new ThreadManager();
