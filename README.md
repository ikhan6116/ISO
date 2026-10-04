# ISO Partner CRM

Client intake + opportunity analysis for ISO partner programs. Enter a client, answer a few questions, optionally upload a credit report, and the CRM shows which partner programs the client qualifies for, what to ask next, and lets you submit the file to the partner.

## Features

- **Guided intake** — contact, goals, consumer debt, home, and business questions. Follow-up questions only show when relevant (e.g. the electric bill question only appears when the home has no solar). A live preview shows qualifying programs as you type.
- **Opportunity matching** — every active program is checked against the client:
  - **Qualified**: every required rule passes.
  - **Needs info**: nothing fails, but some answers are missing. The "Ask next" panel lists the questions that unlock the most programs, and you can answer them inline.
  - **Not eligible**: shows which rule failed (state licensing, minimum debt, and so on).
  - Results are ranked by the client's primary goal, interests, and the program's *preferred* rules.
- **ISO program manager** — add or edit programs with partner info, licensed states, and requirement rules. Each rule is either *required* (it disqualifies the client) or *preferred* (it only affects ranking). Programs can have **products** with their own rules, such as a mortgage lender's Bank Statement loan for business owners, DSCR for investment properties, and Reverse Mortgage for age 62+.
- **Credit report analysis** — upload a PDF, HTML, or TXT report, or paste the text. You get a breakdown of each creditor with account type, status, utilization, priority, and a recommendation, plus the matching programs. Payday lenders, collections, and charge-offs are detected automatically. Secured debts (auto, mortgage, student loans) are excluded from enrollable debt. Report findings feed into matching: enrollable debt, payday loans, homeownership from the mortgage, equity/CLTV, and score.
- **Partner submissions** — generate a referral summary, email it to the partner's submission address, log the submission, and track its status. The client's stage updates as you go.
- **Dashboard** — clients, qualified opportunities by program type, and recent submissions.

### Sample programs included

Debt Settlement (no payday), Payday-Friendly Debt Relief, 6-Month Refresh Loan, Credit Counseling/DMP, Business Debt Relief, Full-Service Mortgage (Conventional/FHA/VA, Cash-Out, Bank Statement, DSCR, Reverse), Digital HELOC, HEI/HEA/ESA, Solar, Solar Exit, HVAC, Timeshare Exit, Equipment Financing, MCA, Business LOC, and Payment Processing.

**Partner names, states, and thresholds are placeholders.** Edit them under *ISO Programs* to match your agreements.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # matching / credit-analysis unit tests
npm run build && npm start
```

### Optional: AI credit report extraction

Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`. Reports are then read by Claude (`/api/extract-credit-report`), which handles tri-merge and monitoring-service layouts much better than the built-in parser. Without a key, the built-in parser runs in the browser. Either way, you can review and correct every account in the creditor table.

## Data & privacy

- Clients and programs are stored in the browser (localStorage). Use **Settings → Export backup** to back up your data or move it to another machine.
- Credit report files are **not stored**. Only the extracted account list is kept, without account numbers or SSNs. With AI extraction on, the report is sent to the Anthropic API for processing and is not saved by this app.
- To give a team shared, multi-user access, the next step is to swap `src/lib/store.tsx` for a database-backed API. The rest of the app only uses the `useData()` hook.

## Code map

| Path | Purpose |
| --- | --- |
| `src/lib/types.ts` | Data model (Client, Program, Rule, Tradeline) |
| `src/lib/fields.ts` | Facts that rules can reference; merges intake answers with credit-report findings |
| `src/lib/matching.ts` | Rule evaluation, program/product matching, ranking, "ask next" questions |
| `src/lib/creditAnalysis.ts` | Creditor classification, per-account recommendations, report summary |
| `src/lib/reportParser.ts` | Offline text parser for credit reports |
| `src/lib/seed.ts` | Sample partner programs |
| `src/pages/api/extract-credit-report.ts` | Optional AI extraction endpoint |
