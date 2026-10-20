# Test run v5 — Gmail (inbox → reply draft in the thread → label)

Date: 2026-10-15 · Model: Claude Haiku 5.5 (n8n) · Mailbox: a dedicated Gmail account, not my personal one

## 1. Regression: the 31 test emails still pass

The Gmail branch changed three shared nodes (`Prepare`, `Decide`, and `Is Test?` → `By Source` switch),
so the full test set was re-run after each change.

| Run | Workflow change | Result | Drafts rejected by the safety check |
|---|---|---|---|
| v4 run 1 | customs/tax category + multilingual | 31 / 31 | 0 |
| v4 run 2 | (same, second run) | 31 / 31 | 0 |
| v5 run 1 | Gmail trigger, `By Source` switch, draft + label nodes | 31 / 31 | 0 |
| v5 run 2 | skip newsletters / auto-replies, subject fallback | 31 / 31 | 0 |
| v5 run 3 | test data cleanup (labels, demo unit prices) | 31 / 31 | 0 |

A full run of 31 emails (62 LLM calls) takes 53–64 seconds.

## 2. Live test: 4 real emails sent to the inbox

Sent by hand from another Gmail account. The workflow was published, so the Gmail trigger polled every minute.

| Email | Classified as | Route | Draft (in the same thread) | Label |
|---|---|---|---|---|
| English: 20 OMG M + 15 Nano M | 詢價 / en | auto_quote | quote table, **US$1,249.50** (35 units, 15% tier) | AI-報價待寄 |
| German: 15 Nano mittel + 10 Bacteria klein | 詢價 / de | auto_quote | German text, **US$739.50** | AI-報價待寄 |
| Shipment held at Miami plant inspection station | 報關稅務 / en | human_review | "a colleague will reply" — no customs answer | AI-待人工 |
| 3 of 20 Jade Girl arrived rotten | 客訴退貨 / en | escalate | apology + "a colleague will reply" — no refund promised | AI-客訴優先 |

**4 / 4 correct.** All drafts passed the safety check (no AI-written amounts, discounts or refund promises).

Timing (from n8n execution logs):
- 1 email: execution took 8.5 s; 3 emails in one poll: 11.1 s
- From "sent" to "draft visible": about 40 s for the first email (most of it is waiting for the next 1-minute poll)

Expected totals were checked against the demo price list: OMG M and Nano M are $42.00, ×0.85 = $35.70;
20 × 35.70 + 15 × 35.70 = $1,249.50.

## 3. What the live test found (and fixed)

**The inbox was not empty.** The mailbox already receives newsletters in the Primary tab.
Each one would have cost 2 LLM calls and produced a reply draft to a newsletter.
Fix in `Prepare`: skip messages that have a `List-Unsubscribe` / `List-Id` header, `Precedence: bulk/list`,
or `Auto-Submitted` other than `no`. This also stops reply loops with a customer's out-of-office auto-reply.
The Gmail search filter excludes Promotions and Social as a first pass.
The skip is done by code reading mail headers, not by the LLM.

**All 4 test emails had no subject**, so the first drafts were titled `Re: `.
Fix: when the subject is empty, the draft is titled `Re: Your inquiry to FernzLand`.

## 4. First two days after publishing (Oct 15–16)

From the n8n execution log:

- 3 newsletters arrived (2 from a news site, 1 from Slack). `Prepare` skipped all 3: 0 LLM calls, 0 drafts.
- The 4 test emails were each processed once (executions 104 and 105). Later polls did not pick them up again.
- The 18:00 daily summary ran on Oct 16. There were no customer emails that day, and the summary said so.

## Known limits

- Drafts are never sent automatically. A person reviews and presses Send.
- The reason a mail went to human review is stored in `inquiry_log`, not shown inside Gmail.
- Label IDs (`Label_1`–`Label_3`) belong to one mailbox. Another mailbox needs its own labels.
- At most 10 emails per poll (n8n Gmail trigger setting); the rest wait for the next poll. Tested in [v6](v6.md#5-gmail-trigger-can-it-miss-mail).
- An email that someone opens before the next poll is never handled, because the trigger only fetches unread mail. Found in [v6](v6.md#5-gmail-trigger-can-it-miss-mail).
- Attachments (e.g. photos of damaged plants) are not read.
- 4 live emails is a smoke test, not an accuracy measurement.
- The workflow does not check whether a message was already handled. It relies on the Gmail trigger only returning new mail. If the same message runs again (for example, re-running an old execution in n8n), it gets a second draft. Plan: see [v6](v6.md#known-limits).
