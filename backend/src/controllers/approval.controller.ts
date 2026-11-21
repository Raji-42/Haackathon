import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { ApprovalService } from '../services/approval.service';

export class ApprovalController {
  public static async districtApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { batchId, action, remarks } = req.body;

      if (!batchId || !action) {
        res.status(400).json({ error: 'batchId and action (APPROVED, REJECTED, RETURNED) are required' });
        return;
      }

      const updatedBatch = await ApprovalService.processDistrictApproval({
        batchId,
        officerId: req.user!.userId,
        action,
        remarks,
        ipAddress: req.ip,
      });

      res.json({
        message: `District approval action '${action}' recorded successfully`,
        batch: updatedBatch,
      });
    } catch (error: any) {
      console.error('District approval error:', error);
      res.status(400).json({ error: error.message || 'Approval action failed' });
    }
  }

  public static async qualityReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { batchId, decision, observations } = req.body;

      if (!batchId || !decision || !observations) {
        res.status(400).json({ error: 'batchId, decision (APPROVED or FLAGGED) and observations are required' });
        return;
      }

      const updated = await ApprovalService.processQualityReview({
        batchId,
        reviewerId: req.user!.userId,
        decision,
        observations,
        ipAddress: req.ip,
      });

      res.json({
        message: `Quality review '${decision}' processed successfully`,
        batch: updated,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Quality review failed' });
    }
  }

  public static async stateApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { batchId, action, remarks } = req.body;

      if (!batchId || !action) {
        res.status(400).json({ error: 'batchId and action (APPROVED or REJECTED) are required' });
        return;
      }

      const updated = await ApprovalService.processStateApproval({
        batchId,
        officerId: req.user!.userId,
        action,
        remarks,
        ipAddress: req.ip,
      });

      res.json({
        message: `State office final action '${action}' recorded. Certificates queue triggered if approved.`,
        batch: updated,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'State approval failed' });
    }
  }
}
