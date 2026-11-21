# CertiFlow – Setup & Installation Guide

This document describes how to set up, run, seed, and test the CertiFlow platform both via **Docker Compose** and **Local Development**.

---

## 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v24.x tested)
- **npm**: v9.0.0 or higher (v11.x tested)
- **Git**
- **Docker & Docker Compose** (Recommended for 1-command startup)

---

## 2. Option A: One-Command Startup (Docker Compose)

The easiest way to start the complete stack (PostgreSQL, Redis, Backend API, Frontend UI, and Queue Workers):

```bash
# 1. Clone or navigate to the repository
cd Haackathon

# 2. Build and launch all containers
docker compose up --build
```

### URLs after launch:
- **Frontend Web Dashboard**: `http://localhost:5173` (or `http://localhost:80`)
- **Backend REST API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`
- **Public Verification**: `http://localhost:5173/verify`

---

## 3. Option B: Local Developer Mode

### Step 1: Install Dependencies
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
cd ..
```

### Step 2: Environment Configuration
Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/certiflow?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="certiflow_super_secure_jwt_secret_key_2026"
LARGE_BATCH_THRESHOLD=25
APPROVAL_SLA_HOURS=24
CERTIFICATE_STORAGE_DIR="./uploads/certificates"
```

### Step 3: Database Migration & Seeding
```bash
cd backend
# Generate Prisma Client
npm run prisma:generate

# Push database schema
npm run prisma:push

# Seed the 6 Demo Users & Master Data
npm run prisma:seed
```

### Step 4: Run Automated Tests
Execute the automated test suite covering all 7 critical hackathon evaluation scenarios:
```bash
cd backend
npm test
```

Expected output:
```
PASS backend/tests/critical_scenarios.test.ts
  CertiFlow Hackathon Critical Evaluation Scenarios
    Scenario 1: Spreadsheet Row-Level Validation & Atomicity
      ✓ should reject invalid spreadsheet, report exact row numbers, and return 0 candidates
      ✓ should accept valid 15-candidate spreadsheet and parse all rows cleanly
    Scenario 3: 60-Candidate Batch & Duplicate Prevention
      ✓ should parse 60 candidates and verify format of generated certificate numbers
    Scenario 5: Dynamic QR Code & PDF Certificate Generation
      ✓ should generate a valid high-density QR code Data URL for verification
      ✓ should generate official PDF certificate file on disk
    Scenario 6: Approval SLA Overdue Calculation
      ✓ should correctly flag batches exceeding the SLA threshold as overdue
    Scenario 2 & 7: Dual-Officer Rules & Returned Batch Logic
      ✓ should enforce that Officer 1 and Officer 2 must be different users

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

### Step 5: Start Backend & Frontend
In Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

In Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` in your browser. Use the top **Demo Persona Bar** to switch between **Anika**, **Dev**, **Meera**, **Neha**, **Farah**, and **Public** with one click.
