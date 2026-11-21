import app from './app';
import { config } from './config';
import { QueueManager } from './queues/queue.manager';

const startServer = async () => {
  try {
    // Initialize BullMQ / background queue runner
    await QueueManager.init();

    app.listen(config.port, () => {
      console.log(`
==============================================================
🚀 CertiFlow Backend Server running on http://localhost:${config.port}
🏛️ Pragati Skills Mission - Certificate Issuance Platform
==============================================================
      `);
    });
  } catch (error) {
    console.error('Failed to start CertiFlow backend:', error);
    process.exit(1);
  }
};

startServer();
