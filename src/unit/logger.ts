// logger.ts
import pino, { Logger as PinoLogger } from "pino";

class Logger {
  private logger: PinoLogger;

  constructor() {
    const transport = pino.transport({
      targets: [
        {
          target: "./formatters.js",
          level: process.env.NODE_ENV === "development" ? "trace" : "info",
          options: {
            colorize: false,
            singleLine: true,
            ignore: "pid,hostname,time,level,threadId,stack",
          },
        },
        {
          target: "pino/file",
          level: "error",
          options: {
            destination: `./logs/app_${Date.now()}.log`,
          },
        },
      ],
    });

    this.logger = pino(
      { level: process.env.NODE_ENV === "production" ? "info" : "debug" },
      transport
    );
  }

  // Updated log methods
  info(message: string, context: object = {}): void {
    this.logger.info({ ...context, msg: message });
  }

  error(error: Error | string, context: object = {}): void {
    if (typeof error === "string") {
      this.logger.error({ ...context, msg: error });
    } else {
      this.logger.error({ ...context, stack: error.stack });
    }
  }

  warn(message: string, context: object = {}): void {
    this.logger.warn({ ...context, msg: message });
  }

  debug(message: string, context: object = {}): void {
    this.logger.debug({ ...context, msg: message });
  }

  child(threadId: number): PinoLogger {
    return this.logger.child({ threadId });
  }
}

export default new Logger();
