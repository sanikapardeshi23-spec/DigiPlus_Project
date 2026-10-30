import pino from "pino";

const isServer = typeof window === "undefined";

export const logger = isServer
  ? pino({
      level: process.env.LOG_LEVEL || "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? {
              target: "pino-pretty",
              options: {
                colorize: true,
                ignore: "pid,hostname",
              },
            }
          : undefined,
    })
  : pino({
      browser: {
        asObject: true,
      },
      level: "info",
    });

export default logger;
