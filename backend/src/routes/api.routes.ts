import { Router } from 'express';
import multer from 'multer';
import { AuthController } from '../controllers/auth.controller';
import { BatchController } from '../controllers/batch.controller';
import { ApprovalController } from '../controllers/approval.controller';
import { CertificateController } from '../controllers/certificate.controller';
import { authenticateToken, requireRoles } from '../middleware/auth';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();

// ========================
// 1. Authentication Routes
// ========================
router.post('/auth/login', AuthController.login);
router.post('/auth/demo-switch', AuthController.demoSwitch);
router.get('/auth/me', authenticateToken, AuthController.getProfile);

// ========================
// 2. Batch Lifecycle Routes
// ========================
router.post(
  '/batches/upload',
  authenticateToken,
  requireRoles(['TRAINING_CENTRE']),
  upload.single('file'),
  BatchController.uploadBatch
);

router.post(
  '/batches/:id/submit',
  authenticateToken,
  requireRoles(['TRAINING_CENTRE']),
  BatchController.submitBatch
);

router.put(
  '/batches/:id/resubmit-file',
  authenticateToken,
  requireRoles(['TRAINING_CENTRE']),
  upload.single('file'),
  BatchController.resubmitReturnedBatch
);

router.get('/batches', authenticateToken, BatchController.listBatches);
router.get('/batches/:id', authenticateToken, BatchController.getBatchById);

// ========================
// 3. Approval Workflow Routes
// ========================
router.post(
  '/approvals/district',
  authenticateToken,
  requireRoles(['DISTRICT_OFFICER']),
  ApprovalController.districtApproval
);

router.post(
  '/approvals/quality',
  authenticateToken,
  requireRoles(['QUALITY_TEAM']),
  ApprovalController.qualityReview
);

router.post(
  '/approvals/state',
  authenticateToken,
  requireRoles(['STATE_OFFICE']),
  ApprovalController.stateApproval
);

// ========================
// 4. Certificates & Public Verification Routes
// ========================
// Public verification does NOT require login!
router.get('/public/verify/:query', CertificateController.publicVerify);
router.get('/certificates/:certNumber/download', CertificateController.downloadPdf);

router.post(
  '/certificates/:certNumber/cancel',
  authenticateToken,
  requireRoles(['STATE_OFFICE']),
  CertificateController.cancelCertificate
);

router.post(
  '/notifications/:id/retry',
  authenticateToken,
  CertificateController.retryNotification
);

// ========================
// 5. System Config Routes
// ========================
router.get('/system/configs', CertificateController.getConfigs);
router.put(
  '/system/configs',
  authenticateToken,
  requireRoles(['STATE_OFFICE']),
  CertificateController.updateConfig
);

export default router;
