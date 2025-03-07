import { GameLoop } from "./gameLoop";
import Methods from "../browser/methods";
// import { browserManager } from "../../services/browserManager";
import settings from "../../../settings.json";
import logger from "../../unit/logger";

interface ThreadContext {
  initialize: () => Promise<void>;
  close: () => Promise<void>;
  gameLoop?: GameLoop;
}

export class ThreadManager {
  private threads = new Map<number, ThreadContext>();

  private async createThread(threadId: number) {
    try {
      const context = this.threads.get(threadId);
      if (!context) {
        throw new Error(`Context not found`);
      }

      await context.initialize();

      if (threadId === 0 && context.gameLoop) {
        await context.gameLoop.start();
      } else {
        await new Promise((resolve) => setTimeout(() => resolve, 2147483647));
      }
    } catch (error) {
      throw error;
    }
  }

  private async createThreadInstance(threadId: number) {
    try {
      const methods = new Methods(threadId);

      const context: ThreadContext = {
        initialize: methods.initialize.bind(methods),
        close: methods.close.bind(methods),
        gameLoop:
          threadId === 0
            ? new GameLoop(methods.imageService, threadId)
            : undefined,
      };

      this.threads.set(threadId, context);
      logger.info(`Пытаюсь запустить поток`, {
        threadId,
      });

      await this.createThread(threadId);
    } catch (error) {
      throw error;
    }
  }

  private async handleRestartNeeded(threadId: number) {
    const context = this.threads.get(threadId);
    if (!context) return;

    // context.methods.clearTimers();
    // await browserManager.removeInstance(threadId);
    await context.close();
    this.threads.delete(threadId);
  }

  async setupEnvironment() {
    for (let threadId = 0; threadId < settings.threads; threadId++) {
      (async () => {
        while (true) {
          await this.createThreadInstance(threadId).catch(async (error) => {
            logger.error(error, { threadId });
            await this.handleRestartNeeded(threadId);
          });
        }
      })();
    }
  }
}

export const threadManager = new ThreadManager();
