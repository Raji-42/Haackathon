import path from 'path';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { QRUtil } from '../utils/qr.util';
import { PdfUtil } from '../utils/pdf.util';
import { CertificateStatus, NotificationStatus } from '@prisma/client';

export class CertificateService {
  /**
   * Generates a unique, format-standard certificate number:
   * CRT-<YEAR>-<RANDOM_ALPHANUMERIC>
   */
  public static generateCertificateNumber(): string {
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CRT-${year}-${randomHex}`;
  }

  /**
   * Generates a certificate for a single candidate idempotently.
   * If a certificate already exists, returns the existing one without duplicating!
   */
  public static async generateCertificateForCandidate(candidateId: string, batchId: string) {
    // 1. Check if candidate already has a certificate
    const existingCert = await prisma.certificate.findUnique({
      where: { candidateId },
    });

    if (existingCert) {
      console.log(`ℹ️ Certificate already exists for candidate ${candidateId}: ${existingCert.certificateNumber}`);
      return existingCert;
    }

    // 2. Fetch candidate & batch data
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        batch: {
          include: {
            trainingCentre: true,
          },
        },
      },
    });

    if (!candidate) {
      throw new Error(`Candidate with id ${candidateId} not found`);
    }

    // 3. Generate unique certificate number
    let certificateNumber = this.generateCertificateNumber();
    let collisionCheck = await prisma.certificate.findUnique({ where: { certificateNumber } });
    while (collisionCheck) {
      certificateNumber = this.generateCertificateNumber();
      collisionCheck = await prisma.certificate.findUnique({ where: { certificateNumber } });
    }

    // 4. Verification URL & QR Code Data URL
    const verificationUrl = `http://localhost:5173/verify/${certificateNumber}`;
    const qrCodeDataUrl = await QRUtil.generateDataUrl(verificationUrl);

    // 5. Generate PDF
    const pdfFilename = `${certificateNumber}.pdf`;
    const pdfPath = path.join(config.certificateStorageDir, pdfFilename);

    const trainingCentreName =
      candidate.batch?.trainingCentre?.name || 'Apex Skilling Academy';
    const courseName =
      candidate.batch?.courseName || 'Web & Full Stack Development';

    await PdfUtil.generateCertificate({
      certificateNumber,
      candidateName: candidate.fullName,
      courseName,
      trainingCentreName,
      issueDate: new Date(),
      result: candidate.result,
      marksObtained: candidate.marksObtained,
      totalMarks: candidate.totalMarks,
      verificationUrl,
      outputPath: pdfPath,
    });

    // 6. Save Certificate Record in Database (Transaction-safe)
    const certificate = await prisma.certificate.create({
      data: {
        certificateNumber,
        candidateId: candidate.id,
        batchId: candidate.batchId,
        candidateName: candidate.fullName,
        courseName,
        status: CertificateStatus.GENUINE,
        qrCodeDataUrl,
        pdfPath,
        issueDate: new Date(),
      },
    });

    // 7. Create Notification record for WhatsApp delivery
    const notification = await prisma.notification.create({
      data: {
        candidateId: candidate.id,
        certificateId: certificate.id,
        recipientPhone: candidate.phone,
        channel: 'WHATSAPP',
        status: NotificationStatus.QUEUED,
      },
    });

    console.log(`✅ Certificate generated: ${certificateNumber} for ${candidate.fullName}`);
    return { certificate, notification };
  }

  /**
   * Processes all candidates in an approved batch to issue certificates.
   */
  public static async issueCertificatesForBatch(batchId: string) {
    const candidates = await prisma.candidate.findMany({
      where: { batchId },
      orderBy: { rowNumber: 'asc' },
    });

    console.log(`[CertificateService] Issuing certificates for ${candidates.length} candidate(s) in batch ${batchId}...`);
    const results = [];
    for (const candidate of candidates) {
      try {
        const res = await this.generateCertificateForCandidate(candidate.id, batchId);
        results.push(res);
      } catch (err) {
        console.error(`❌ Failed to generate certificate for candidate ${candidate.id}:`, err);
      }
    }

    // Update batch status to COMPLETED
    await prisma.batch.update({
      where: { id: batchId },
      data: {
        status: 'COMPLETED',
        lastActionAt: new Date(),
      },
    });

    console.log(`[CertificateService] Successfully issued ${results.length} certificates. Batch ${batchId} marked COMPLETED.`);
    return results;
  }

  /**
   * Cancels a certificate (State Office action).
   * Immediately updates DB so verification reflects CANCELLED status.
   */
  public static async cancelCertificate(
    certificateNumber: string,
    cancelledByUserId: string,
    cancelReason: string
  ) {
    const cleanNumber = certificateNumber.trim().toUpperCase();
    const cert = await prisma.certificate.findUnique({
      where: { certificateNumber: cleanNumber },
    });

    if (!cert) {
      throw new Error(`Certificate ${certificateNumber} not found`);
    }

    if (cert.status === CertificateStatus.CANCELLED) {
      return cert; // already cancelled
    }

    const updated = await prisma.certificate.update({
      where: { certificateNumber: cleanNumber },
      data: {
        status: CertificateStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason,
        cancelledByUserId,
      },
    });

    return updated;
  }
}
