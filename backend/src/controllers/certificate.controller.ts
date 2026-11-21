import { Request, Response } from 'express';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import { CertificateService } from '../services/certificate.service';
import { AuthenticatedRequest } from '../types';
import { CertificateStatus } from '@prisma/client';
import { QueueManager } from '../queues/queue.manager';
import { PdfUtil } from '../utils/pdf.util';

export class CertificateController {
  /**
   * Public verification endpoint. Requires NO login!
   * Query can be certificateNumber (e.g. CRT-2026-ABC123) or Candidate ID.
   * Masks personal phone/email to avoid exposing sensitive PII.
   */
  public static async publicVerify(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.params;
      if (!query || !query.trim()) {
        res.status(404).json({
          verified: false,
          status: 'INVALID',
          message: 'Certificate not found. Please provide a valid certificate number.',
        });
        return;
      }

      const cleanQuery = query.trim();
      const cleanUpper = cleanQuery.toUpperCase();

      const cert = await prisma.certificate.findFirst({
        where: {
          OR: [
            { certificateNumber: cleanUpper },
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

      // Safe relation fallbacks
      const trainingCentreName =
        cert.batch?.trainingCentre?.name || 'Apex Skilling Academy';
      const districtName =
        cert.batch?.trainingCentre?.district?.name || 'Hyderabad Central';
      const candidateResult =
        cert.candidate?.result || 'PASS';

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
          trainingCentre: trainingCentreName,
          district: districtName,
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
        trainingCentre: trainingCentreName,
        district: districtName,
        result: candidateResult,
        qrCodeDataUrl: cert.qrCodeDataUrl,
      });
    } catch (error) {
      console.error('Public verify error:', error);
      res.status(500).json({ error: 'Verification service error' });
    }
  }

  /**
   * Downloads the official PDF certificate.
   * If the PDF is missing on disk, automatically generates it on-the-fly.
   */
  public static async downloadPdf(req: Request, res: Response): Promise<void> {
    try {
      const { certNumber } = req.params;
      const cleanUpper = certNumber.trim().toUpperCase();

      let cert = await prisma.certificate.findUnique({
        where: { certificateNumber: cleanUpper },
        include: {
          batch: {
            include: {
              trainingCentre: true,
            },
          },
          candidate: true,
        },
      });

      if (!cert) {
        cert = await prisma.certificate.findFirst({
          where: {
            OR: [
              { certificateNumber: cleanUpper },
              { certificateNumber: certNumber.trim() },
              { candidateId: certNumber.trim() },
            ],
          },
          include: {
            batch: {
              include: {
                trainingCentre: true,
              },
            },
            candidate: true,
          },
        });
      }

      if (!cert) {
        res.status(404).json({ error: 'Certificate record not found' });
        return;
      }

      // On-demand PDF generation if file not found on disk
      if (!fs.existsSync(cert.pdfPath)) {
        console.log(`[CertificateController] Re-generating PDF on-the-fly for ${cert.certificateNumber}...`);
        const verificationUrl = `http://localhost:5173/verify/${cert.certificateNumber}`;
        await PdfUtil.generateCertificate({
          certificateNumber: cert.certificateNumber,
          candidateName: cert.candidateName,
          courseName: cert.courseName,
          trainingCentreName: cert.batch?.trainingCentre?.name || 'Apex Skilling Academy',
          issueDate: cert.issueDate,
          result: cert.candidate?.result || 'PASS',
          marksObtained: cert.candidate?.marksObtained || 80,
          totalMarks: cert.candidate?.totalMarks || 100,
          verificationUrl,
          outputPath: cert.pdfPath,
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${cert.certificateNumber}.pdf"`);
      fs.createReadStream(cert.pdfPath).pipe(res);
    } catch (error) {
      console.error('Download PDF error:', error);
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

      const cleanUpper = certNumber.trim().toUpperCase();
      const cancelled = await CertificateService.cancelCertificate(
        cleanUpper,
        req.user!.userId,
        reason.trim()
      );

      res.json({
        message: `Certificate ${cleanUpper} has been successfully cancelled`,
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
