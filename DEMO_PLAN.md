# CertiFlow – 2-Minute Hackathon Demo Script & Video Plan

This guide gives you an exact, step-by-step walkthrough to present **CertiFlow** to hackathon judges within 120 seconds. It directly demonstrates all 7 critical evaluation scenarios.

---

### [00:00 – 00:20] Hook & Problem Statement
* **Visual**: Show the CertiFlow home dashboard with the Pragati Skills Mission header and the **1-Click Demo Persona Bar** at the top.
* **Script**:
  > *"Respected judges, in Pragati Skills Mission, 8,000 students graduate every month across 300+ training centres. But today, institutes email spreadsheets over WhatsApp, clerks manually type certificates in MS Word, approvals lack dual control, and fake certificates are rampant.
  > Today, I present **CertiFlow** – a tamper-proof digital certification platform with dual-control governance and instant public verification."*

---

### [00:20 – 00:45] Scenario 1: Smart Spreadsheet Validation (Zero Partial Saves)
* **Visual**: Click **Anika (Training Centre)** in the top bar. Click **Create New Batch**. Select `sample_data/invalid_batch_with_errors.csv` and click Upload.
* **Demonstration**:
  - The modal displays the **Row-Level Errors Table**:
    - Row 2: Missing student name
    - Row 3: Invalid phone number
    - Row 4: Marks exceed total marks
    - Row 5: Duplicate roll number
  - Point out: *"CertiFlow performs strict in-memory validation. Notice that not a single bad record entered our database – zero partial saves."*
* **Visual**: Select `sample_data/valid_batch_15_candidates.csv`. Click Upload. It succeeds immediately! Click **Submit Batch**.

---

### [00:45 – 01:10] Scenario 2 & 7: Two-Officer Dual Control & Return/Rejection Logic
* **Visual**: Click **Dev (District Officer 1)** in the top bar.
  - Show the pending batch. Dev reviews the candidates and clicks **Approve**.
  - Show the status moving to `PENDING_DISTRICT_APPROVAL_2`.
* **Visual**: Show what happens if Dev tries to approve again:
  - System blocks it: *"Two-Officer Rule: An independent second officer is required."*
* **Visual**: Click **Meera (District Officer 2)** in the top bar.
  - Meera reviews and clicks **Approve**.
  - Because cohort size &le; 25, it advances directly to State Approval!
  *(For a batch &gt;25 candidates, show how Neha in Quality Team reviews the large cohort).*

---

### [01:10 – 01:30] Scenario 3 & 4: State Final Approval & Asynchronous Generation
* **Visual**: Click **Farah (State Director)** in the top bar.
  - Show the batch in the Statewide Queue with SLA tracking.
  - Farah clicks **Final Approve**.
  - Background BullMQ workers render 15 official PDF certificates with dynamic QR codes.
  - Open the **Batch Detail Modal**: show the candidate table with **Certificate Numbers** and simulated **WhatsApp Delivery** status with automatic retry counters!
  - Click **Download PDF**: show the official Pragati Skills Mission certificate with golden borders, emblem, and embedded QR code.

---

### [01:30 – 01:50] Scenario 5: Instant Public Verification & Revocation
* **Visual**: Click **Public (QR Verification)** in the top bar.
  - Enter the certificate number (e.g. `CRT-2026-X1Y2Z3`).
  - Screen flashes green: **OFFICIALLY GENUINE & VALID**. Show that student phone/email are safely masked.
* **Visual**: Switch back to **Farah (State Director)**.
  - Open the batch modal and click **Revoke** on that certificate with reason: *"Clerical error in assessment marks"*.
* **Visual**: Switch back to **Public Verification** and search the same certificate number.
  - Screen immediately flashes red: **CERTIFICATE REVOKED & CANCELLED** showing the exact revocation timestamp and reason!

---

### [01:50 – 02:00] Conclusion & Technical Robustness
* **Visual**: Show the terminal running the automated test suite:
  ```bash
  npm test
  ```
  All 7 critical scenario test suites green (PASS).
* **Script**:
  > *"CertiFlow is containerized with Docker, backed by PostgreSQL, Prisma ORM, Redis and BullMQ, and fully proven by automated tests. Thank you!"*
