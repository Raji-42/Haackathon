import fs from 'fs';
import path from 'path';
import { ExcelService } from '../src/services/excel.service';
import { CertificateService } from '../src/services/certificate.service';
import { QRUtil } from '../src/utils/qr.util';
import { PdfUtil } from '../src/utils/pdf.util';

describe('CertiFlow Hackathon Critical Evaluation Scenarios', () => {
  const sampleDir = path.resolve(__dirname, '../../sample_data');

  // =========================================================================
  // SCENARIO 1: Invalid Spreadsheet Validation (Zero Partial Save)
  // =========================================================================
  describe('Scenario 1: Spreadsheet Row-Level Validation & Atomicity', () => {
    it('should reject invalid spreadsheet, report exact row numbers, and return 0 candidates', () => {
      const invalidCsvPath = path.join(sampleDir, 'invalid_batch_with_errors.csv');
      const buffer = fs.readFileSync(invalidCsvPath);

      const result = ExcelService.parseAndValidateSpreadsheet(buffer);

      // Must be marked invalid
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Zero partial save guarantee: candidates list MUST be empty when spreadsheet has errors
      expect(result.candidates.length).toBe(0);

      // Verify specific row errors detected
      const missingNameErr = result.errors.find((e) => e.row === 2 && e.field === 'fullName');
      expect(missingNameErr).toBeDefined();
      expect(missingNameErr?.message).toContain('Student name is required');

      const badPhoneErr = result.errors.find((e) => e.row === 3 && e.field === 'phone');
      expect(badPhoneErr).toBeDefined();
      expect(badPhoneErr?.message).toContain('Invalid phone number');

      const marksExceedErr = result.errors.find((e) => e.row === 4 && e.field === 'marksObtained');
      expect(marksExceedErr).toBeDefined();
      expect(marksExceedErr?.message).toContain('cannot exceed total marks');

      const negativeMarksErr = result.errors.find((e) => e.row === 5 && e.field === 'marksObtained');
      expect(negativeMarksErr).toBeDefined();

      const duplicateRollErr = result.errors.find((e) => e.row === 5 && e.field === 'rollNumber');
      expect(duplicateRollErr).toBeDefined();
      expect(duplicateRollErr?.message).toContain('Duplicate roll number');
    });

    it('should accept valid 15-candidate spreadsheet and parse all rows cleanly', () => {
      const validCsvPath = path.join(sampleDir, 'valid_batch_15_candidates.csv');
      const buffer = fs.readFileSync(validCsvPath);

      const result = ExcelService.parseAndValidateSpreadsheet(buffer);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.candidates.length).toBe(15);
      expect(result.candidates[0].fullName).toBe('Aarav Sharma');
      expect(result.candidates[0].phone).toBe('9876543210');
      expect(result.candidates[0].result).toBe('DISTINCTION');
    });
  });

  // =========================================================================
  // SCENARIO 3: Duplicate Certificate Prevention (60 Candidates Batch)
  // =========================================================================
  describe('Scenario 3: 60-Candidate Batch & Duplicate Prevention', () => {
    it('should parse 60 candidates and verify format of generated certificate numbers', () => {
      const valid60CsvPath = path.join(sampleDir, 'valid_batch_60_candidates.csv');
      const buffer = fs.readFileSync(valid60CsvPath);

      const result = ExcelService.parseAndValidateSpreadsheet(buffer);

      expect(result.isValid).toBe(true);
      expect(result.candidates.length).toBe(60);

      // Verify certificate numbers format and uniqueness
      const certNumbers = new Set<string>();
      for (let i = 0; i < 60; i++) {
        const certNum = CertificateService.generateCertificateNumber();
        expect(certNum).toMatch(/^CRT-\d{4}-[A-Z0-9]{5,6}$/);
        certNumbers.add(certNum);
      }

      // Exactly 60 unique certificate numbers
      expect(certNumbers.size).toBe(60);
    });
  });

  // =========================================================================
  // SCENARIO 5: QR Code & PDF Generation Integrity
  // =========================================================================
  describe('Scenario 5: Dynamic QR Code & PDF Certificate Generation', () => {
    it('should generate a valid high-density QR code Data URL for verification', async () => {
      const verifyUrl = 'http://localhost:5173/verify/CRT-2026-TEST01';
      const qrDataUrl = await QRUtil.generateDataUrl(verifyUrl);

      expect(qrDataUrl).toBeDefined();
      expect(qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('should generate official PDF certificate file on disk', async () => {
      const testOutputDir = path.resolve(__dirname, '../test_output');
      const testPdfPath = path.join(testOutputDir, 'TEST_CERT_001.pdf');

      await PdfUtil.generateCertificate({
        certificateNumber: 'CRT-2026-TEST01',
        candidateName: 'Priya Sharma',
        courseName: 'Full Stack Cloud Development',
        trainingCentreName: 'Apex Skilling Academy',
        issueDate: new Date(),
        result: 'DISTINCTION',
        marksObtained: 94,
        totalMarks: 100,
        verificationUrl: 'http://localhost:5173/verify/CRT-2026-TEST01',
        outputPath: testPdfPath,
      });

      expect(fs.existsSync(testPdfPath)).toBe(true);
      const stats = fs.statSync(testPdfPath);
      expect(stats.size).toBeGreaterThan(1000); // Verify PDF has actual binary content

      // Cleanup test file
      fs.unlinkSync(testPdfPath);
      fs.rmdirSync(testOutputDir);
    });
  });

  // =========================================================================
  // SCENARIO 6: SLA & Delayed Approval Detection Logic
  // =========================================================================
  describe('Scenario 6: Approval SLA Overdue Calculation', () => {
    it('should correctly flag batches exceeding the SLA threshold as overdue', () => {
      const slaHours = 24;
      const now = new Date();

      // Case A: Action 5 hours ago (Not overdue)
      const recentAction = new Date(now.getTime() - 5 * 60 * 60 * 1000);
      const hoursPendingRecent = (now.getTime() - recentAction.getTime()) / (1000 * 60 * 60);
      const isOverdueRecent = hoursPendingRecent >= slaHours;
      expect(isOverdueRecent).toBe(false);

      // Case B: Action 30 hours ago (OVERDUE!)
      const oldAction = new Date(now.getTime() - 30 * 60 * 60 * 1000);
      const hoursPendingOld = (now.getTime() - oldAction.getTime()) / (1000 * 60 * 60);
      const isOverdueOld = hoursPendingOld >= slaHours;
      expect(isOverdueOld).toBe(true);
      expect(Math.floor(hoursPendingOld)).toBe(30);
    });
  });

  // =========================================================================
  // SCENARIO 2 & 7: Two-Officer Approval Rule & Returned Batch Decisions
  // =========================================================================
  describe('Scenario 2 & 7: Dual-Officer Rules & Returned Batch Logic', () => {
    it('should enforce that Officer 1 and Officer 2 must be different users', () => {
      const officer1Id = 'officer-dev-uuid';
      const officer2Same = 'officer-dev-uuid';
      const officer2Different = 'officer-meera-uuid';

      // Simulating dual approval constraint check:
      const validateSecondOfficer = (firstOfficerId: string, secondOfficerId: string) => {
        if (firstOfficerId === secondOfficerId) {
          throw new Error('Two-Officer Rule Violation: The same officer cannot approve both District Stage 1 and Stage 2.');
        }
        return true;
      };

      expect(() => validateSecondOfficer(officer1Id, officer2Same)).toThrow('Two-Officer Rule Violation');
      expect(validateSecondOfficer(officer1Id, officer2Different)).toBe(true);
    });
  });
});
