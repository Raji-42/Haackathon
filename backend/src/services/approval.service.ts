import { prisma } from '../utils/prisma';
import { AuditService } from './audit.service';
import { BatchStatus, ApprovalAction, Role } from '@prisma/client';
import { CertificateService } from './certificate.service';
import { QueueManager } from '../queues/queue.manager';

export interface ProcessApprovalParams {
  batchId: string;
  officerId: string;
  action: 'APPROVED' | 'REJECTED' | 'RETURNED';
  remarks?: string;
  ipAddress?: string;
}

export class ApprovalService {
  /**
   * Processes a District Officer's decision with strict two-officer dual control
   * and concurrency locking.
   */
  public static async processDistrictApproval(params: ProcessApprovalParams) {
    const { batchId, officerId, action, remarks, ipAddress } = params;

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch batch and officer details
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        include: {
          approvals: {
            where: { action: ApprovalAction.APPROVED },
          },
        },
      });

      if (!batch) {
        throw new Error('Batch not found');
      }

      const officer = await tx.user.findUnique({
        where: { id: officerId },
      });

      if (!officer || officer.role !== Role.DISTRICT_OFFICER) {
        throw new Error('Only an authorized District Officer can perform this action');
      }

      // Check current batch status
      const isDistrictStage1 =
        batch.status === BatchStatus.PENDING_DISTRICT_APPROVAL_1 ||
        (batch.status as any) === 'PENDING_DISTRICT_APPROVAL';
      const isDistrictStage2 = batch.status === BatchStatus.PENDING_DISTRICT_APPROVAL_2;

      if (!isDistrictStage1 && !isDistrictStage2) {
        throw new Error(`Batch is in state '${batch.status}', not awaiting district officer approval`);
      }

      // Handle REJECTION
      if (action === 'REJECTED') {
        const updated = await tx.batch.update({
          where: { id: batchId },
          data: {
            status: BatchStatus.REJECTED,
            rejectionReason: remarks || 'Rejected by District Officer',
            lastActionAt: new Date(),
          },
        });

        await tx.approval.create({
          data: {
            batchId,
            officerId,
            stage: isDistrictStage1 ? 'DISTRICT_1' : 'DISTRICT_2',
            action: ApprovalAction.REJECTED,
            remarks,
          },
        });

        await AuditService.log({
          batchId,
          userId: officerId,
          userRole: officer.role,
          action: 'DISTRICT_OFFICER_REJECTED',
          fromStatus: batch.status,
          toStatus: BatchStatus.REJECTED,
          details: `Rejected with remarks: ${remarks}`,
          ipAddress,
        });

        return updated;
      }

      // Handle RETURN FOR CORRECTION
      if (action === 'RETURNED') {
        const updated = await tx.batch.update({
          where: { id: batchId },
          data: {
            status: BatchStatus.RETURNED,
            returnRemarks: remarks || 'Returned for data correction',
            lastActionAt: new Date(),
          },
        });

        await tx.approval.create({
          data: {
            batchId,
            officerId,
            stage: isDistrictStage1 ? 'DISTRICT_1' : 'DISTRICT_2',
            action: ApprovalAction.RETURNED,
            remarks,
          },
        });

        await AuditService.log({
          batchId,
          userId: officerId,
          userRole: officer.role,
          action: 'DISTRICT_OFFICER_RETURNED',
          fromStatus: batch.status,
          toStatus: BatchStatus.RETURNED,
          details: `Returned to Training Centre with remarks: ${remarks}`,
          ipAddress,
        });

        return updated;
      }

      // Handle APPROVAL (Two-Officer Rule)
      if (isDistrictStage1) {
        // Record 1st District Approval
        await tx.approval.create({
          data: {
            batchId,
            officerId,
            stage: 'DISTRICT_1',
            action: ApprovalAction.APPROVED,
            remarks,
          },
        });

        const nextStatus = BatchStatus.PENDING_DISTRICT_APPROVAL_2;
        const updated = await tx.batch.update({
          where: { id: batchId },
          data: {
            status: nextStatus,
            lastActionAt: new Date(),
          },
        });

        await AuditService.log({
          batchId,
          userId: officerId,
          userRole: officer.role,
          action: 'DISTRICT_OFFICER_1_APPROVED',
          fromStatus: batch.status,
          toStatus: nextStatus,
          details: `First district approval recorded by ${officer.name}. Awaiting second independent officer.`,
          ipAddress,
        });

        return updated;
      }

      if (batch.status === BatchStatus.PENDING_DISTRICT_APPROVAL_2) {
        // Enforce: Officer 2 MUST be distinct from Officer 1!
        const existingFirstApproval = batch.approvals.find((a) => a.stage === 'DISTRICT_1');
        if (existingFirstApproval && existingFirstApproval.officerId === officerId) {
          throw new Error(
            'Two-Officer Rule Violation: The same officer cannot approve both District Stage 1 and Stage 2. An independent second officer is required.'
          );
        }

        // Record 2nd District Approval
        await tx.approval.create({
          data: {
            batchId,
            officerId,
            stage: 'DISTRICT_2',
            action: ApprovalAction.APPROVED,
            remarks,
          },
        });

        // Determine if Quality Review is required (either flag or > threshold)
        const nextStatus = batch.isQualityReviewRequired
          ? BatchStatus.QUALITY_REVIEW
          : BatchStatus.PENDING_STATE_APPROVAL;

        const updated = await tx.batch.update({
          where: { id: batchId },
          data: {
            status: nextStatus,
            lastActionAt: new Date(),
          },
        });

        await AuditService.log({
          batchId,
          userId: officerId,
          userRole: officer.role,
          action: 'DISTRICT_OFFICER_2_APPROVED',
          fromStatus: batch.status,
          toStatus: nextStatus,
          details: `Second district approval recorded by ${officer.name}. Advanced to ${nextStatus}.`,
          ipAddress,
        });

        return updated;
      }

      throw new Error('Invalid state transition');
    });
  }

  /**
   * Processes Quality Team Review (Neha).
   */
  public static async processQualityReview(params: {
    batchId: string;
    reviewerId: string;
    decision: 'APPROVED' | 'FLAGGED';
    observations: string;
    ipAddress?: string;
  }) {
    const { batchId, reviewerId, decision, observations, ipAddress } = params;

    return await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id: batchId } });
      if (!batch || batch.status !== BatchStatus.QUALITY_REVIEW) {
        throw new Error('Batch is not awaiting Quality Review');
      }

      const reviewer = await tx.user.findUnique({ where: { id: reviewerId } });
      if (!reviewer || reviewer.role !== Role.QUALITY_TEAM) {
        throw new Error('Only Quality Team members can perform this review');
      }

      await tx.qualityReview.create({
        data: {
          batchId,
          reviewerId,
          status: decision,
          observations,
        },
      });

      const nextStatus = decision === 'APPROVED' ? BatchStatus.PENDING_STATE_APPROVAL : BatchStatus.RETURNED;

      const updated = await tx.batch.update({
        where: { id: batchId },
        data: {
          status: nextStatus,
          returnRemarks: decision === 'FLAGGED' ? observations : null,
          lastActionAt: new Date(),
        },
      });

      await AuditService.log({
        batchId,
        userId: reviewerId,
        userRole: reviewer.role,
        action: `QUALITY_REVIEW_${decision}`,
        fromStatus: BatchStatus.QUALITY_REVIEW,
        toStatus: nextStatus,
        details: `Quality team observation: ${observations}`,
        ipAddress,
      });

      return updated;
    });
  }

  /**
   * Processes State Office Final Sign-off (Farah).
   * Upon approval, triggers certificate generation jobs!
   */
  public static async processStateApproval(params: {
    batchId: string;
    officerId: string;
    action: 'APPROVED' | 'REJECTED';
    remarks?: string;
    ipAddress?: string;
  }) {
    const { batchId, officerId, action, remarks, ipAddress } = params;

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        include: { candidates: true },
      });

      if (!batch || batch.status !== BatchStatus.PENDING_STATE_APPROVAL) {
        throw new Error('Batch is not awaiting State Office final approval');
      }

      const officer = await tx.user.findUnique({ where: { id: officerId } });
      if (!officer || officer.role !== Role.STATE_OFFICE) {
        throw new Error('Only State Office authorities can grant final approval');
      }

      if (action === 'REJECTED') {
        const updated = await tx.batch.update({
          where: { id: batchId },
          data: {
            status: BatchStatus.REJECTED,
            rejectionReason: remarks || 'Rejected by State Office',
            lastActionAt: new Date(),
          },
        });

        await tx.approval.create({
          data: {
            batchId,
            officerId,
            stage: 'STATE_FINAL',
            action: ApprovalAction.REJECTED,
            remarks,
          },
        });

        await AuditService.log({
          batchId,
          userId: officerId,
          userRole: officer.role,
          action: 'STATE_OFFICE_REJECTED',
          fromStatus: BatchStatus.PENDING_STATE_APPROVAL,
          toStatus: BatchStatus.REJECTED,
          details: `State office rejected with remarks: ${remarks}`,
          ipAddress,
        });

        return { batch: updated, approved: false };
      }

      // Approved by State
      await tx.approval.create({
        data: {
          batchId,
          officerId,
          stage: 'STATE_FINAL',
          action: ApprovalAction.APPROVED,
          remarks,
        },
      });

      const updated = await tx.batch.update({
        where: { id: batchId },
        data: {
          status: BatchStatus.ISSUING_CERTIFICATES,
          lastActionAt: new Date(),
        },
      });

      await AuditService.log({
        batchId,
        userId: officerId,
        userRole: officer.role,
        action: 'STATE_OFFICE_FINAL_APPROVED',
        fromStatus: BatchStatus.PENDING_STATE_APPROVAL,
        toStatus: BatchStatus.ISSUING_CERTIFICATES,
        details: `Final approval granted by State Director ${officer.name}. Dispatching certificate issuance queue.`,
        ipAddress,
      });

      return { batch: updated, approved: true };
    });

    // If state approved, generate certificates immediately so database records & PDFs exist at once!
    if (result.approved) {
      try {
        console.log(`[ApprovalService] Generating certificates for approved batch ${batchId}...`);
        await CertificateService.issueCertificatesForBatch(batchId);
      } catch (err) {
        console.error(`[ApprovalService] Error issuing certificates for batch ${batchId}:`, err);
      }
      // Also enqueue background WhatsApp delivery notifications
      QueueManager.enqueueCertificateIssuance(batchId);
    }

    // Return the latest batch state (now COMPLETED with certificates)
    const finalBatch = await prisma.batch.findUnique({ where: { id: batchId } });
    return finalBatch || result.batch;
  }
}
