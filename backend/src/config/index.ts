import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'certiflow_super_secure_jwt_secret_key_2026',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/certiflow?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  nodeEnv: process.env.NODE_ENV || 'development',
  largeBatchThreshold: parseInt(process.env.LARGE_BATCH_THRESHOLD || '25', 10),
  approvalSlaHours: parseInt(process.env.APPROVAL_SLA_HOURS || '24', 10),
  certificateStorageDir: path.resolve(process.env.CERTIFICATE_STORAGE_DIR || path.join(__dirname, '../../uploads/certificates')),
};
