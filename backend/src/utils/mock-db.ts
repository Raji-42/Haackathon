import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Pre-hashed "Password123!"
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('Password123!', 10);

const STATE_FILE_PATH = path.resolve(__dirname, '../../uploads/mock_db_state.json');
const CERT_DIR = path.resolve(__dirname, '../../uploads/certificates');

/**
 * Extracts the exact student name stamped inside a certificate PDF.
 */
export function getCandidateFromPdf(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    let pos = 0;
    while ((pos = buf.indexOf('stream', pos)) !== -1) {
      const end = buf.indexOf('endstream', pos);
      if (end !== -1) {
        let streamData = buf.subarray(pos + 6, end);
        if (streamData[0] === 0x0d && streamData[1] === 0x0a) streamData = streamData.subarray(2);
        else if (streamData[0] === 0x0a) streamData = streamData.subarray(1);
        try {
          const text = zlib.inflateSync(streamData).toString();
          const hexMatches = text.match(/<([0-9a-fA-F]+)>/g);
          if (hexMatches) {
            const str = hexMatches.map((h) => Buffer.from(h.replace(/<|>/g, ''), 'hex').toString('utf8')).join('');
            const m = str.match(/This is to certify that(.+?)has successfully completed/);
            if (m && m[1]) return m[1].trim();
          }
        } catch (e) {
          // not zlib or not target stream
        }
      }
      pos = end + 9;
    }
  } catch (e) {
    // non-fatal
  }
  return null;
}

export class InMemoryDb {
  public static districts: any[] = [
    { id: 'dist-hyd-01', name: 'Hyderabad Central', state: 'Pragati State' },
    { id: 'dist-cyb-02', name: 'Cyberabad South', state: 'Pragati State' },
  ];

  public static trainingCentres: any[] = [
    {
      id: 'tc-apex-01',
      code: 'TC-HYD-001',
      name: 'Apex Skilling Academy',
      districtId: 'dist-hyd-01',
    },
  ];

  public static users: any[] = [
    {
      id: 'usr-anika',
      email: 'anika@certiflow.gov.in',
      name: 'Anika Sharma',
      role: 'TRAINING_CENTRE',
      passwordHash: DEFAULT_PASSWORD_HASH,
      trainingCentreId: 'tc-apex-01',
      districtId: 'dist-hyd-01',
      createdAt: new Date(),
    },
    {
      id: 'usr-dev',
      email: 'dev@certiflow.gov.in',
      name: 'Dev Verma',
      role: 'DISTRICT_OFFICER',
      passwordHash: DEFAULT_PASSWORD_HASH,
      trainingCentreId: null,
      districtId: 'dist-hyd-01',
      createdAt: new Date(),
    },
    {
      id: 'usr-meera',
      email: 'meera@certiflow.gov.in',
      name: 'Meera Iyer',
      role: 'DISTRICT_OFFICER',
      passwordHash: DEFAULT_PASSWORD_HASH,
      trainingCentreId: null,
      districtId: 'dist-hyd-01',
      createdAt: new Date(),
    },
    {
      id: 'usr-kabir',
      email: 'kabir@certiflow.gov.in',
      name: 'Kabir Das',
      role: 'DISTRICT_OFFICER',
      passwordHash: DEFAULT_PASSWORD_HASH,
      trainingCentreId: null,
      districtId: 'dist-hyd-01',
      createdAt: new Date(),
    },
    {
      id: 'usr-neha',
      email: 'neha@certiflow.gov.in',
      name: 'Neha Reddy',
      role: 'QUALITY_TEAM',
      passwordHash: DEFAULT_PASSWORD_HASH,
      trainingCentreId: null,
      districtId: null,
      createdAt: new Date(),
    },
    {
      id: 'usr-farah',
      email: 'farah@certiflow.gov.in',
      name: 'Farah Khan',
      role: 'STATE_OFFICE',
      passwordHash: DEFAULT_PASSWORD_HASH,
      trainingCentreId: null,
      districtId: null,
      createdAt: new Date(),
    },
  ];

  public static systemConfigs: any[] = [
    {
      id: 'cfg-1',
      key: 'LARGE_BATCH_THRESHOLD',
      value: '25',
      description: 'Batches exceeding this number require Quality Review',
      updatedAt: new Date(),
    },
    {
      id: 'cfg-2',
      key: 'APPROVAL_SLA_HOURS',
      value: '24',
      description: 'Hours before pending approval is marked OVERDUE',
      updatedAt: new Date(),
    },
    {
      id: 'cfg-3',
      key: 'WHATSAPP_SIMULATION_MODE',
      value: 'RELIABLE_WITH_RETRY',
      description: 'Simulation mode',
      updatedAt: new Date(),
    },
  ];

  public static batches: any[] = [];
  public static candidates: any[] = [];
  public static approvals: any[] = [];
  public static qualityReviews: any[] = [];
  public static certificates: any[] = [];
  public static notifications: any[] = [];
  public static auditLogs: any[] = [];

  public static persistState() {
    try {
      const dir = path.dirname(STATE_FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const state = {
        batches: this.batches,
        candidates: this.candidates,
        approvals: this.approvals,
        qualityReviews: this.qualityReviews,
        certificates: this.certificates,
        notifications: this.notifications,
        auditLogs: this.auditLogs,
      };
      fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
      // non-blocking
    }
  }

  public static loadPersistedState(): boolean {
    try {
      if (fs.existsSync(STATE_FILE_PATH)) {
        const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8');
        const state = JSON.parse(raw);
        if (state.batches && state.batches.length > 0) {
          this.batches = state.batches;
          this.candidates = state.candidates || [];
          this.approvals = state.approvals || [];
          this.qualityReviews = state.qualityReviews || [];
          this.certificates = state.certificates || [];
          this.notifications = state.notifications || [];
          this.auditLogs = state.auditLogs || [];
          return true;
        }
      }
    } catch (e) {
      // ignore
    }
    return false;
  }

  // Auto-scan certificates directory and register any PDFs found on disk
  public static autoRecoverCertificatesFromDisk() {
    try {
      if (!fs.existsSync(CERT_DIR)) return;
      const files = fs.readdirSync(CERT_DIR).filter((f) => f.startsWith('CRT-') && f.endsWith('.pdf'));

      for (const file of files) {
        const certNum = file.replace('.pdf', '').toUpperCase();
        const existing = this.certificates.find((c) => c.certificateNumber.toUpperCase() === certNum);
        if (!existing) {
          const pdfPath = path.join(CERT_DIR, file);
          const studentName = getCandidateFromPdf(pdfPath);
          const candidate = studentName
            ? this.candidates.find((c) => c.fullName.toUpperCase() === studentName.toUpperCase())
            : null;

          const newCert = {
            id: `cert-${certNum.toLowerCase()}`,
            certificateNumber: certNum,
            candidateId: candidate ? candidate.id : `cand-${certNum.toLowerCase()}`,
            batchId: candidate ? candidate.batchId : 'batch-demo-001',
            candidateName: candidate ? candidate.fullName : (studentName || 'Certified Student'),
            courseName: 'Web & Full Stack Development',
            status: 'GENUINE',
            qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            pdfPath,
            issueDate: new Date('2026-11-21T05:18:49.000Z'),
            createdAt: new Date('2026-11-21T05:18:49.000Z'),
          };
          this.certificates.push(newCert);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Helper to populate sample batch for instant demo
  public static initSampleBatch() {
    const loaded = this.loadPersistedState();
    if (!loaded && this.batches.length === 0) {
      const sampleBatch = {
        id: 'batch-demo-001',
        batchNumber: 'BATCH-2026-DEMO1',
        courseName: 'Web & Full Stack Development',
        trainingCentreId: 'tc-apex-01',
        status: 'PENDING_DISTRICT_APPROVAL_1',
        totalStudents: 15,
        isQualityReviewRequired: false,
        submittedAt: new Date(Date.now() - 3600000), // 1 hour ago
        lastActionAt: new Date(Date.now() - 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.batches.push(sampleBatch);

      const names = [
        'Aarav Sharma', 'Bhavya Patel', 'Chetan Kumar', 'Divya Singh', 'Eshwar Rao',
        'Farzana Begum', 'Gopal Krishna', 'Harini Nair', 'Ishaan Gupta', 'Jaya Lakshmi',
        'Karan Joshi', 'Lavanya Sundaram', 'Manish Tiwari', 'Nandini Reddy', 'Omkar Deshmukh'
      ];

      names.forEach((name, idx) => {
        this.candidates.push({
          id: `cand-${idx + 1}`,
          batchId: 'batch-demo-001',
          fullName: name,
          phone: `98765432${10 + idx}`,
          email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
          rollNumber: `PM-HYD-0${idx + 1 < 10 ? '0' + (idx + 1) : idx + 1}`,
          marksObtained: 70 + (idx * 4),
          totalMarks: 100,
          result: (70 + idx * 4) >= 80 ? 'DISTINCTION' : 'PASS',
          rowNumber: idx + 2,
          createdAt: new Date(),
        });
      });

      this.auditLogs.push({
        id: 'audit-001',
        batchId: 'batch-demo-001',
        userId: 'usr-anika',
        userRole: 'TRAINING_CENTRE',
        action: 'BATCH_SUBMITTED',
        fromStatus: 'DRAFT',
        toStatus: 'PENDING_DISTRICT_APPROVAL_1',
        details: 'Batch submitted for District Officer 1 review.',
        createdAt: new Date(Date.now() - 3600000),
      });
    }

    this.autoRecoverCertificatesFromDisk();
    this.persistState();
  }
}

// Initialize sample data
InMemoryDb.initSampleBatch();

function populateCertRelations(cert: any) {
  if (!cert) return null;
  const candidate = InMemoryDb.candidates.find(
    (cand) => cand.id === cert.candidateId || (cert.candidateName && cand.fullName.toUpperCase() === cert.candidateName.toUpperCase())
  );
  const batch = InMemoryDb.batches.find((b) => b.id === cert.batchId);
  const tc = InMemoryDb.trainingCentres.find((t) => t.id === batch?.trainingCentreId);
  const dist = InMemoryDb.districts.find((d) => d.id === tc?.districtId);

  return {
    ...cert,
    qrCodeDataUrl:
      cert.qrCodeDataUrl ||
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    candidate: candidate
      ? {
          ...candidate,
          fullName: candidate.fullName,
          rollNumber: candidate.rollNumber,
          result: candidate.result,
          marksObtained: candidate.marksObtained,
          totalMarks: candidate.totalMarks,
        }
      : {
          id: cert.candidateId,
          fullName: cert.candidateName,
          rollNumber: 'PM-HYD-001',
          result: 'PASS',
          marksObtained: 70,
          totalMarks: 100,
        },
    batch: batch
      ? {
          ...batch,
          trainingCentre: tc
            ? {
                ...tc,
                district: dist ? { ...dist } : null,
              }
            : null,
        }
      : {
          id: 'batch-demo-001',
          courseName: cert.courseName || 'Web & Full Stack Development',
          trainingCentre: {
            id: 'tc-apex-01',
            name: 'Apex Skilling Academy',
            district: { id: 'dist-hyd-01', name: 'Hyderabad Central' },
          },
        },
  };
}

export const createPrismaMock = () => {
  return {
    $transaction: async (cb: any) => {
      return await cb(createPrismaMock());
    },
    user: {
      findUnique: async ({ where }: any) => {
        const u = InMemoryDb.users.find(
          (user) =>
            (where.id && user.id === where.id) ||
            (where.email && user.email.toLowerCase() === where.email.toLowerCase())
        );
        if (!u) return null;
        const tc = InMemoryDb.trainingCentres.find((t) => t.id === u.trainingCentreId) || null;
        const dist = InMemoryDb.districts.find((d) => d.id === (u.districtId || tc?.districtId)) || null;
        return { ...u, trainingCentre: tc, district: dist };
      },
      upsert: async ({ where, update, create }: any) => {
        let u = InMemoryDb.users.find((user) => user.email.toLowerCase() === where.email.toLowerCase());
        if (u) {
          Object.assign(u, update);
        } else {
          u = { id: `usr-${Date.now()}`, ...create, createdAt: new Date() };
          InMemoryDb.users.push(u);
        }
        return u;
      },
      findMany: async () => {
        return InMemoryDb.users.map((u) => {
          const tc = InMemoryDb.trainingCentres.find((t) => t.id === u.trainingCentreId) || null;
          const dist = InMemoryDb.districts.find((d) => d.id === (u.districtId || tc?.districtId)) || null;
          return { ...u, trainingCentre: tc, district: dist };
        });
      },
    },
    trainingCentre: {
      findUnique: async ({ where }: any) => {
        return InMemoryDb.trainingCentres.find((tc) => tc.id === where.id || tc.code === where.code) || null;
      },
    },
    district: {
      findUnique: async ({ where }: any) => {
        return InMemoryDb.districts.find((d) => d.id === where.id || d.name === where.name) || null;
      },
    },
    batch: {
      findUnique: async ({ where, include }: any) => {
        const b = InMemoryDb.batches.find((batch) => batch.id === where.id || batch.batchNumber === where.batchNumber);
        if (!b) return null;

        const tc = InMemoryDb.trainingCentres.find((t) => t.id === b.trainingCentreId);
        const dist = InMemoryDb.districts.find((d) => d.id === tc?.districtId);
        const candidates = InMemoryDb.candidates
          .filter((c) => c.batchId === b.id)
          .map((c) => {
            const cert = InMemoryDb.certificates.find((crt) => crt.candidateId === c.id) || null;
            const notifs = InMemoryDb.notifications.filter((n) => n.candidateId === c.id);
            return { ...c, certificate: cert, notifications: notifs };
          });
        const approvals = InMemoryDb.approvals
          .filter((a) => a.batchId === b.id)
          .map((a) => {
            const officer = InMemoryDb.users.find((u) => u.id === a.officerId) || { id: a.officerId, name: 'Officer', role: 'DISTRICT_OFFICER' };
            return { ...a, officer };
          });
        const qualityReviews = InMemoryDb.qualityReviews
          .filter((q) => q.batchId === b.id)
          .map((q) => {
            const reviewer = InMemoryDb.users.find((u) => u.id === q.reviewerId) || { id: q.reviewerId, name: 'Reviewer' };
            return { ...q, reviewer };
          });
        const auditLogs = InMemoryDb.auditLogs
          .filter((log) => log.batchId === b.id)
          .map((log) => {
            const user = InMemoryDb.users.find((u) => u.id === log.userId) || { id: log.userId, name: 'System', role: 'SYSTEM' };
            return { ...log, user };
          });

        return {
          ...b,
          trainingCentre: tc ? { ...tc, district: dist } : null,
          candidates,
          approvals,
          qualityReviews,
          auditLogs,
        };
      },
      findMany: async ({ where }: any) => {
        let list = [...InMemoryDb.batches];
        if (where?.trainingCentreId) {
          list = list.filter((b) => b.trainingCentreId === where.trainingCentreId);
        }
        if (where?.trainingCentre?.districtId) {
          list = list.filter((b) => {
            const tc = InMemoryDb.trainingCentres.find((t) => t.id === b.trainingCentreId);
            return tc?.districtId === where.trainingCentre.districtId;
          });
        }
        if (where?.status) {
          if (typeof where.status === 'string') {
            list = list.filter((b) => b.status === where.status || (where.status === 'PENDING_DISTRICT_APPROVAL_1' && b.status === 'PENDING_DISTRICT_APPROVAL') || (where.status === 'PENDING_DISTRICT_APPROVAL' && b.status === 'PENDING_DISTRICT_APPROVAL_1'));
          } else if (Array.isArray(where.status.in)) {
            list = list.filter((b) => where.status.in.includes(b.status));
          }
        }
        if (where?.OR && Array.isArray(where.OR)) {
          list = list.filter((b) => {
            return where.OR.some((cond: any) => {
              if (cond.status && (b.status === cond.status || (cond.status === 'PENDING_DISTRICT_APPROVAL_1' && b.status === 'PENDING_DISTRICT_APPROVAL'))) return true;
              if (cond.isQualityReviewRequired !== undefined && b.isQualityReviewRequired === cond.isQualityReviewRequired) return true;
              return false;
            });
          });
        }
        return list.map((b) => {
          const tc = InMemoryDb.trainingCentres.find((t) => t.id === b.trainingCentreId);
          const dist = InMemoryDb.districts.find((d) => d.id === tc?.districtId);
          const approvals = InMemoryDb.approvals
            .filter((a) => a.batchId === b.id)
            .map((a) => {
              const officer = InMemoryDb.users.find((u) => u.id === a.officerId) || { id: a.officerId, name: 'Officer' };
              return { ...a, officer };
            });
          return {
            ...b,
            trainingCentre: tc ? { ...tc, district: dist } : null,
            approvals,
            _count: {
              candidates: InMemoryDb.candidates.filter((c) => c.batchId === b.id).length,
              certificates: InMemoryDb.certificates.filter((crt) => crt.batchId === b.id).length,
            },
          };
        });
      },
      create: async ({ data }: any) => {
        const newBatch = {
          id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActionAt: new Date(),
        };
        InMemoryDb.batches.unshift(newBatch);
        InMemoryDb.persistState();
        return newBatch;
      },
      update: async ({ where, data }: any) => {
        const b = InMemoryDb.batches.find((batch) => batch.id === where.id);
        if (!b) throw new Error('Batch not found');
        Object.assign(b, data, { updatedAt: new Date() });
        InMemoryDb.persistState();
        return b;
      },
    },
    candidate: {
      findUnique: async ({ where }: any) => {
        const c = InMemoryDb.candidates.find((cand) => cand.id === where.id);
        if (!c) return null;
        const b = InMemoryDb.batches.find((batch) => batch.id === c.batchId);
        const tc = InMemoryDb.trainingCentres.find((t) => t.id === b?.trainingCentreId);
        const dist = InMemoryDb.districts.find((d) => d.id === tc?.districtId);
        return {
          ...c,
          batch: b ? { ...b, trainingCentre: tc ? { ...tc, district: dist } : null } : null,
        };
      },
      findMany: async ({ where }: any) => {
        return InMemoryDb.candidates.filter((c) => c.batchId === where.batchId);
      },
      createMany: async ({ data }: any) => {
        data.forEach((c: any) => {
          InMemoryDb.candidates.push({
            id: `cand-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            ...c,
            createdAt: new Date(),
          });
        });
        InMemoryDb.persistState();
        return { count: data.length };
      },
      deleteMany: async ({ where }: any) => {
        const initialLen = InMemoryDb.candidates.length;
        InMemoryDb.candidates = InMemoryDb.candidates.filter((c) => c.batchId !== where.batchId);
        InMemoryDb.persistState();
        return { count: initialLen - InMemoryDb.candidates.length };
      },
    },
    approval: {
      create: async ({ data }: any) => {
        const app = {
          id: `app-${Date.now()}`,
          ...data,
          createdAt: new Date(),
        };
        InMemoryDb.approvals.push(app);
        InMemoryDb.persistState();
        return app;
      },
    },
    qualityReview: {
      create: async ({ data }: any) => {
        const rev = {
          id: `qr-${Date.now()}`,
          ...data,
          reviewedAt: new Date(),
        };
        InMemoryDb.qualityReviews.push(rev);
        InMemoryDb.persistState();
        return rev;
      },
    },
    certificate: {
      findUnique: async ({ where }: any) => {
        let cert = InMemoryDb.certificates.find((c) => {
          if (where?.id && c.id === where.id) return true;
          if (where?.candidateId && c.candidateId === where.candidateId) return true;
          if (where?.certificateNumber) {
            const target = typeof where.certificateNumber === 'string'
              ? where.certificateNumber
              : where.certificateNumber.equals;
            if (target && c.certificateNumber && c.certificateNumber.toUpperCase() === String(target).trim().toUpperCase()) {
              return true;
            }
          }
          return false;
        });

        // On-disk recovery without hardcoded names
        if (!cert && where?.certificateNumber) {
          const target = typeof where.certificateNumber === 'string'
            ? where.certificateNumber
            : where.certificateNumber.equals;
          if (target) {
            const clean = String(target).trim().toUpperCase();
            const pdfFile = path.join(CERT_DIR, `${clean}.pdf`);
            if (fs.existsSync(pdfFile)) {
              const studentName = getCandidateFromPdf(pdfFile);
              const candidate = studentName
                ? InMemoryDb.candidates.find((c) => c.fullName.toUpperCase() === studentName.toUpperCase())
                : null;

              cert = {
                id: `cert-${clean.toLowerCase()}`,
                certificateNumber: clean,
                candidateId: candidate ? candidate.id : `cand-${clean.toLowerCase()}`,
                batchId: candidate ? candidate.batchId : 'batch-demo-001',
                candidateName: candidate ? candidate.fullName : (studentName || 'Certified Student'),
                courseName: 'Web & Full Stack Development',
                status: 'GENUINE',
                qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                pdfPath: pdfFile,
                issueDate: new Date('2026-11-21T05:18:49.000Z'),
                createdAt: new Date('2026-11-21T05:18:49.000Z'),
              };
              InMemoryDb.certificates.push(cert);
              InMemoryDb.persistState();
            }
          }
        }

        return populateCertRelations(cert);
      },
      findFirst: async ({ where }: any) => {
        let cert = InMemoryDb.certificates.find((c) => {
          if (where?.OR && Array.isArray(where.OR)) {
            return where.OR.some((cond: any) => {
              if (cond.certificateNumber) {
                const target = typeof cond.certificateNumber === 'string'
                  ? cond.certificateNumber
                  : cond.certificateNumber.equals;
                if (target && c.certificateNumber && c.certificateNumber.toUpperCase() === String(target).trim().toUpperCase()) {
                  return true;
                }
              }
              if (cond.candidateId) {
                const target = typeof cond.candidateId === 'string'
                  ? cond.candidateId
                  : cond.candidateId.equals;
                if (target && c.candidateId && c.candidateId === String(target).trim()) {
                  return true;
                }
              }
              return false;
            });
          }
          if (where?.certificateNumber) {
            const target = typeof where.certificateNumber === 'string'
              ? where.certificateNumber
              : where.certificateNumber.equals;
            if (target && c.certificateNumber && c.certificateNumber.toUpperCase() === String(target).trim().toUpperCase()) {
              return true;
            }
          }
          if (where?.candidateId) {
            const target = typeof where.candidateId === 'string'
              ? where.candidateId
              : where.candidateId.equals;
            if (target && c.candidateId && c.candidateId === String(target).trim()) {
              return true;
            }
          }
          return false;
        });

        // Disk recovery if matching PDF exists on disk
        if (!cert && where?.OR && Array.isArray(where.OR)) {
          for (const cond of where.OR) {
            if (cond.certificateNumber) {
              const target = typeof cond.certificateNumber === 'string'
                ? cond.certificateNumber
                : cond.certificateNumber.equals;
              if (target) {
                const clean = String(target).trim().toUpperCase();
                const pdfFile = path.join(CERT_DIR, `${clean}.pdf`);
                if (fs.existsSync(pdfFile)) {
                  const studentName = getCandidateFromPdf(pdfFile);
                  const candidate = studentName
                    ? InMemoryDb.candidates.find((c) => c.fullName.toUpperCase() === studentName.toUpperCase())
                    : null;

                  cert = {
                    id: `cert-${clean.toLowerCase()}`,
                    certificateNumber: clean,
                    candidateId: candidate ? candidate.id : `cand-${clean.toLowerCase()}`,
                    batchId: candidate ? candidate.batchId : 'batch-demo-001',
                    candidateName: candidate ? candidate.fullName : (studentName || 'Certified Student'),
                    courseName: 'Web & Full Stack Development',
                    status: 'GENUINE',
                    qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    pdfPath: pdfFile,
                    issueDate: new Date('2026-11-21T05:18:49.000Z'),
                    createdAt: new Date('2026-11-21T05:18:49.000Z'),
                  };
                  InMemoryDb.certificates.push(cert);
                  InMemoryDb.persistState();
                  break;
                }
              }
            }
          }
        }

        return populateCertRelations(cert);
      },
      findMany: async ({ where }: any = {}) => {
        let list = [...InMemoryDb.certificates];
        if (where?.batchId) {
          list = list.filter((c) => c.batchId === where.batchId);
        }
        if (where?.status) {
          list = list.filter((c) => c.status === where.status);
        }
        return list.map((c) => populateCertRelations(c));
      },
      create: async ({ data }: any) => {
        let cert = InMemoryDb.certificates.find(
          (c) => c.candidateId === data.candidateId || c.certificateNumber === data.certificateNumber
        );
        if (cert) {
          Object.assign(cert, data);
        } else {
          cert = {
            id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            ...data,
            createdAt: new Date(),
          };
          InMemoryDb.certificates.push(cert);
        }
        InMemoryDb.persistState();
        return populateCertRelations(cert);
      },
      update: async ({ where, data }: any) => {
        const cert = InMemoryDb.certificates.find((c) => {
          if (where?.certificateNumber && c.certificateNumber.toUpperCase() === String(where.certificateNumber).trim().toUpperCase()) {
            return true;
          }
          if (where?.id && c.id === where.id) return true;
          return false;
        });
        if (!cert) throw new Error('Certificate not found');
        Object.assign(cert, data);
        InMemoryDb.persistState();
        return populateCertRelations(cert);
      },
    },
    notification: {
      findUnique: async ({ where }: any) => {
        const n = InMemoryDb.notifications.find((notif) => notif.id === where.id);
        if (!n) return null;
        const candidate = InMemoryDb.candidates.find((c) => c.id === n.candidateId);
        const cert = InMemoryDb.certificates.find((c) => c.id === n.certificateId);
        return { ...n, candidate, certificate: cert };
      },
      findMany: async ({ where }: any = {}) => {
        let list = [...InMemoryDb.notifications];
        if (where?.candidateId) {
          list = list.filter((n) => n.candidateId === where.candidateId);
        }
        return list;
      },
      create: async ({ data }: any) => {
        const notif = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          attempts: 0,
          ...data,
          createdAt: new Date(),
        };
        InMemoryDb.notifications.push(notif);
        InMemoryDb.persistState();
        return notif;
      },
      update: async ({ where, data }: any) => {
        const n = InMemoryDb.notifications.find((notif) => notif.id === where.id);
        if (!n) throw new Error('Notification not found');
        Object.assign(n, data);
        InMemoryDb.persistState();
        return n;
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const log = {
          id: `audit-${Date.now()}`,
          ...data,
          createdAt: new Date(),
        };
        InMemoryDb.auditLogs.unshift(log);
        InMemoryDb.persistState();
        return log;
      },
      findMany: async ({ where }: any) => {
        return InMemoryDb.auditLogs
          .filter((l) => !where?.batchId || l.batchId === where.batchId)
          .map((l) => {
            const user = InMemoryDb.users.find((u) => u.id === l.userId) || { id: l.userId, name: 'System', role: 'SYSTEM' };
            return { ...l, user };
          });
      },
    },
    systemConfig: {
      findUnique: async ({ where }: any) => {
        return InMemoryDb.systemConfigs.find((c) => c.key === where.key) || null;
      },
      findMany: async () => {
        return [...InMemoryDb.systemConfigs];
      },
      upsert: async ({ where, update, create }: any) => {
        let c = InMemoryDb.systemConfigs.find((cfg) => cfg.key === where.key);
        if (c) {
          Object.assign(c, update, { updatedAt: new Date() });
        } else {
          c = { id: `cfg-${Date.now()}`, ...create, updatedAt: new Date() };
          InMemoryDb.systemConfigs.push(c);
        }
        return c;
      },
    },
  };
};
