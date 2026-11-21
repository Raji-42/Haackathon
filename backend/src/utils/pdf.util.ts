import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { QRUtil } from './qr.util';

export interface GenerateCertificatePdfParams {
  certificateNumber: string;
  candidateName: string;
  courseName: string;
  trainingCentreName: string;
  issueDate: Date;
  result: string;
  marksObtained: number;
  totalMarks: number;
  verificationUrl: string;
  outputPath: string;
}

export class PdfUtil {
  public static async generateCertificate(params: GenerateCertificatePdfParams): Promise<string> {
    const dir = path.dirname(params.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const qrBuffer = await QRUtil.generateBuffer(params.verificationUrl);

    return new Promise((resolve, reject) => {
      // Landscape A4 (841.89 x 595.28 points)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
      });

      const writeStream = fs.createWriteStream(params.outputPath);
      doc.pipe(writeStream);

      const width = doc.page.width;
      const height = doc.page.height;

      // 1. Decorative Borders
      // Outer border
      doc.rect(20, 20, width - 40, height - 40)
        .lineWidth(4)
        .strokeColor('#0c4a6e') // Dark Navy
        .stroke();

      // Inner thin gold border
      doc.rect(26, 26, width - 52, height - 52)
        .lineWidth(1.5)
        .strokeColor('#d97706') // Gold
        .stroke();

      // Corner Accents
      const cornerSize = 25;
      // Top-left
      doc.moveTo(32, 32 + cornerSize).lineTo(32, 32).lineTo(32 + cornerSize, 32).lineWidth(2).strokeColor('#d97706').stroke();
      // Top-right
      doc.moveTo(width - 32 - cornerSize, 32).lineTo(width - 32, 32).lineTo(width - 32, 32 + cornerSize).lineWidth(2).strokeColor('#d97706').stroke();
      // Bottom-left
      doc.moveTo(32, height - 32 - cornerSize).lineTo(32, height - 32).lineTo(32 + cornerSize, height - 32).lineWidth(2).strokeColor('#d97706').stroke();
      // Bottom-right
      doc.moveTo(width - 32 - cornerSize, height - 32).lineTo(width - 32, height - 32).lineTo(width - 32, height - 32 - cornerSize).lineWidth(2).strokeColor('#d97706').stroke();

      // 2. Header
      doc.fontSize(13)
        .fillColor('#0369a1')
        .font('Helvetica-Bold')
        .text('GOVERNMENT OF PRAGATI STATE', 0, 50, { align: 'center' });

      doc.fontSize(10)
        .fillColor('#64748b')
        .font('Helvetica')
        .text('DEPARTMENT OF SKILL DEVELOPMENT & ENTREPRENEURSHIP', { align: 'center' });

      doc.moveDown(0.3);
      doc.fontSize(22)
        .fillColor('#0c4a6e')
        .font('Helvetica-Bold')
        .text('PRAGATI SKILLS MISSION', { align: 'center' });

      doc.moveDown(0.2);
      doc.fontSize(10)
        .fillColor('#d97706')
        .font('Helvetica-Bold')
        .text('CERTIFICATE OF VOCATIONAL PROFICIENCY', { align: 'center', characterSpacing: 1.5 });

      // Horizontal Divider
      doc.moveTo(150, 140).lineTo(width - 150, 140).lineWidth(1).strokeColor('#cbd5e1').stroke();

      // 3. Certificate Body
      doc.fontSize(11)
        .fillColor('#475569')
        .font('Helvetica')
        .text('This is to certify that', 0, 155, { align: 'center' });

      // Candidate Name
      doc.fontSize(24)
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .text(params.candidateName.toUpperCase(), 0, 175, { align: 'center' });

      doc.fontSize(11)
        .fillColor('#475569')
        .font('Helvetica')
        .text('has successfully completed the prescribed skilling curriculum and qualified in the assessment for', 0, 210, { align: 'center' });

      // Course Name
      doc.fontSize(18)
        .fillColor('#0284c7')
        .font('Helvetica-Bold')
        .text(params.courseName, 0, 230, { align: 'center' });

      // Details Block
      doc.fontSize(10)
        .fillColor('#334155')
        .font('Helvetica')
        .text(
          `Conducted at: ${params.trainingCentreName}   |   Result: ${params.result} (${params.marksObtained}/${params.totalMarks})`,
          0,
          265,
          { align: 'center' }
        );

      // 4. Security Metadata & QR Code Section
      const qrX = width - 180;
      const qrY = height - 190;
      doc.image(qrBuffer, qrX, qrY, { width: 110, height: 110 });

      doc.fontSize(8)
        .fillColor('#64748b')
        .font('Helvetica')
        .text('Scan with any smartphone', qrX - 10, qrY + 115, { width: 130, align: 'center' });
      doc.text('to verify authenticity', qrX - 10, qrY + 125, { width: 130, align: 'center' });

      // Certificate Identification & Issue Date
      doc.fontSize(9)
        .fillColor('#475569')
        .font('Helvetica-Bold')
        .text(`Certificate No: ${params.certificateNumber}`, 70, height - 160);

      const formattedDate = new Date(params.issueDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc.font('Helvetica')
        .text(`Issue Date: ${formattedDate}`, 70, height - 145);

      doc.fontSize(8)
        .fillColor('#94a3b8')
        .text('Security Hash: SHA-256 Digitally Signed', 70, height - 130);

      // 5. Signatures
      // District Signatory
      doc.moveTo(250, height - 85).lineTo(390, height - 85).lineWidth(1).strokeColor('#64748b').stroke();
      doc.fontSize(9)
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .text('District Skilling Officer', 250, height - 78, { width: 140, align: 'center' });
      doc.fontSize(8)
        .fillColor('#64748b')
        .font('Helvetica')
        .text('Competent Authority', 250, height - 66, { width: 140, align: 'center' });

      // State Signatory
      doc.moveTo(430, height - 85).lineTo(570, height - 85).lineWidth(1).strokeColor('#64748b').stroke();
      doc.fontSize(9)
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .text('Mission Director', 430, height - 78, { width: 140, align: 'center' });
      doc.fontSize(8)
        .fillColor('#64748b')
        .font('Helvetica')
        .text('Pragati Skills Mission', 430, height - 66, { width: 140, align: 'center' });

      doc.end();

      writeStream.on('finish', () => resolve(params.outputPath));
      writeStream.on('error', (err) => reject(err));
    });
  }
}
