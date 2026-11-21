export type UserRole = 'TRAINING_CENTRE' | 'DISTRICT_OFFICER' | 'QUALITY_TEAM' | 'STATE_OFFICE' | 'PUBLIC';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  trainingCentre?: {
    id: string;
    code: string;
    name: string;
  } | null;
  district?: {
    id: string;
    name: string;
  } | null;
}

export type BatchStatus =
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

export interface Candidate {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  rollNumber: string;
  marksObtained: number;
  totalMarks: number;
  result: string;
  rowNumber: number;
  certificate?: {
    id: string;
    certificateNumber: string;
    status: 'GENUINE' | 'CANCELLED';
    issueDate: string;
    qrCodeDataUrl: string;
  } | null;
  notifications?: {
    id: string;
    status: string;
    attempts: number;
    lastError?: string;
  }[];
}

export interface Approval {
  id: string;
  stage: string;
  action: 'APPROVED' | 'REJECTED' | 'RETURNED';
  remarks?: string;
  createdAt: string;
  officer: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface QualityReview {
  id: string;
  status: string;
  observations: string;
  reviewedAt: string;
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AuditLog {
  id: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  details?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

export interface Batch {
  id: string;
  batchNumber: string;
  courseName: string;
  trainingCentreId: string;
  trainingCentre: {
    id: string;
    code: string;
    name: string;
    district: {
      id: string;
      name: string;
    };
  };
  status: BatchStatus;
  totalStudents: number;
  isQualityReviewRequired: boolean;
  submittedAt?: string | null;
  lastActionAt: string;
  hoursPending?: number;
  isOverdue?: boolean;
  rejectionReason?: string | null;
  returnRemarks?: string | null;
  candidates?: Candidate[];
  approvals?: Approval[];
  qualityReviews?: QualityReview[];
  auditLogs?: AuditLog[];
  _count?: {
    candidates: number;
    certificates: number;
  };
}
