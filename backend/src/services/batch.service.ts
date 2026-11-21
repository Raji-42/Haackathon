import { prisma } from '../utils/prisma';
import { ExcelService } from './excel.service';
import { AuditService } from './audit.service';
import { config } from '../config';
import { BatchStatus, Role } from '@prisma/client';
import { AuthenticatedRequest, UserRole } from '../types';

export class BatchService {
  /**
   * Generates a unique batch number: BATCH-YYYY-XXXX
   */
  public static generateBatchNumber(): string {
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `BATCH-${year}-${randomHex}`;
  }

  /**
   * Creates a batch with candidates from uploaded spreadsheet file buffer.
   * Atomic: If any row validation fails, rejects completely with 0 rows saved!
   */
  public static async createBatchFromFile(params: {
    courseName: string;
    fileBuffer: Buffer;
    trainingCentreId: string;
    userId: string;
    ipAddress?: string;
  }) {
    const { courseName, fileBuffer, trainingCentreId, userId, ipAddress } = params;

    // 1. Strict In-Memory Validation (Zod/Excel Parser)
    const validation = ExcelService.parseAndValidateSpreadsheet(fileBuffer);

    if (!validation.isValid) {
      return {
        success: false,
        error: 'Spreadsheet validation failed. No records were saved.',
        validation,
      };
    }

    // 2. Fetch System Config for Large Batch Threshold
    const cfg = await prisma.systemConfig.findUnique({ where: { key: 'LARGE_BATCH_THRESHOLD' } });
    const threshold = cfg ? parseInt(cfg.value, 10) : config.largeBatchThreshold;

    const totalStudents = validation.candidates.length;
    const isQualityReviewRequired = totalStudents > threshold;
    const batchNumber = this.generateBatchNumber();

    // 3. Atomic Database Insertion
    const batch = await prisma.$transaction(async (tx) => {
      const createdBatch = await tx.batch.create({
        data: {
          batchNumber,
          courseName,
          trainingCentreId,
          status: BatchStatus.DRAFT,
          totalStudents,
          isQualityReviewRequired,
        },
      });

      // Insert all candidates
      await tx.candidate.createMany({
        data: validation.candidates.map((c) => ({
          batchId: createdBatch.id,
          fullName: c.fullName,
          phone: c.phone,
          email: c.email || null,
          rollNumber: c.rollNumber,
          marksObtained: c.marksObtained,
          totalMarks: c.totalMarks,
          result: c.result,
          rowNumber: c.rowNumber,
        })),
      });

      await AuditService.log({
        batchId: createdBatch.id,
        userId,
        userRole: Role.TRAINING_CENTRE,
        action: 'BATCH_CREATED',
        fromStatus: null,
        toStatus: BatchStatus.DRAFT,
        details: `Batch created with ${totalStudents} candidates. Quality Review Required: ${isQualityReviewRequired}`,
        ipAddress,
      });

      return createdBatch;
    });

    return {
      success: true,
      batch,
      totalStudents,
      isQualityReviewRequired,
    };
  }

  /**
   * Submits a DRAFT or RETURNED batch for District Officer approvals.
   */
  public static async submitBatch(batchId: string, userId: string, ipAddress?: string) {
    return await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        include: { candidates: true },
      });

      if (!batch) {
        throw new Error('Batch not found');
      }

      if (batch.status !== BatchStatus.DRAFT && batch.status !== BatchStatus.RETURNED) {
        throw new Error(`Only DRAFT or RETURNED batches can be submitted. Current status: ${batch.status}`);
      }

      if (batch.candidates.length === 0) {
        throw new Error('Cannot submit batch with 0 candidates');
      }

      const previousStatus = batch.status;
      const nextStatus = BatchStatus.PENDING_DISTRICT_APPROVAL_1;

      // Update batch
      const updated = await tx.batch.update({
        where: { id: batchId },
        data: {
          status: nextStatus,
          submittedAt: new Date(),
          lastActionAt: new Date(),
          rejectionReason: null,
          returnRemarks: null,
        },
      });

      await AuditService.log({
        batchId,
        userId,
        userRole: Role.TRAINING_CENTRE,
        action: previousStatus === BatchStatus.RETURNED ? 'BATCH_RESUBMITTED' : 'BATCH_SUBMITTED',
        fromStatus: previousStatus,
        toStatus: nextStatus,
        details: previousStatus === BatchStatus.RETURNED
          ? 'Batch resubmitted after corrections. Approvals cycle restarted at District 1.'
          : 'Batch submitted for District Officer 1 review.',
        ipAddress,
      });

      return updated;
    });
  }

  /**
   * Resubmits / Re-uploads spreadsheet for a RETURNED batch.
   */
  public static async updateReturnedBatchWithFile(params: {
    batchId: string;
    fileBuffer: Buffer;
    userId: string;
    ipAddress?: string;
  }) {
    const { batchId, fileBuffer, userId, ipAddress } = params;

    const validation = ExcelService.parseAndValidateSpreadsheet(fileBuffer);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'Updated spreadsheet has errors. Batch not modified.',
        validation,
      };
    }

    const cfg = await prisma.systemConfig.findUnique({ where: { key: 'LARGE_BATCH_THRESHOLD' } });
    const threshold = cfg ? parseInt(cfg.value, 10) : config.largeBatchThreshold;
    const totalStudents = validation.candidates.length;
    const isQualityReviewRequired = totalStudents > threshold;

    const updated = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id: batchId } });
      if (!batch || batch.status !== BatchStatus.RETURNED) {
        throw new Error('Batch is not in RETURNED status');
      }

      // Delete existing candidates
      await tx.candidate.deleteMany({ where: { batchId } });

      // Insert fresh validated candidates
      await tx.candidate.createMany({
        data: validation.candidates.map((c) => ({
          batchId,
          fullName: c.fullName,
          phone: c.phone,
          email: c.email || null,
          rollNumber: c.rollNumber,
          marksObtained: c.marksObtained,
          totalMarks: c.totalMarks,
          result: c.result,
          rowNumber: c.rowNumber,
        })),
      });

      const b = await tx.batch.update({
        where: { id: batchId },
        data: {
          totalStudents,
          isQualityReviewRequired,
          lastActionAt: new Date(),
        },
      });

      await AuditService.log({
        batchId,
        userId,
        userRole: Role.TRAINING_CENTRE,
        action: 'BATCH_CORRECTED_FILE_UPLOADED',
        fromStatus: BatchStatus.RETURNED,
        toStatus: BatchStatus.RETURNED,
        details: `Updated spreadsheet uploaded with ${totalStudents} candidates.`,
        ipAddress,
      });

      return b;
    });

    return {
      success: true,
      batch: updated,
    };
  }

  /**
   * Retrieves batches tailored to the requesting user's role and scope.
   */
  public static async getBatchesForUser(user: AuthenticatedRequest['user']) {
    if (!user) throw new Error('Unauthenticated');

    const cfg = await prisma.systemConfig.findUnique({ where: { key: 'APPROVAL_SLA_HOURS' } });
    const slaHours = cfg ? parseInt(cfg.value, 10) : config.approvalSlaHours;
    const now = new Date();

    let whereClause: any = {};

    if (user.role === Role.TRAINING_CENTRE) {
      if (user.trainingCentreId) {
        whereClause.trainingCentreId = user.trainingCentreId;
      }
    } else if (user.role === Role.DISTRICT_OFFICER) {
      if (user.districtId) {
        whereClause.trainingCentre = { districtId: user.districtId };
      }
    } else if (user.role === Role.QUALITY_TEAM) {
      // Quality team sees batches that are in QUALITY_REVIEW or marked isQualityReviewRequired
      whereClause.OR = [
        { status: BatchStatus.QUALITY_REVIEW },
        { isQualityReviewRequired: true },
      ];
    }
    // STATE_OFFICE sees all batches across the state

    const batches = await prisma.batch.findMany({
      where: whereClause,
      include: {
        trainingCentre: {
          include: { district: true },
        },
        approvals: {
          include: {
            officer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { candidates: true, certificates: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Annotate with SLA / Overdue calculation
    return batches.map((b) => {
      const hoursPending = (now.getTime() - new Date(b.lastActionAt).getTime()) / (1000 * 60 * 60);
      const pendingStatuses: BatchStatus[] = [
        BatchStatus.PENDING_DISTRICT_APPROVAL_1,
        BatchStatus.PENDING_DISTRICT_APPROVAL_2,
        BatchStatus.QUALITY_REVIEW,
        BatchStatus.PENDING_STATE_APPROVAL,
      ];
      const isPendingApproval = pendingStatuses.includes(b.status);

      return {
        ...b,
        hoursPending: Math.round(hoursPending * 10) / 10,
        isOverdue: isPendingApproval && hoursPending >= slaHours,
      };
    });
  }

  /**
   * Retrieves full batch details including timeline steps.
   */
  public static async getBatchById(batchId: string) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        trainingCentre: {
          include: { district: true },
        },
        candidates: {
          orderBy: { rowNumber: 'asc' },
          include: { certificate: true, notifications: true },
        },
        approvals: {
          orderBy: { createdAt: 'asc' },
          include: {
            officer: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        qualityReviews: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!batch) return null;

    const cfg = await prisma.systemConfig.findUnique({ where: { key: 'APPROVAL_SLA_HOURS' } });
    const slaHours = cfg ? parseInt(cfg.value, 10) : config.approvalSlaHours;
    const now = new Date();
    const hoursPending = (now.getTime() - new Date(batch.lastActionAt).getTime()) / (1000 * 60 * 60);
    const pendingStatuses: BatchStatus[] = [
      BatchStatus.PENDING_DISTRICT_APPROVAL_1,
      BatchStatus.PENDING_DISTRICT_APPROVAL_2,
      BatchStatus.QUALITY_REVIEW,
      BatchStatus.PENDING_STATE_APPROVAL,
    ];
    const isPendingApproval = pendingStatuses.includes(batch.status);

    return {
      ...batch,
      hoursPending: Math.round(hoursPending * 10) / 10,
      isOverdue: isPendingApproval && hoursPending >= slaHours,
    };
  }
}
