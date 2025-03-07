// formatters.ts
import pc from "picocolors"; // Import picocolors
import { PrettyOptions } from "pino-pretty";

interface LevelMap {
  [key: number]: { lvl: string; color: (str: string) => string };
}

interface Log {
  time: Date;
  level: number;
  threadId?: number;
  [key: string]: any;
}

const levelMap: LevelMap = {
  10: { lvl: "TRACE", color: pc.white },
  20: { lvl: "DEBUG", color: pc.blue },
  30: { lvl: "INFO", color: pc.green },
  40: { lvl: "WARN", color: pc.yellow },
  50: { lvl: "ERROR", color: pc.red },
  60: { lvl: "FATAL", color: pc.magenta },
};

const formatter = (options: PrettyOptions) => {
  return require("pino-pretty")({
    ...options,
    messageFormat: (log: Log, messageKey: string) => {
      const timestamp = new Date(log.time)
        .toISOString()
        .replace("T", " ")
        .slice(0, 19);

      const time = pc.white(`[${timestamp}]`);
      const msg = pc.white(`${log[messageKey]}`);
      const threadId = log.threadId !== undefined ? ` ${log.threadId}` : "";

      const level = levelMap[log.level].color(
        `${levelMap[log.level].lvl}${threadId}: ${msg}`
      );
      return `${time} ${level}`;
    },
  });
};

export default formatter;
