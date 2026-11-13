import pino from 'pino';
import { env } from '../config/env.js';
const isDev = env.NODE_ENV === 'development';
export const logger = pino({
    level: env.NODE_ENV === 'test' ? 'silent' : 'info',
    ...(isDev
        ? {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            },
        }
        : {}),
    base: {
        service: 'personal-story-generator',
        env: env.NODE_ENV,
    },
});
//# sourceMappingURL=logger.js.map