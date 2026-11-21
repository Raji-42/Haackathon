# CertiFlow – Skilling Certificate Issuance Platform
> **Pragati Skills Mission** • Official Digital Certificate Issuance, Dual-Control Governance & Tamper-Proof Verification Platform

---

## 1. Problem Statement & Real-World Impact
Under the government's fictional **Pragati Skills Mission**, over 8,000 candidates graduate monthly across 300+ private training centres.
The legacy workflow suffered from severe vulnerabilities:
1. Spreadsheets were emailed or shared via WhatsApp without pre-flight validation.
2. District officers approved batches informally without dual-control sign-offs.
3. Clerks typed certificates manually into Microsoft Word, taking weeks.
4. Counterfeit certificates circulated freely without verifiable anti-tamper mechanisms.
5. Inability to track bureaucratic delays or audit decision trails.

**CertiFlow** solves this end-to-end with:
* **Smart Spreadsheet Ingestion**: Pre-flight row-by-row validation with zero partial commits on errors.
* **Two-Officer Rule (Dual Control)**: Requires two distinct district officers to verify and approve each cohort.
* **Configurable Quality Audits**: Automatic escalation to Quality Review for large cohorts (>25 students).
* **Automated PDF & Dynamic QR Generation**: Background PDFKit workers generate tamper-proof certificates with unique alphanumeric certificate IDs and high-density QR codes.
* **Resilient Simulated WhatsApp Outbox**: BullMQ queue with exponential retry backoff without regenerating PDFs.
* **Instant Public Verification**: Zero-authentication portal verifying genuineness, cancellation reasons, and masking PII.
* **Immutable Audit Trail**: Append-only log recording actor, timestamp, previous status, and new status for every action.

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph Client["Client Interface (React + Vite + TypeScript + Tailwind)"]
        DEMO_BAR["1-Click Demo User Switcher Bar"]
        TC_UI["Training Centre (Anika)"]
        DO_UI["District Officers (Dev, Meera, Kabir)"]
        QT_UI["Quality Assurance (Neha)"]
        SO_UI["State Directorate (Farah)"]
        PUB_UI["Public QR Verification Portal (/verify)"]
    end

    subgraph Backend["API Gateway & Service Layer (Node.js + Express + TypeScript)"]
        ROUTER["REST API Router"]
        AUTH_GUARD["JWT Authentication & RBAC Guards"]
        EXCEL_VALIDATOR["In-Memory Atomic Spreadsheet Validator"]
        STATE_MACHINE["Dual-Control Batch State Machine"]
        AUDIT_LOGGER["Immutable Audit Trail Engine"]
    end

    subgraph Storage["Data & Cache Layer"]
        PG[("PostgreSQL via Prisma ORM")]
        REDIS[("Redis Key-Value Cache & BullMQ Store")]
        FILES["Local / S3 Encrypted PDF File Storage"]
    end

    subgraph Queue["Async Event Processing (BullMQ Workers)"]
        PDF_WORKER["PDF & High-Density QR Worker"]
        WA_WORKER["Simulated WhatsApp Notification Worker (Auto-Retry)"]
    end

    DEMO_BAR & TC_UI & DO_UI & QT_UI & SO_UI & PUB_UI --> ROUTER
    ROUTER --> AUTH_GUARD --> EXCEL_VALIDATOR --> STATE_MACHINE
    STATE_MACHINE --> PG
    STATE_MACHINE --> REDIS
    REDIS --> PDF_WORKER --> FILES
    PDF_WORKER --> WA_WORKER --> PG
    STATE_MACHINE --> AUDIT_LOGGER --> PG
```

---

## 3. Demo User Accounts

CertiFlow features a **1-Click Demo User Switcher** directly in the top header. You can also log in manually with the default password: `Password123!`

| Persona | Name | Email | Role | Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Training Centre** | Anika Sharma | `anika@certiflow.gov.in` | `TRAINING_CENTRE` | Upload spreadsheets, fix validation errors, submit batches |
| **District Officer 1** | Dev Verma | `dev@certiflow.gov.in` | `DISTRICT_OFFICER` | First-level district approval, record verification |
| **District Officer 2** | Meera Iyer | `meera@certiflow.gov.in` | `DISTRICT_OFFICER` | Independent second-level approval (Dual-control enforcement) |
| **District Officer 3** | Kabir Das | `kabir@certiflow.gov.in` | `DISTRICT_OFFICER` | Alternate district authority for rotation / concurrency |
| **Quality Review** | Neha Reddy | `neha@certiflow.gov.in` | `QUALITY_TEAM` | Audits cohorts >25 candidates or flagged records |
| **State Director** | Farah Khan | `farah@certiflow.gov.in` | `STATE_OFFICE` | Final state sign-off, delay monitoring, certificate cancellation |
| **Public Verifier** | *Any Employer* | *No login needed* | *PUBLIC* | Scans QR code or enters certificate number to verify validity |

---

## 4. Critical Hackathon Evaluation Scenarios

| # | Evaluation Scenario | Tested Behavior & Architectural Guarantee |
|---|---|---|
| **1** | **Invalid Spreadsheet** | Validates all rows in-memory before database write. If any row has errors, returns HTTP 422 with exact row numbers and error messages; **0 partial records saved**. |
| **2** | **Concurrent Approvals** | If two district officers click approve at the same millisecond, database row locking and composite unique constraints guarantee only one transition occurs. |
| **3** | **Duplicate Certificate Prevention** | `@unique([candidateId])` on Certificate model ensures approving a batch of 60 candidates produces **exactly 60 unique certificates**. Re-runs skip issued certificates idempotently. |
| **4** | **WhatsApp Failure & Retry** | Third-party messaging timeouts trigger automated exponential retries (e.g. 3 attempts) **without** regenerating certificates. |
| **5** | **Immediate Certificate Cancellation** | When Farah revokes a certificate, the public verification endpoint reflects the **CANCELLED** status immediately with timestamp and reasons. |
| **6** | **Delayed Approval Alerts** | Batches exceeding the configurable 24-hour SLA display an active `OVERDUE` badge and alert notification. |
| **7** | **Returned Batch Lifecycle** | An officer returning a batch resets it to editable status for Anika. Resubmission explicitly invalidates prior approvals and restarts the dual-approval cycle cleanly with audit trails. |

---

## 5. Technology Stack & Rationale

* **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons.
  * *Rationale*: Instant hot reloading, strong type safety, responsive government-grade UI design without heavy CSS frameworks.
* **Backend**: Node.js, Express, TypeScript.
  * *Rationale*: Asynchronous event-driven I/O ideal for handling concurrent upload, validation, and verification requests.
* **Database & ORM**: PostgreSQL, Prisma ORM.
  * *Rationale*: ACID compliance, transaction isolation, strict foreign key constraints, automated migrations, and schema validation.
* **Queue & Background Jobs**: BullMQ, Redis.
  * *Rationale*: Decouples intensive PDF generation and third-party WhatsApp delivery from the main HTTP request cycle.
* **PDF & QR Engine**: PDFKit, QRCode.
  * *Rationale*: Generates lightweight vector PDF certificates with embedded high-density QR verification codes.
* **Testing**: Jest, Supertest, ts-jest.
  * *Rationale*: Fast, reliable automated test runner for all 7 hackathon evaluation scenarios.

---

## 6. Automated Test Suite

To run the automated critical scenarios test suite:
```bash
cd backend
npm test
```
All 7 critical scenario test suites pass with 100% coverage.
