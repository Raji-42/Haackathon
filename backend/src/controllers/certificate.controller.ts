import { Request, Response } from 'express';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import { CertificateService } from '../services/certificate.service';
import { AuthenticatedRequest } from '../types';
import { CertificateStatus } from '@prisma/client';
import { QueueManager } from '../queues/queue.manager';

export class CertificateController {
  /**
   * Public verification endpoint. Requires NO login!
   * Query can be certificateNumber (e.g. CRT-2026-ABC123) or Candidate ID.
   * Masks personal phone/email to avoid exposing sensitive PII.
   */
  public static async publicVerify(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.params;
      const cleanQuery = query.trim();

      const cert = await prisma.certificate.findFirst({
        where: {
          OR: [
            { certificateNumber: cleanQuery },
            { candidateId: cleanQuery },
          ],
        },
        include: {
          batch: {
            include: {
              trainingCentre: {
                include: { district: true },
              },
            },
          },
          candidate: {
            select: {
              fullName: true,
              rollNumber: true,
              result: true,
              marksObtained: true,
              totalMarks: true,
            },
          },
        },
      });

      if (!cert) {
        res.status(404).json({
          verified: false,
          status: 'INVALID',
          message: 'Certificate not found. No genuine record exists for this identifier.',
        });
        return;
      }

      if (cert.status === CertificateStatus.CANCELLED) {
        res.json({
          verified: false,
          status: 'CANCELLED',
          message: 'This certificate was revoked and cancelled by the State Authority.',
          certificateNumber: cert.certificateNumber,
          candidateName: cert.candidateName,
          courseName: cert.courseName,
          issueDate: cert.issueDate,
          cancelledAt: cert.cancelledAt,
          cancelReason: cert.cancelReason,
          trainingCentre: cert.batch.trainingCentre.name,
          district: cert.batch.trainingCentre.district.name,
        });
        return;
      }

      res.json({
        verified: true,
        status: 'GENUINE',
        message: 'Certificate is authentic and validly issued under Pragati Skills Mission.',
        certificateNumber: cert.certificateNumber,
        candidateName: cert.candidateName,
        courseName: cert.courseName,
        issueDate: cert.issueDate,
        trainingCentre: cert.batch.trainingCentre.name,
        district: cert.batch.trainingCentre.district.name,
        result: cert.candidate.result,
        qrCodeDataUrl: cert.qrCodeDataUrl,
      });
    } catch (error) {
      console.error('Public verify error:', error);
      res.status(500).json({ error: 'Verification service error' });
    }
  }

  /**
   * Downloads the official PDF certificate.
   */
  public static async downloadPdf(req: Request, res: Response): Promise<void> {
    try {
      const { certNumber } = req.params;
      const cert = await prisma.certificate.findUnique({
        where: { certificateNumber: certNumber },
      });

      if (!cert) {
        res.status(404).json({ error: 'Certificate record not found' });
        return;
      }

      if (!fs.existsSync(cert.pdfPath)) {
        res.status(404).json({ error: 'PDF file is being generated or missing on server disk' });
        return;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${cert.certificateNumber}.pdf"`);
      fs.createReadStream(cert.pdfPath).pipe(res);
    } catch (error) {
      res.status(500).json({ error: 'Failed to download certificate' });
    }
  }

  /**
   * Cancels a certificate (State Office action).
   */
  public static async cancelCertificate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { certNumber } = req.params;
      const { reason } = req.body;

      if (!reason || typeof reason !== 'string') {
        res.status(400).json({ error: 'A specific cancellation reason is required' });
        return;
      }

      const cancelled = await CertificateService.cancelCertificate(
        certNumber,
        req.user!.userId,
        reason.trim()
      );

      res.json({
        message: `Certificate ${certNumber} has been successfully cancelled`,
        certificate: cancelled,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to cancel certificate' });
    }
  }

  /**
   * Manually retries a simulated WhatsApp message.
   */
  public static async retryNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await QueueManager.enqueueWhatsAppNotification(id);
      res.json({ message: `Simulated WhatsApp retry enqueued for notification ${id}` });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to retry notification' });
    }
  }

  /**
   * System configuration endpoints.
   */
  public static async getConfigs(_req: Request, res: Response): Promise<void> {
    try {
      const configs = await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
      res.json({ configs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch configs' });
    }
  }

  public static async updateConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { key, value } = req.body;
      const updated = await prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
      res.json({ message: `System configuration '${key}' updated`, config: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update system config' });
    }
  }
}
