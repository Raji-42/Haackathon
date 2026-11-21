import { Request } from 'express';

export type UserRole = 'TRAINING_CENTRE' | 'DISTRICT_OFFICER' | 'QUALITY_TEAM' | 'STATE_OFFICE';

export type BatchStatusType =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_DISTRICT_APPROVAL_1'
  | 'PENDING_DISTRICT_APPROVAL_2'
  | 'QUALITY_REVIEW'
  | 'PENDING_STATE_APPROVAL'
  | 'APPROVED'
  | 'ISSUING_CERTIFICATES'
  | 'COMPLETED'
  | 'REJECTED'
  | 'RETURNED';

export type ApprovalActionType = 'APPROVED' | 'REJECTED' | 'RETURNED';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  trainingCentreId?: string | null;
  districtId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export interface CandidateRecord {
  fullName: string;
  phone: string;
  email?: string;
  rollNumber: string;
  marksObtained: number;
  totalMarks: number;
  result: string;
  rowNumber: number;
}

export interface ValidationErrorDetail {
  row: number;
  field: string;
  value: any;
  message: string;
}

export interface ExcelValidationResult {
  isValid: boolean;
  totalRows: number;
  validRowsCount: number;
  errorRowsCount: number;
  candidates: CandidateRecord[];
  errors: ValidationErrorDetail[];
}
