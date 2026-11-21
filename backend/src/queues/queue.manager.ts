import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import { CertificateService } from '../services/certificate.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { prisma } from '../utils/prisma';

export class QueueManager {
  private static redisConnection: IORedis | null = null;
  private static certQueue: Queue | null = null;
  private static waQueue: Queue | null = null;
  private static isRedisAvailable = false;

  public static async init() {
    try {
      this.redisConnection = new IORedis(config.redisUrl, {
        maxRetriesPerRequest: null,
        connectTimeout: 2000,
        retryStrategy: () => null, // don't hang if redis server not present locally
      });

      this.redisConnection.on('error', (err) => {
        if (!this.isRedisAvailable) {
          console.log('ℹ️ Redis server not reachable locally; enabling in-memory background processor fallback.');
        }
        this.isRedisAvailable = false;
      });

      await new Promise<void>((resolve) => {
        this.redisConnection?.on('connect', () => {
          this.isRedisAvailable = true;
          console.log('✅ Connected to Redis successfully. BullMQ queues active.');
          resolve();
        });
        setTimeout(() => resolve(), 1000);
      });

      if (this.isRedisAvailable) {
        this.certQueue = new Queue('certificate-generation', { connection: this.redisConnection });
        this.waQueue = new Queue('whatsapp-notifications', { connection: this.redisConnection });

        // Certificate Worker
        new Worker(
          'certificate-generation',
          async (job: Job) => {
            console.log(`[BullMQ] Generating certificates for batch ${job.data.batchId}...`);
            const results = await CertificateService.issueCertificatesForBatch(job.data.batchId);
            // Enqueue WhatsApp notifications for each candidate
            for (const item of results) {
              if (item && 'notification' in item) {
                await this.enqueueWhatsAppNotification(item.notification.id);
              }
            }
          },
          { connection: this.redisConnection }
        );

        // WhatsApp Notification Worker with Exponential Retries
        new Worker(
          'whatsapp-notifications',
          async (job: Job) => {
            console.log(`[BullMQ] Sending WhatsApp notification ${job.data.notificationId} (Attempt: ${job.attemptsMade + 1})...`);
            const notification = await prisma.notification.findUnique({
              where: { id: job.data.notificationId },
              include: { candidate: true, certificate: true },
            });

            if (!notification) return;

            const res = await WhatsAppService.sendMessage({
              notificationId: notification.id,
              recipientPhone: notification.recipientPhone,
              candidateName: notification.candidate.fullName,
              certificateNumber: notification.certificate.certificateNumber,
              downloadUrl: `http://localhost:5000/api/certificates/${notification.certificate.certificateNumber}/download`,
              verificationUrl: `http://localhost:5173/verify/${notification.certificate.certificateNumber}`,
            });

            if (!res.success) {
              throw new Error(res.error || 'WhatsApp delivery failed');
            }
          },
          {
            connection: this.redisConnection,
            concurrency: 5,
          }
        );
      }
    } catch (e) {
      this.isRedisAvailable = false;
      console.log('ℹ️ In-memory background worker will process async jobs.');
    }
  }

  /**
   * Enqueues certificate issuance for an entire approved batch.
   */
  public static async enqueueCertificateIssuance(batchId: string) {
    if (this.isRedisAvailable && this.certQueue) {
      await this.certQueue.add('generate-batch-certs', { batchId });
      return;
    }

    // In-memory Asynchronous Processor (Non-blocking)
    setImmediate(async () => {
      try {
        console.log(`[AsyncWorker] Generating certificates for batch ${batchId}...`);
        const results = await CertificateService.issueCertificatesForBatch(batchId);
        for (const item of results) {
          if (item && 'notification' in item) {
            await this.enqueueWhatsAppNotification(item.notification.id);
          }
        }
      } catch (err) {
        console.error(`[AsyncWorker] Error issuing certificates for batch ${batchId}:`, err);
      }
    });
  }

  /**
   * Enqueues a simulated WhatsApp notification with automatic retry mechanism.
   */
  public static async enqueueWhatsAppNotification(notificationId: string) {
    if (this.isRedisAvailable && this.waQueue) {
      await this.waQueue.add(
        'send-whatsapp',
        { notificationId },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );
      return;
    }

    // In-memory retry runner
    const runAttempt = async (attempt: number) => {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        include: { candidate: true, certificate: true },
      });

      if (!notification) return;

      console.log(`[AsyncWorker] Sending WhatsApp notification for ${notification.candidate.fullName} (Attempt ${attempt})...`);
      const res = await WhatsAppService.sendMessage({
        notificationId: notification.id,
        recipientPhone: notification.recipientPhone,
        candidateName: notification.candidate.fullName,
        certificateNumber: notification.certificate.certificateNumber,
        downloadUrl: `http://localhost:5000/api/certificates/${notification.certificate.certificateNumber}/download`,
        verificationUrl: `http://localhost:5173/verify/${notification.certificate.certificateNumber}`,
      });

      if (!res.success && attempt < 3) {
        const backoffMs = attempt * 1500;
        console.log(`[AsyncWorker] Notification failed: ${res.error}. Scheduling retry attempt ${attempt + 1} in ${backoffMs}ms...`);
        setTimeout(() => runAttempt(attempt + 1), backoffMs);
      }
    };

    setImmediate(() => runAttempt(1));
  }
}
