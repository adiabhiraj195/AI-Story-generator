import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { GenerationService } from './services/generation.service.js';
import { PresetService } from './services/preset.service.js';
async function main() {
    logger.info({ env: env.NODE_ENV }, '[server] Initialising personal story generator backend');
    const app = await buildApp();
    const generationService = new GenerationService();
    const presetService = new PresetService();
    // Seed built-in system presets on startup (idempotent upsert)
    try {
        await presetService.seedSystemPresets();
    }
    catch (err) {
        logger.warn({ err }, '[server] System preset seeding skipped or failed (non-fatal)');
    }
    // Run startup recovery: detect stale PROCESSING jobs and mark FAILED, re-enqueue PENDING jobs
    try {
        await generationService.recoverOnStartup();
    }
    catch (err) {
        logger.warn({ err }, '[server] Startup recovery skipped or failed (non-fatal)');
    }
    // Graceful shutdown handlers
    const shutdown = async (signal) => {
        logger.info({ signal }, '[server] Graceful shutdown initiated');
        try {
            await app.close();
            logger.info('[server] Fastify server closed cleanly');
            process.exit(0);
        }
        catch (err) {
            logger.error({ err }, '[server] Error during shutdown');
            process.exit(1);
        }
    };
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    try {
        await app.listen({ port: env.PORT, host: env.HOST });
        logger.info({ host: env.HOST, port: env.PORT }, `[server] Server listening at http://${env.HOST}:${env.PORT}`);
    }
    catch (err) {
        logger.fatal({ err }, '[server] Failed to start server');
        process.exit(1);
    }
}
void main();
//# sourceMappingURL=server.js.map