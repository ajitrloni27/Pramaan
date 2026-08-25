# Pramaan

---
## The Problem

Every day, people receive documents—like hospital bills, rental agreements, payslips, or medicine receipts—that dictate their finances or rights. The problem is that these documents are often complex, long, and hard to understand. People usually just accept them because comparing every line item to the official rules is too tedious and technical to do in the moment. 

As a result, people lose money, waive their rights, or get underpaid simply because they don't have the time or expertise to verify the documents against the official rules.

## Explanation

Pramaan is **one machine** that does one specific job: it takes a paper you've been handed, compares it to the official rule, shows you the gap as undeniable proof, and drafts a letter of dispute—then **waits for you to tap** before it takes action. 

It does **not** give opinions. An AI guessing that you were overcharged is dangerous. Pramaan produces **proof**. It shows you your number, the official number, the gap, and exactly where both numbers came from so you can verify it yourself.

Think of it as a weighing scale: you can weigh apples or gold. The scale doesn't change, only what you put on it. Pramaan is the scale, and hospital bills, leases, or payslips are what you weigh.

## Working Steps

1. **Read**: The system reads the document via photo or PDF (extracting text, numbers, and their positions).
2. **Look Up**: It automatically looks up the official rule for that exact domain (e.g., medical pricing lists, tenancy acts).
3. **Compare**: It subtracts your number from the official number to identify any discrepancy (the gap).
4. **Prove**: It presents the gap as a visual card (e.g., "you: ₹45,000 → official: ₹18,000 → gap: ₹27,000"), linking directly back to the original source.
5. **Wait for Action**: It prepares a formal response/dispute letter and waits. It never acts on your behalf without you pressing the "send" button, maintaining a full audit log of your actions.

## How to Run

This project is a monorepo containing a backend AI comparison engine (`brain`) and a mobile frontend (`mobile`).

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies
Open a terminal at the root of the project and run:
```bash
npm install
```

### 2. Start the Backend Engine
The backend service powers the comparison pipeline. Open a terminal and run:
```bash
cd services/brain
npm run dev
```
*(The backend will start on port 3000)*

### 3. Start the Mobile App
Open a **new, separate terminal** and start the frontend:
```bash
cd apps/mobile
npm run dev
```
*(Vite will provide a local URL, usually `http://localhost:5173`, which you can open in your browser)*
