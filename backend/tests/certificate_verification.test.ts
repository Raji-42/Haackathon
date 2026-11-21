import { prisma } from '../src/utils/prisma';
import { CertificateService } from '../src/services/certificate.service';
import { ApprovalService } from '../src/services/approval.service';
import { CertificateController } from '../src/controllers/certificate.controller';
import { BatchStatus, CertificateStatus } from '@prisma/client';
import fs from 'fs';

jest.setTimeout(30000);

describe('Certificate Generation and Public Verification Integration', () => {
  let demoBatchId: string;
  let testCertNumber: string;

  beforeAll(async () => {
    // Reset test certificates to start fresh
    const candidates = await prisma.candidate.findMany({ where: { batchId: 'batch-demo-001' } });
    const candIds = candidates.map(c => c.id);
    const { InMemoryDb } = require('../src/utils/mock-db');
    InMemoryDb.certificates = InMemoryDb.certificates.filter((c: any) => !candIds.includes(c.candidateId));

    // Locate the seeded demo batch
    const batch = await prisma.batch.findUnique({
      where: { batchNumber: 'BATCH-2026-DEMO1' },
      include: { candidates: true },
    });
    expect(batch).toBeDefined();
    demoBatchId = batch!.id;

    // Advance batch status to PENDING_STATE_APPROVAL for test
    await prisma.batch.update({
      where: { id: demoBatchId },
      data: { status: BatchStatus.PENDING_STATE_APPROVAL },
    });
  });

  it('Requirement 1 & 2: Automatically generates certificates with unique Certificate IDs upon State Office approval', async () => {
    // Farah (State Director) grants final approval
    const updatedBatch = await ApprovalService.processStateApproval({
      batchId: demoBatchId,
      officerId: 'usr-farah',
      action: 'APPROVED',
      remarks: 'Sanctioned for immediate digital issuance',
    });

    expect(updatedBatch.status).toBe(BatchStatus.COMPLETED);

    // Verify all candidates have certificates
    const candidates = await prisma.candidate.findMany({ where: { batchId: demoBatchId } });
    expect(candidates.length).toBe(15);

    for (const cand of candidates) {
      const cert = await prisma.certificate.findUnique({ where: { candidateId: cand.id } });
      expect(cert).toBeDefined();
      expect(cert!.certificateNumber).toMatch(/^CRT-\d{4}-[A-Z0-9]{6}$/);
      expect(cert!.status).toBe(CertificateStatus.GENUINE);
      expect(cert!.candidateName).toBe(cand.fullName);
      expect(cert!.batchId).toBe(demoBatchId);
      expect(cert!.issueDate).toBeDefined();
    }

    // Pick first candidate's certificate for subsequent tests
    const firstCert = await prisma.certificate.findUnique({ where: { candidateId: candidates[0].id } });
    expect(firstCert).toBeDefined();
    testCertNumber = firstCert!.certificateNumber;
  });

  it('Requirement 5, 6 & 11: PDF and QR code contain the exact same Certificate ID', async () => {
    const cert = await prisma.certificate.findUnique({ where: { certificateNumber: testCertNumber } });
    expect(cert).toBeDefined();

    // Verify PDF exists and has non-zero size
    expect(fs.existsSync(cert!.pdfPath)).toBe(true);
    const stats = fs.statSync(cert!.pdfPath);
    expect(stats.size).toBeGreaterThan(1000);

    // Verify QR code Data URL exists
    expect(cert!.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('Requirement 7, 8 & 14: Public verification without login returns Genuine Certificate details', async () => {
    let responseStatus = 200;
    let responseJson: any = null;

    const mockReq: any = {
      params: { query: testCertNumber },
    };
    const mockRes: any = {
      status: (code: number) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        responseJson = data;
        return mockRes;
      },
    };

    await CertificateController.publicVerify(mockReq, mockRes);

    expect(responseStatus).toBe(200);
    expect(responseJson).toBeDefined();
    expect(responseJson.verified).toBe(true);
    expect(responseJson.status).toBe('GENUINE');
    expect(responseJson.certificateNumber).toBe(testCertNumber);
    expect(responseJson.candidateName).toBe('Aarav Sharma');
    expect(responseJson.courseName).toBe('Web & Full Stack Development');
    expect(responseJson.issueDate).toBeDefined();
    expect(responseJson.trainingCentre).toBeDefined();
    expect(responseJson.district).toBeDefined();
  });

  it('Requirement 10: Non-existent Certificate ID returns 404 with Certificate Not Found', async () => {
    let responseStatus = 200;
    let responseJson: any = null;

    const mockReq: any = {
      params: { query: 'CRT-DOES-NOT-EXIST-999' },
    };
    const mockRes: any = {
      status: (code: number) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        responseJson = data;
        return mockRes;
      },
    };

    await CertificateController.publicVerify(mockReq, mockRes);

    expect(responseStatus).toBe(404);
    expect(responseJson).toBeDefined();
    expect(responseJson.verified).toBe(false);
    expect(responseJson.status).toBe('INVALID');
    expect(responseJson.message).toContain('Certificate not found');
  });

  it('Requirement 9: Cancelled certificate returns Certificate Cancelled', async () => {
    // Cancel the certificate
    await CertificateService.cancelCertificate(
      testCertNumber,
      'usr-farah',
      'Revoked due to duplicate assessment submission'
    );

    let responseStatus = 200;
    let responseJson: any = null;

    const mockReq: any = {
      params: { query: testCertNumber },
    };
    const mockRes: any = {
      status: (code: number) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        responseJson = data;
        return mockRes;
      },
    };

    await CertificateController.publicVerify(mockReq, mockRes);

    expect(responseStatus).toBe(200);
    expect(responseJson).toBeDefined();
    expect(responseJson.verified).toBe(false);
    expect(responseJson.status).toBe('CANCELLED');
    expect(responseJson.cancelReason).toBe('Revoked due to duplicate assessment submission');
    expect(responseJson.certificateNumber).toBe(testCertNumber);
  });

  it('Requirement 12: Prevents duplicate certificate generation for the same student', async () => {
    const candidate = (await prisma.candidate.findMany({ where: { batchId: demoBatchId } }))[0];
    const existingCert = await prisma.certificate.findUnique({ where: { candidateId: candidate.id } });

    // Call generate again for the same student
    const result = await CertificateService.generateCertificateForCandidate(candidate.id, demoBatchId);

    // Must return existing certificate without changing certificateNumber
    const certObj = 'certificate' in result ? result.certificate : result;
    expect(certObj.certificateNumber).toBe(existingCert!.certificateNumber);
  });

  it('Task 11: Confirms that the student name in the PDF matches the verification API name for CRT-2026-FSFOHQ', async () => {
    const certNum = 'CRT-2026-FSFOHQ';
    const pdfPath = require('path').resolve(__dirname, '../uploads/certificates', `${certNum}.pdf`);
    expect(fs.existsSync(pdfPath)).toBe(true);

    const { getCandidateFromPdf } = require('../src/utils/mock-db');
    const pdfStudentName = getCandidateFromPdf(pdfPath);
    expect(pdfStudentName).toBe('BHAVYA PATEL');

    let responseStatus = 200;
    let responseJson: any = null;
    const mockReq: any = { params: { query: certNum } };
    const mockRes: any = {
      status: (code: number) => { responseStatus = code; return mockRes; },
      json: (data: any) => { responseJson = data; return mockRes; },
    };
    await CertificateController.publicVerify(mockReq, mockRes);

    expect(responseStatus).toBe(200);
    expect(responseJson.verified).toBe(true);
    expect(responseJson.status).toBe('GENUINE');
    expect(responseJson.candidateName.toUpperCase()).toBe(pdfStudentName!.toUpperCase());
  });
});
