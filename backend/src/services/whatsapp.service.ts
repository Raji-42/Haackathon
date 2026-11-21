import { prisma } from '../utils/prisma';
import { NotificationStatus } from '@prisma/client';

export interface SendWhatsAppMessageParams {
  notificationId: string;
  recipientPhone: string;
  candidateName: string;
  certificateNumber: string;
  downloadUrl: string;
  verificationUrl: string;
  forceFail?: boolean;
}

export interface WhatsAppSendResult {
  success: boolean;
  status: NotificationStatus;
  messageId?: string;
  error?: string;
  attemptNumber: number;
}

export class WhatsAppService {
  /**
   * Simulates sending a WhatsApp message with realistic latency, timeout, and failure probability.
   * Updates the Notification record in the database for tracking.
   */
  public static async sendMessage(params: SendWhatsAppMessageParams): Promise<WhatsAppSendResult> {
    const notification = await prisma.notification.findUnique({
      where: { id: params.notificationId },
    });

    if (!notification) {
      throw new Error(`Notification record ${params.notificationId} not found`);
    }

    const currentAttempt = notification.attempts + 1;

    // Fetch simulation configuration
    const simConfig = await prisma.systemConfig.findUnique({
      where: { key: 'WHATSAPP_SIMULATION_MODE' },
    });
    const simMode = simConfig?.value || 'RELIABLE_WITH_RETRY';

    // Simulate network delay (200ms - 500ms)
    await new Promise((resolve) => setTimeout(resolve, 300));

    let shouldFail = false;
    let failureReason = '';

    if (params.forceFail || simMode === 'FORCE_FAIL') {
      shouldFail = true;
      failureReason = 'SIMULATED_CARRIER_TIMEOUT: Telecom gateway did not respond within 5000ms';
    } else if (simMode === 'RELIABLE_WITH_RETRY') {
      // In RELIABLE_WITH_RETRY mode, fail on attempt 1, succeed on attempt 2 (shows retry working beautifully)
      if (currentAttempt === 1) {
        shouldFail = true;
        failureReason = 'TEMPORARY_NETWORK_ERROR: Handshake timeout with WhatsApp Cloud API node';
      }
    }

    if (shouldFail) {
      const isFinalAttempt = currentAttempt >= 3;
      const newStatus = isFinalAttempt ? NotificationStatus.PERMANENTLY_FAILED : NotificationStatus.FAILED;

      await prisma.notification.update({
        where: { id: params.notificationId },
        data: {
          attempts: currentAttempt,
          status: newStatus,
          lastError: failureReason,
          lastAttemptAt: new Date(),
        },
      });

      return {
        success: false,
        status: newStatus,
        error: failureReason,
        attemptNumber: currentAttempt,
      };
    }

    // Success path
    const messageId = `wamid.HBgMOTE3OTk${Date.now()}`;
    await prisma.notification.update({
      where: { id: params.notificationId },
      data: {
        attempts: currentAttempt,
        status: NotificationStatus.DELIVERED,
        lastError: null,
        lastAttemptAt: new Date(),
        deliveredAt: new Date(),
      },
    });

    return {
      success: true,
      status: NotificationStatus.DELIVERED,
      messageId,
      attemptNumber: currentAttempt,
    };
  }
}
