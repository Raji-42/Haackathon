import { prisma } from '../utils/prisma';
import { UserRole } from '../types';

export interface CreateAuditLogParams {
  batchId?: string | null;
  userId: string;
  userRole: UserRole;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  details?: string;
  ipAddress?: string;
}

export class AuditService {
  public static async log(params: CreateAuditLogParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          batchId: params.batchId || null,
          userId: params.userId,
          userRole: params.userRole,
          action: params.action,
          fromStatus: params.fromStatus || null,
          toStatus: params.toStatus || null,
          details: params.details || null,
          ipAddress: params.ipAddress || null,
        },
      });
    } catch (error) {
      console.error('⚠️ Failed to write audit log:', error);
      // We don't throw here to avoid blocking main business flow if audit write fails,
      // but in strict compliance mode this is logged to alert handlers.
    }
  }

  public static async getBatchAuditTrail(batchId: string) {
    return prisma.auditLog.findMany({
      where: { batchId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
