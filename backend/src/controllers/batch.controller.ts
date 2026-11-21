import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { BatchService } from '../services/batch.service';

export class BatchController {
  public static async uploadBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Please upload an Excel (.xlsx, .xls) or CSV file' });
        return;
      }

      const { courseName } = req.body;
      if (!courseName || typeof courseName !== 'string' || courseName.trim().length === 0) {
        res.status(400).json({ error: 'Course name is mandatory' });
        return;
      }

      if (!req.user?.trainingCentreId) {
        res.status(403).json({ error: 'Only training centres with a registered centre ID can upload student batches' });
        return;
      }

      const result = await BatchService.createBatchFromFile({
        courseName: courseName.trim(),
        fileBuffer: req.file.buffer,
        trainingCentreId: req.user.trainingCentreId,
        userId: req.user.userId,
        ipAddress: req.ip,
      });

      if (!result.success) {
        res.status(422).json({
          error: result.error,
          validation: result.validation,
        });
        return;
      }

      res.status(201).json({
        message: 'Batch uploaded and validated successfully',
        batch: result.batch,
        totalStudents: result.totalStudents,
        isQualityReviewRequired: result.isQualityReviewRequired,
      });
    } catch (error: any) {
      console.error('Batch upload error:', error);
      res.status(500).json({ error: error.message || 'Internal server error while processing batch' });
    }
  }

  public static async submitBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await BatchService.submitBatch(id, req.user!.userId, req.ip);
      res.json({ message: 'Batch successfully submitted for District Officer review', batch: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to submit batch' });
    }
  }

  public static async resubmitReturnedBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!req.file) {
        res.status(400).json({ error: 'Please upload the corrected Excel or CSV file' });
        return;
      }

      const result = await BatchService.updateReturnedBatchWithFile({
        batchId: id,
        fileBuffer: req.file.buffer,
        userId: req.user!.userId,
        ipAddress: req.ip,
      });

      if (!result.success) {
        res.status(422).json({ error: result.error, validation: result.validation });
        return;
      }

      res.json({ message: 'Returned batch records updated successfully', batch: result.batch });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update returned batch' });
    }
  }

  public static async listBatches(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const batches = await BatchService.getBatchesForUser(req.user);
      res.json({ batches });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch batches' });
    }
  }

  public static async getBatchById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const batch = await BatchService.getBatchById(id);
      if (!batch) {
        res.status(404).json({ error: 'Batch not found' });
        return;
      }
      res.json({ batch });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch batch details' });
    }
  }
}
