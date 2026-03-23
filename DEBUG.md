This is going to be long. Read every word.

---

# 🔐 1. AUTH & ROLES (RBAC) — DEEP DIVE

## Session & Token Management
- [ ] JWT secret is in `.env`, not hardcoded in code
- [ ] JWT expiry is set (e.g., 7 days) — what happens when it expires mid-session? Does user get a clean redirect to login or a broken page?
- [ ] Refresh token logic — does it silently refresh or force logout?
- [ ] If user is logged in on two devices and you change their role, does the old session still have old permissions? (stale token bug)
- [ ] Concurrent sessions — can same user be logged in on mobile + desktop simultaneously?
- [ ] "Remember me" functionality — if implemented, does it actually persist longer?
- [ ] Session invalidation on password change — if admin resets an agent's password, their existing session should die

## Role Hierarchy Testing
- [ ] Create one account for each role: Super Admin, Admin, Manager, Agent, Customer, Staff
- [ ] Login as each, manually hit every API route from Postman/browser devtools
- [ ] Agent hitting `/api/admin/*` routes → must return 401/403, not data
- [ ] Customer hitting `/api/agent/*` routes → must return 401/403
- [ ] Manager hitting another manager's data → must be blocked
- [ ] Super Admin is the only one who can: create projects, delete records, view P&L, manage staff roles
- [ ] What happens if you delete a role that's assigned to active users?

## Data Isolation (Database Level)
- [ ] Agent queries: are they filtered by `agentId = currentUser.id` at DB level, or just hidden in UI? (UI hiding is NOT security)
- [ ] Customer queries: filtered by `customerId = currentUser.id` at DB level?
- [ ] Test: Agent A's lead ID is `lead_123`. Login as Agent B, manually call `GET /api/leads/lead_123` — should return 403
- [ ] Test: Customer A's booking ID is `booking_456`. Login as Customer B, call `GET /api/bookings/booking_456` — should return 403

## Password & Account Security
- [ ] Passwords are hashed with bcrypt (salt rounds ≥ 10), never stored plain
- [ ] Password reset: token expires after 1 hour
- [ ] Password reset: token is single-use (using it again should fail)
- [ ] Password reset email actually sends (check spam too)
- [ ] Wrong password 5 times → account temporarily locked or rate limited?
- [ ] New agent created by admin → they get a "set your password" email, not a plain text password in message

## Audit Logs (Module 18)
- [ ] Every login attempt (success + failure) is logged with IP, timestamp, user
- [ ] Every role change is logged
- [ ] Every data deletion is logged with who deleted what and when
- [ ] Audit logs cannot be deleted by anyone including Super Admin
- [ ] Audit log page is searchable and filterable

---

# 📋 2. LEAD MANAGEMENT — DEEP DIVE

## Lead Creation
- [ ] All required fields validated before save (name, phone minimum)
- [ ] Phone number format validation — what if someone enters `abc` or `123`?
- [ ] Phone number stored consistently — with or without +91? Pick one, enforce it everywhere
- [ ] Source field (Facebook/Instagram/Website/Referral/Walk-in) — is it a dropdown from DB or free text? Free text = data mess
- [ ] Created timestamp is server-side, not client-side (clients can spoof time)
- [ ] Lead ID is auto-generated, non-guessable (UUID, not sequential 1,2,3)
- [ ] After creation, lead appears in correct stage (Stage 1 - New)
- [ ] Auto-assignment logic: what is the algorithm? Round-robin? Least loaded agent? Test it with 10 leads back to back

## 10-Stage Pipeline
- [ ] Define what the 10 stages actually are (document them, make sure code matches)
- [ ] Can a lead skip stages? (e.g., jump from Stage 1 to Stage 8) — is that allowed?
- [ ] Can a lead go backwards in stages? (regression — sometimes valid)
- [ ] Each stage change: is it logged with timestamp + who changed it?
- [ ] Pipeline view (kanban board?) — drag and drop between stages works?
- [ ] If lead is in Stage 7 (Booked), can it accidentally be moved back to Stage 2?
- [ ] Stage-based automation triggers — does moving to "Site Visit Scheduled" fire the WhatsApp confirmation?

## Lead Scoring
- [ ] What is the scoring algorithm? Points per action?
- [ ] Score updates when: call made, WhatsApp replied, site visit done, follow-up completed
- [ ] Score is visible to agent and admin
- [ ] Score doesn't go negative
- [ ] Score recalculates correctly if an action is deleted/undone

## Duplicate Detection
- [ ] Same phone number submitted twice → system detects and either merges or alerts
- [ ] Same phone from different sources (Facebook lead + website form) → duplicate flagged
- [ ] What does agent see when duplicate is detected? Clear UI message?
- [ ] Can admin manually merge two leads?
- [ ] What happens to call logs, tasks, notes if leads are merged?

## Lead Assignment
- [ ] Auto-assignment assigns to agent who is `active` not to suspended agents
- [ ] Manual reassignment by admin → agent gets notification
- [ ] Reassigned lead: old agent can no longer see it (data isolation)
- [ ] Lead without assignment — who sees it? Only admin/manager?
- [ ] Assignment history tracked (Lead was assigned to Agent A on Day 1, reassigned to Agent B on Day 5)

## Search & Filter
- [ ] Search by name: partial match works? (`Rah` finds `Rahul`)
- [ ] Search by phone: works with and without country code
- [ ] Filter by stage, source, agent, date range — all combinations work together
- [ ] Filter by "uncontacted for 7+ days" — high priority for manager
- [ ] Pagination: 50 leads per page, page 2, 3 work correctly
- [ ] Sorting: by created date, last activity, score — all work
- [ ] After filtering, if you click a lead and come back, does filter reset? (annoying UX bug)

## Lead Notes
- [ ] Agent can add notes to a lead
- [ ] Notes show with timestamp and author
- [ ] Notes are not editable after 24 hours (optional but good practice)
- [ ] Notes survive lead reassignment

---

# 📞 3. CALL LOGS & AI INTELLIGENCE — DEEP DIVE

## Manual Call Logging
- [ ] Agent can log a call: date, duration, outcome, notes
- [ ] Outcome options: Answered, Not Answered, Busy, Wrong Number, Call Back Later, Interested, Not Interested
- [ ] Call log instantly appears on lead timeline
- [ ] Lead's "Last Contacted" timestamp updates after call log
- [ ] Lead stage auto-advances based on call outcome? (Interested → move to Stage 3?)

## SalesTrial Integration (Webhook Flow)
- [ ] Webhook URL is configured in SalesTrial dashboard pointing to your endpoint
- [ ] Webhook endpoint is authenticated (secret token in header) — not publicly triggerable
- [ ] When call ends on agent's phone → SalesTrial sends webhook → your server receives it
- [ ] Server matches phone number from webhook to lead in DB — what if no match found? Log the error, don't crash
- [ ] Recording URL from SalesTrial saves to call log record
- [ ] Recording URL is accessible (not behind SalesTrial auth wall)
- [ ] Transcription job triggered after recording saved
- [ ] Transcription result saves to call log
- [ ] AI summary generates from transcription and saves
- [ ] Full flow latency: call ends → summary appears in CRM — how long? Should be under 3 minutes

## AI Transcription & Summary
- [ ] OpenAI Whisper handles Telugu audio correctly (test with actual Telugu recordings)
- [ ] Transcription handles background noise gracefully (doesn't hallucinate words)
- [ ] Summary structure: Interest Level (Hot/Warm/Cold), Objections Raised, Promises Made, Next Step
- [ ] Summary is stored as structured data (JSON), not just a text blob — so manager can filter by interest level
- [ ] Long calls (20+ min) — transcription doesn't timeout
- [ ] Very short calls (< 10 seconds, call not answered) — handled gracefully, not sent to AI
- [ ] Cost tracking: each Whisper call costs money — log the cost per transcription

## Voice Button
- [ ] Works on mobile browser (Chrome Android, Safari iOS)
- [ ] Records audio in supported format (WebM, MP4, MP3) — Whisper accepts all
- [ ] Recording stops cleanly when agent finishes speaking
- [ ] "Processing..." state shown while AI converts to text
- [ ] Result is editable before saving (agent can fix AI mistakes)
- [ ] Saved voice note appears on lead timeline with timestamp

## Call Intelligence Search
- [ ] Manager searches "price objection" → finds all leads where that phrase appeared in call summary
- [ ] Search by agent name → all their call summaries
- [ ] Search by date range works
- [ ] Search by interest level (Hot/Warm/Cold) works
- [ ] Search results link back to the lead
- [ ] Search is fast (indexed on DB level — check PostgreSQL full-text search or similar)

---

# 📅 4. TASK MANAGEMENT — DEEP DIVE

- [ ] Task has: title, description, due date, due time, priority (High/Medium/Low), assigned agent, related lead
- [ ] Task creation from lead page auto-links to that lead
- [ ] Overdue calculation is timezone-aware (IST, not UTC)
- [ ] Overdue tasks: do they show on dashboard AND send a notification to agent?
- [ ] Task completion: does it prompt agent to log what happened? (Good UX)
- [ ] Completing a task related to a lead: does it update lead's last activity timestamp?
- [ ] Recurring tasks (e.g., weekly follow-up) — is this supported?
- [ ] Task deleted by admin — does it notify the assigned agent?
- [ ] Dashboard "Due Today" tile: tasks due today (IST) — test at 11:59 PM vs 12:01 AM
- [ ] If agent is reassigned off a lead, what happens to their pending tasks for that lead?
- [ ] Bulk task creation (e.g., create follow-up tasks for all leads in Stage 3) — if implemented, test it

---

# 🗺️ 5. 2D INTERACTIVE PLOT MAP — DEEP DIVE

## Rendering
- [ ] Site plan image uploads (what formats? PNG, JPG, SVG, PDF?)
- [ ] Image loads correctly at full resolution without being blurry
- [ ] All 680 polygon coordinates saved correctly in DB (not hardcoded in frontend)
- [ ] Polygons render on top of image correctly — alignment is accurate
- [ ] If polygon data is missing for some plots, rest of map still loads (graceful degradation)
- [ ] Map renders correctly on: Chrome, Firefox, Safari, Edge
- [ ] Map renders on mobile (touch events for zoom/pan, not just mouse events)
- [ ] Pinch-to-zoom works on mobile
- [ ] Pan doesn't go beyond map boundaries (canvas bounds check)
- [ ] Initial zoom level shows full site plan without scrolling

## Plot Status & Color Updates
- [ ] Colors are driven by DB status field, not hardcoded
- [ ] Status values in DB exactly match color logic: `available` → green, `booked` → red, `reserved` → yellow, `on_hold` → blue
- [ ] What if status has a typo in DB? Plot shows wrong color or no color?
- [ ] When booking confirmed → plot status updates in DB → map reflects new color WITHOUT page refresh (real-time update via websocket or polling?)
- [ ] Test real-time: Admin books Plot 101 → agent on another tab sees it turn red within seconds
- [ ] Legend is shown on map (what each color means)

## Plot Popup / Details
- [ ] Clicking plot opens popup with: plot number, size (sq yards/ft), facing direction, price, current status, owner name if booked
- [ ] Price shown is current price (check against project pricing table — prices can change)
- [ ] Book/Reserve/Block buttons only show if plot is Available
- [ ] If plot is Booked, show owner name and booking date (only to admin, not to all agents)
- [ ] Clicking "Book" from map → goes to booking wizard with plot pre-filled
- [ ] Multiple clicks on same plot don't open multiple popups

## Race Condition (Critical Bug)
- [ ] Scenario: Agent A and Agent B both see Plot 202 as Green (Available)
- [ ] Both click "Book" at the same time
- [ ] Both go through booking wizard simultaneously
- [ ] Both submit at the same time
- [ ] Result: Only ONE booking should succeed, other should get "Plot already booked" error
- [ ] How to fix: Database-level lock or optimistic locking with version field
- [ ] Test this: open two browser windows, go through booking wizard in both, submit simultaneously
- [ ] The failed booking: user gets clear error message, not a broken page

## Plot Management (Admin)
- [ ] Admin can change plot status manually (e.g., put On Hold for external reasons)
- [ ] Admin can update plot price (phase 2 price revision)
- [ ] Plot price history tracked (when did price change, from what to what)
- [ ] Admin can add/edit plot details after initial setup

---

# 📝 6. BOOKING WIZARD — DEEP DIVE (7 Steps)

## Step 1: Plot Selection
- [ ] Plot selector shows only Available plots
- [ ] If coming from map, plot is pre-selected and user can't accidentally change it
- [ ] Plot details (size, price, facing) shown in summary sidebar throughout wizard

## Step 2: Customer Details
- [ ] Existing customer search works (search by name or phone, auto-fill their details)
- [ ] New customer creation from within wizard saves correctly
- [ ] All required KYC fields validated
- [ ] Phone number deduplication (if customer with same phone exists, prompt to use existing)

## Step 3: Co-Applicant (if applicable)
- [ ] Optional — skippable
- [ ] If added, co-applicant details save correctly
- [ ] Co-applicant shown on booking document

## Step 4: Pricing & Payment Plan
- [ ] Base price pulled from project/plot settings (not editable by agent — only admin)
- [ ] Additional charges (registration, maintenance, etc.) calculated correctly
- [ ] Total amount shown clearly
- [ ] Payment plan selection (full payment vs installment) changes what Step 5 shows
- [ ] Discount application: only admin/manager can apply discount, agent cannot
- [ ] Discount amount logged with who approved it

## Step 5: Installment Schedule
- [ ] EMI schedule generates based on: total amount, down payment, number of installments, frequency
- [ ] Due dates calculated correctly (monthly from booking date)
- [ ] Due dates skip weekends/holidays? (Define this behavior)
- [ ] Schedule shown as table with: installment number, due date, amount, status
- [ ] Total of all installments = total booking amount (rounding errors?)

## Step 6: Document Upload
- [ ] KYC document upload works (Aadhaar, PAN)
- [ ] File size limit enforced (what's the limit? 5MB? 10MB?)
- [ ] File type validated (only PDF, JPG, PNG — not .exe)
- [ ] Files upload to Cloudflare R2 correctly
- [ ] Upload progress shown (not just a spinner)
- [ ] Failed upload: clear error message, can retry

## Step 7: Review & Confirm
- [ ] All details from steps 1-6 shown in summary
- [ ] "Edit" button on each section takes back to that step with data intact
- [ ] Confirm button is disabled until all required steps complete
- [ ] Confirm button shows loading state after click (prevent double-click = double booking)
- [ ] After confirmation:
  - [ ] Booking record created in DB with unique booking ID
  - [ ] Plot status changes to `booked` (red) immediately
  - [ ] Customer portal login credentials sent via WhatsApp
  - [ ] Congratulations WhatsApp to customer fires
  - [ ] Agent gets confirmation notification
  - [ ] Commission record created (pending)
  - [ ] Booking appears in admin dashboard

## Wizard State Management
- [ ] If you refresh page at Step 4, does wizard reset to Step 1? (data loss — bad UX)
- [ ] If you close browser at Step 5 and come back, is progress saved? (draft booking)
- [ ] Back button between steps: data from current step is preserved
- [ ] Browser back button (←) vs wizard back button — which wins? Test both

---

# 💰 7. PAYMENTS & INSTALLMENTS — DEEP DIVE

## Payment Recording
- [ ] Payment form fields: amount, date, payment mode (Cash/Cheque/NEFT/RTGS/UPI), reference number, notes
- [ ] Reference number is required for non-cash payments
- [ ] Payment date defaults to today (IST) but is editable for backdating
- [ ] Amount validation: positive number only, not more than outstanding balance
- [ ] Saving payment: which installment does it get applied to? (Oldest unpaid first? Manual selection?)
- [ ] Partial payment: if installment is Rs. 50,000 and customer pays Rs. 30,000 — installment shows as "Partially Paid"
- [ ] Overpayment: what if payment exceeds outstanding? System should warn

## Receipt Generation
- [ ] Receipt PDF generates with: booking ID, customer name, plot number, payment amount, date, mode, reference, running balance
- [ ] Receipt has a unique receipt number (sequential: RCP-001, RCP-002...)
- [ ] Receipt PDF is stored in Cloudflare R2, not regenerated each time (same URL always)
- [ ] WhatsApp receipt link: customer can open it without login?
- [ ] Receipt is not editable after generation (immutable financial record)
- [ ] Receipt generation fails gracefully if PDF library errors — don't lose the payment record

## Installment Schedule Management
- [ ] Overdue detection: runs at what time every day? (Cron job at midnight IST?)
- [ ] Cron job: is it actually running? Check with logs
- [ ] 3-days-before reminder: fires once, not every day for 3 days
- [ ] 1-day-after overdue: fires once per overdue installment, not every day
- [ ] If customer pays the overdue amount, does the overdue alert stop?
- [ ] Multiple overdue installments: separate reminder for each or combined?
- [ ] Installment rescheduling: if customer requests date change, admin can update it — does it recalculate future dates?

## Financial Calculations
- [ ] Outstanding balance = Total Booking Amount - Sum of all recorded payments (verify this formula in code)
- [ ] Payments in different modes all count toward same balance
- [ ] Refund recording: if customer cancels, is there a refund flow?
- [ ] Cancellation: what happens to booking, plot status, customer portal, commission?
- [ ] Test with actual numbers: Rs. 50 lakh booking, 3 payments of Rs. 10L, Rs. 15L, Rs. 5L → outstanding should be Rs. 20L

---

# 🧾 8. COMMISSION ENGINE — DEEP DIVE

## Commission Structure
- [ ] Commission rules are configurable by admin (not hardcoded)
- [ ] Commission can be: flat amount, percentage of booking, percentage of payment received
- [ ] Multi-level: if Agent A's referral is Agent B, and Agent B makes a booking, Agent A gets referral commission — test this
- [ ] Commission triggers on booking confirmation, not lead creation
- [ ] Commission re-calculates if booking amount changes (discount applied after booking?)

## Commission States
- [ ] Pending: booking confirmed, commission calculated, not yet approved
- [ ] Approved: manager approves the commission
- [ ] Released: finance marks it as paid
- [ ] Cancelled: booking cancelled, commission reversed

## Payout Tracking
- [ ] Agent's bank account details stored securely (masked in UI, encrypted in DB)
- [ ] When commission released: WhatsApp to agent fires with amount
- [ ] Commission history: agent sees every commission, its status, booking it came from
- [ ] Admin sees all pending commissions in one view — can bulk approve
- [ ] Commission report: exportable as Excel/PDF for accounting

## Edge Cases
- [ ] Agent leaves company mid-booking: who gets commission?
- [ ] Two agents claim same lead: who gets commission? (data ownership dispute)
- [ ] Commission on a booking that later gets cancelled: commission reversed automatically?
- [ ] Zero commission (e.g., walk-in customer): system handles 0 without errors

---

# 📊 9. FINANCIAL REPORTS (P&L) — DEEP DIVE

## Revenue Module
- [ ] Revenue = sum of all payments received (not booking value)
- [ ] Revenue is project-wise AND can be viewed globally
- [ ] Revenue by payment mode: Cash vs UPI vs Bank Transfer breakdown
- [ ] Revenue by agent: which agent's bookings generated most revenue
- [ ] Revenue by period: daily, weekly, monthly, custom date range
- [ ] Numbers match: Revenue on dashboard = Revenue on P&L report = Sum of payment records (test this exact match)

## Expense Module
- [ ] Expense categories configurable (Land cost, Construction, Marketing, Admin, etc.)
- [ ] Each expense has: category, amount, date, project, description, receipt upload
- [ ] Expense totals per project are accurate
- [ ] P&L = Revenue - Expenses (per project AND globally)
- [ ] Negative P&L (more expenses than revenue) shows correctly — not broken layout

## Cash Flow
- [ ] Cash flow = money in (payments) minus money out (expenses) over time
- [ ] Cash flow chart: shows positive and negative months
- [ ] Projected cash flow: based on upcoming installment schedule
- [ ] Export: P&L and cash flow export as PDF/Excel for CA/accountant

## Report Accuracy Testing
- [ ] Create a test project with known numbers
- [ ] Add 3 bookings: Rs. 20L, Rs. 30L, Rs. 50L
- [ ] Add payments: Rs. 5L against booking 1, Rs. 15L against booking 2
- [ ] Add expenses: Rs. 8L construction, Rs. 2L marketing
- [ ] Check P&L: Revenue = Rs. 20L, Expenses = Rs. 10L, Profit = Rs. 10L
- [ ] Check outstanding: Rs. 15L + Rs. 15L + Rs. 50L = Rs. 80L
- [ ] Verify every number on every report matches manual calculation

---

# 💬 10. WHATSAPP AUTOMATION — DEEP DIVE

## Evolution API Setup
- [ ] All 20 instances show "Connected" (green) in dashboard
- [ ] Each instance has a unique WhatsApp number
- [ ] QR code re-scan process when an instance disconnects — documented for staff
- [ ] Webhook from Evolution API → your server: configured for message receipts, status updates
- [ ] What happens when Evolution API server restarts? Instances reconnect automatically?

## Message Queue & Reliability
- [ ] Messages go through BullMQ queue (Redis-backed) — not sent directly
- [ ] If WhatsApp instance is disconnected when message is queued: retry after reconnection
- [ ] Message retry logic: how many retries? Backoff? (Don't retry infinitely)
- [ ] Failed messages logged with reason (instance disconnected, number doesn't exist, etc.)
- [ ] Rate limiting: WhatsApp limits messages per number per day — rotation across 20 instances
- [ ] Load balancing: distribute outgoing messages across all 20 instances evenly

## Each Trigger — Individual Testing

**Trigger 1: New Lead (1 minute delay)**
- [ ] Lead created at 2:00 PM → message fires between 2:00 PM and 2:01 PM
- [ ] Message contains: company overview + project highlights (not generic lorem ipsum)
- [ ] If lead's phone number is invalid → error logged, message not attempted
- [ ] If lead opts out of WhatsApp → message not sent (is there opt-out tracking?)

**Trigger 2: Site Visit Scheduled**
- [ ] When does this trigger? When visit date is saved? Or separately?
- [ ] Message contains: date/time of visit, Google Maps pin (correct coordinates?), directions
- [ ] Google Maps link opens Maps app on mobile (not broken URL)

**Trigger 3: Booking Confirmed**
- [ ] Fires immediately after booking wizard Step 7 confirmation
- [ ] Contains: booking ID, plot number, total amount, portal login link
- [ ] Portal login link works (takes customer to their dashboard)

**Trigger 4: Payment Received**
- [ ] Fires immediately after admin records payment
- [ ] Contains: amount paid, receipt PDF link, updated outstanding balance
- [ ] Receipt PDF link is accessible without login

**Trigger 5: 3 Days Before Installment**
- [ ] Cron runs daily at what time? (e.g., 9 AM IST)
- [ ] Finds all installments due in exactly 3 days
- [ ] Sends message to correct customer number
- [ ] Message contains: amount due, due date, payment link or bank details
- [ ] Does not send if installment already paid
- [ ] Does not send duplicate if installment already had a reminder sent (track sent status)

**Trigger 6: 1 Day After Overdue**
- [ ] Installment was due yesterday and not paid → alert today
- [ ] Message is firm but not threatening (content approved by ClickProps?)
- [ ] Only fires once per overdue installment (not every day until paid)
- [ ] Multiple overdue installments: one combined message or separate per installment?

**Trigger 7: Agent Assigned**
- [ ] Agent's WhatsApp gets: lead name, phone, source, what they enquired about
- [ ] Message goes to agent's personal WhatsApp (configured per agent profile)

**Trigger 8: Commission Released**
- [ ] Agent gets: commission amount, booking it came from, expected payout date
- [ ] Fires only when status changes to "Released" (not "Approved")

## Chatbot
- [ ] FAQ responses are configured and accurate (project details, pricing, location)
- [ ] Chatbot doesn't answer sensitive questions (specific plot prices? availability?)
- [ ] If question is outside FAQ scope: transfers to human (how? Alert agent on dashboard?)
- [ ] Chatbot responses are professional and in correct language
- [ ] Chatbot conversation is logged in CRM against the lead

## Broadcast Campaigns
- [ ] Recipient list: import from leads, filter by stage/source/agent
- [ ] Message template: uses approved WhatsApp templates (not freeform — Meta will block)
- [ ] Schedule: set broadcast for future date/time — fires correctly
- [ ] Broadcast progress: shows sent/delivered/failed counts in real-time
- [ ] Broadcast can be paused/cancelled after starting
- [ ] Broadcast respects opt-out list

---

# 🤖 11. AI VOICE AGENT — DEEP DIVE

## Call Initiation
- [ ] Trigger: manual (admin clicks "Start Campaign") or scheduled (9 AM daily)
- [ ] Call queue: 600-1,250 calls loaded into queue correctly
- [ ] SIP trunk (Vobiz) connected and authenticated
- [ ] Outbound call: caller ID shows ClickProps' number (not random)
- [ ] Call initiation rate: max concurrent calls configured (don't blast all 1,250 at once)
- [ ] If SIP trunk fails: all queued calls get error status, admin alerted

## Conversation Engine
- [ ] Language detection fires within first 2 seconds of customer speaking
- [ ] Language switches mid-call if customer changes language (Telugu → English)
- [ ] Response latency: AI responds within 1-2 seconds (not 5-10 second delays — kills conversation)
- [ ] Interruption handling: if customer starts speaking mid-AI-response, AI stops
- [ ] Silence handling: if customer doesn't respond for 5 seconds, AI prompts ("Sir, are you there?")
- [ ] One sentence per turn is enforced (not 5 paragraphs that customer hangs up during)
- [ ] Filler words work naturally in context, not randomly inserted

## Call Mode Logic

**Cold Call Mode:**
- [ ] Intro: identifies as ClickProps agent, gives project name
- [ ] Goal: book a site visit (not sell on first call)
- [ ] Script flow: intro → interest check → project pitch (30 sec) → site visit ask → date/time capture
- [ ] Date/time for site visit: captured correctly and saved to CRM as task/booking
- [ ] If customer says "call back later": captures preferred callback time, creates task in CRM

**Follow-Up Mode:**
- [ ] References previous interaction ("You had spoken to us about [project] last week")
- [ ] Previous interaction data pulled from CRM correctly
- [ ] Goal: rebook site visit or move to booking
- [ ] Handles "I found a better project" objection

**Payment Reminder Mode:**
- [ ] Customer name and exact installment amount pulled from CRM
- [ ] Tone is firm but polite (not aggressive)
- [ ] If customer confirms payment date: saves to CRM as "payment committed on [date]"
- [ ] If customer disputes amount: transfers to human immediately

## Objection Handling
- [ ] "Too far" objection → response about connectivity, infrastructure (configured from knowledge base)
- [ ] "Too expensive" objection → response about payment plans, appreciation potential
- [ ] "Let me think" → response + reaffirm site visit as no-commitment step
- [ ] "Already bought elsewhere" → politely end call, mark lead as Lost in CRM
- [ ] Unknown objection → AI says "Let me connect you with our team" → transfer to human

## Transfer to Human
- [ ] Warm transfer: AI tells customer "I'm connecting you with our team" before transferring
- [ ] Transfer actually works — human agent's phone rings
- [ ] If no agent available: takes callback number, creates task in CRM
- [ ] Transfer reason logged (what objection triggered transfer)

## Post-Call Processing
- [ ] Call recording saves automatically within 30 seconds of call end
- [ ] Recording stored in Cloudflare R2 (not locally on server — disk will fill)
- [ ] Transcription of AI call uses same pipeline as human calls (Whisper)
- [ ] Call outcome pushed to CRM: Answered/Not Answered/Busy/Wrong Number/Interested/Not Interested
- [ ] Lead stage updates based on outcome: if interested → Stage 3, if site visit booked → Stage 4
- [ ] Call cost tracked (Vobiz charges per minute — log it)

## Volume & Load Testing
- [ ] Can it actually handle 600 simultaneous calls? (LiveKit capacity configured?)
- [ ] Server CPU/RAM during 600 calls — monitored?
- [ ] If server hits capacity, new calls queue instead of failing
- [ ] 1,250 calls in a day — Vobiz SIP trunk has enough channels? (Check your plan)
- [ ] OpenAI API rate limits — GPT-4o-mini has token rate limits — hit at 600 concurrent calls?

## Training Pipeline Verification
- [ ] 100+ recordings actually uploaded and processed (not just 5 test ones)
- [ ] Fine-tuned model ID saved in environment variables (not hardcoded)
- [ ] Fine-tuned model responds better than base model (A/B test even informally)
- [ ] Knowledge base: project details, pricing, location, amenities — all accurate and up to date
- [ ] If project details change (new pricing), knowledge base updates automatically or is there a manual update flow?

---

# 👤 12. CUSTOMER PORTAL — DEEP DIVE

## Access & Security
- [ ] Customer account created automatically on booking confirmation
- [ ] Login credentials sent via WhatsApp (temporary password with forced reset)
- [ ] Customer cannot browse to any URL other than their own data
- [ ] `customerId` in every API call verified server-side against logged-in user
- [ ] Customer cannot access other customers' receipts by guessing receipt IDs

## Dashboard
- [ ] Shows: plot number, project name, booking date, total amount, amount paid, outstanding balance, next installment date + amount
- [ ] All numbers match admin records exactly (test this)
- [ ] Next installment: shows countdown ("Due in 12 days")
- [ ] If no outstanding installments: "All payments complete" state

## My Property (Plot Details)
- [ ] Shows plot on the 2D map with their plot highlighted (different color, e.g., gold/purple)
- [ ] Other plots' details NOT visible to customer (just the map with statuses)
- [ ] Plot details: number, area, facing, possession date, project amenities
- [ ] Documents downloadable: sale agreement, allotment letter (if uploaded by admin)
- [ ] Document upload by admin → customer sees it immediately

## Payment History
- [ ] Every payment listed: date, amount, mode, reference number
- [ ] Receipt download works for each payment
- [ ] Receipt PDF matches what admin sees
- [ ] Running balance shown after each payment

## Installment Schedule
- [ ] Full EMI calendar visible
- [ ] Green: paid, Yellow: upcoming within 7 days, Red: overdue, Grey: future
- [ ] Overdue installment highlighted prominently ("2 installments overdue!")
- [ ] Payment instructions shown (bank details, UPI ID, or payment gateway link)
- [ ] After paying, does status update automatically or only after admin records it?

## Support
- [ ] Raise ticket: category (Payment Issue, Document Request, Complaint, Other), description, optional attachment
- [ ] Ticket ID generated and shown
- [ ] Customer gets WhatsApp confirmation with ticket ID
- [ ] Admin sees new ticket in dashboard
- [ ] Admin can respond to ticket → customer sees response in portal
- [ ] Ticket status: Open → In Progress → Resolved
- [ ] Resolved tickets archived, not deleted

---

# ⚙️ 13. n8n AUTOMATIONS — DEEP DIVE

## Infrastructure
- [ ] n8n is self-hosted on Hetzner VPS (not n8n cloud)
- [ ] n8n accessible only internally (not public-facing URL)
- [ ] n8n credentials (username/password) are strong and changed from default
- [ ] n8n data backed up (workflows + execution history)
- [ ] n8n error notifications: if a workflow fails, admin gets alerted (email or Slack)

## Webhook Security
- [ ] Every webhook URL has a secret token in header
- [ ] n8n webhook endpoints not guessable (use random UUIDs, not `/webhook/new-lead`)
- [ ] Test: hit webhook without auth header → 401
- [ ] Test: hit webhook with wrong auth header → 401
- [ ] Test: hit webhook with correct auth header → 200

## Lead Nurturing Sequence
- [ ] Sequence: Day 0 (instant), Day 1, Day 3, Day 7, Day 14, Day 30
- [ ] Each message is unique and moves lead toward site visit (not same message repeated)
- [ ] Sequence stops when lead books site visit (don't send "Come visit us!" after they've visited)
- [ ] Sequence stops when lead marks as Not Interested
- [ ] Sequence stops when lead converts to booking
- [ ] Lead can be manually removed from sequence by admin
- [ ] Test: add a lead → verify sequence fires on correct days

## Workflow: Payment Reminder Sequence
- [ ] Reminder fires 3 days before
- [ ] Stops if payment recorded before due date
- [ ] Overdue alert fires 1 day after
- [ ] Stops after payment recorded (even if late)
- [ ] Never fires twice for same installment

## Workflow: Agent Performance
- [ ] Weekly report to manager: each agent's leads contacted, site visits booked, bookings made
- [ ] Fires every Monday at 9 AM IST (check cron expression is IST, not UTC)

## Workflow: Birthday/Anniversary Messages (if implemented)
- [ ] Customer DOB stored → birthday WhatsApp fires on their birthday
- [ ] Fires once per year (not multiple times if workflow runs multiple times that day)

## Error Handling in Workflows
- [ ] Every n8n workflow has error branch (not just happy path)
- [ ] Failed execution: logged with full details (which node failed, what data it had)
- [ ] Failed execution: admin notified within 5 minutes
- [ ] Retry logic: failed workflows retry 3 times with 5-minute delay before marking as failed

---

# 🗄️ 14. DATABASE & BACKEND — DEEP DIVE

## Schema Verification
- [ ] All 35+ tables exist in production DB (run schema check)
- [ ] Foreign key constraints exist and are enforced
- [ ] Important indexes: leads.phone, leads.agentId, payments.bookingId, installments.dueDate, callLogs.leadId
- [ ] UUID primary keys (not auto-increment integers — guessable)
- [ ] `createdAt` and `updatedAt` timestamps on every table
- [ ] Soft delete (`deletedAt`) on important tables (leads, bookings, customers) — hard delete is too dangerous

## Query Performance
- [ ] Dashboard page: check how many DB queries it makes (should be < 10, not 100+)
- [ ] Lead list (1000 leads): loads in < 2 seconds
- [ ] N+1 query problem: use Prisma's `include` for related data, not loop queries
- [ ] Slow query log enabled on PostgreSQL — review after 1 week of real use
- [ ] Pagination implemented at DB level (`LIMIT/OFFSET`) not fetching all records then slicing in code

## Cascade Logic
- [ ] Delete a project → what happens to plots, leads, bookings, payments?
- [ ] Delete a lead → call logs, tasks, notes — deleted or orphaned?
- [ ] Delete an agent → their leads reassigned to? Their pending commissions?
- [ ] Delete a booking → installments deleted? Plot status reverted? Commission cancelled?
- [ ] All cascades are explicitly defined (not relying on DB default behavior)
- [ ] Test each cascade in staging before production

## File Storage (Cloudflare R2)
- [ ] R2 bucket configured with correct region
- [ ] Upload works for: KYC docs, receipts, recordings, brochures, site plan image
- [ ] File size limits enforced before upload (not after — don't waste bandwidth)
- [ ] File type validation on backend (not just frontend — frontend validation is bypassed easily)
- [ ] Presigned URLs used for private files (not public bucket with guessable URLs)
- [ ] Presigned URL expiry: 1 hour for documents, 24 hours for recordings
- [ ] Old/deleted records: files cleaned up from R2 (or disk costs grow forever)

## Background Jobs (BullMQ + Redis)
- [ ] Redis is running and connected
- [ ] Test: Redis restarts → jobs in queue survive (Redis persistence configured with AOF or RDB)
- [ ] Job types: WhatsApp send, transcription trigger, PDF generation, email send
- [ ] Job priority: payment receipts = high priority, bulk broadcasts = low priority
- [ ] Job monitoring: Bull Board or similar dashboard to see queue health
- [ ] Dead letter queue: failed jobs after max retries go here (not just disappear)
- [ ] Worker processes: how many? Are they running as separate processes? What if they crash?

## API Design
- [ ] All API routes follow consistent pattern: `/api/v1/leads`, `/api/v1/bookings`, etc.
- [ ] HTTP methods correct: GET for read, POST for create, PUT/PATCH for update, DELETE for delete
- [ ] Response format consistent: `{ success: true, data: {...} }` or `{ success: false, error: "..." }`
- [ ] Error responses include useful message (not just "Internal Server Error")
- [ ] Input validation on every endpoint (use Zod or Joi — validate before touching DB)
- [ ] Pagination params: `page` and `limit` validated (limit max = 100, no limit=99999 allowed)

---

# 🖥️ 15. ADMIN DASHBOARD — DEEP DIVE

## KPI Cards
- [ ] "Total Leads Today" → count leads created today (IST, 12 AM to now)
- [ ] "Site Visits Scheduled" → count site visits in next 7 days
- [ ] "Bookings This Month" → count confirmed bookings in current month
- [ ] "Revenue This Month" → sum of payments recorded this month
- [ ] "Outstanding" → sum of all pending installments
- [ ] "Agents Active Today" → count agents who logged in or logged a call today
- [ ] All cards link to the relevant filtered list page
- [ ] Cards refresh: on page load OR auto-refresh every 5 minutes?
- [ ] Cards show loading skeleton while fetching (not just blank)

## Follow-Up Tiles
- [ ] "Leads Not Contacted in 7 Days" → list of leads with last activity > 7 days ago
- [ ] "Overdue Tasks" → all tasks past due date
- [ ] "Overdue Installments" → installments past due date
- [ ] "Hot Leads" → leads with score above threshold
- [ ] Each tile is clickable and shows the filtered list
- [ ] Tile counts are accurate (test manually by counting records in DB)

## Activity Feed
- [ ] Shows: new leads, bookings, payments, calls, tasks completed
- [ ] Shows actor name (who did the action)
- [ ] Real-time or refreshes every minute?
- [ ] Older activities paginated (don't load 10,000 entries on page load)
- [ ] Activity feed respects admin's scope (Super Admin sees all, Manager sees their team)

## Agent KPI Table
- [ ] Table shows all agents: leads assigned, calls made, site visits, bookings, revenue generated
- [ ] Data is for current month (with option to change period)
- [ ] Sortable by each column
- [ ] Agent name links to their detailed profile
- [ ] Accurate: test by manually counting one agent's activities and comparing

---

# 📱 16. MOBILE PWA — DEEP DIVE

## Installation
- [ ] On Android Chrome: "Add to Home Screen" prompt appears
- [ ] On iOS Safari: manual "Share → Add to Home Screen" works
- [ ] App icon shows correctly (ClickProps logo, correct size)
- [ ] App name shows correctly on home screen
- [ ] Opening from home screen: loads correctly, no "install" prompt again
- [ ] Splash screen appears on launch

## Critical Mobile Pages
- [ ] Login page: keyboard doesn't cover input fields
- [ ] Lead list: scrollable, each lead card shows essential info
- [ ] Lead detail: all tabs accessible (Overview, Calls, Tasks, Notes)
- [ ] Call log button: tappable, opens log form
- [ ] Voice button: works on mobile microphone
- [ ] 2D Plot Map: pinch-to-zoom, pan by dragging, plot popup tappable
- [ ] Booking wizard: all 7 steps work on mobile screen
- [ ] File upload: can pick file from phone gallery/camera

## Offline Behavior
- [ ] What happens when agent loses internet mid-use? White screen or helpful message?
- [ ] Service worker caches critical assets (app shell loads without internet)
- [ ] Forms: if submitted without internet, what happens? Data lost or queued?
- [ ] After reconnecting: app resumes correctly

## Performance on Mobile
- [ ] Page load time on 4G: under 3 seconds
- [ ] Page load time on 3G: under 6 seconds
- [ ] No layout shift (CLS) — content doesn't jump around as it loads
- [ ] Images optimized (Next.js Image component with WebP)
- [ ] Heavy pages (plot map, call recordings): lazy load

---

# 🔒 17. SECURITY — DEEP DIVE

## API Security
- [ ] Every API endpoint requires authentication — test by calling from Postman without token
- [ ] Authorization check is separate from authentication (logged in ≠ authorized for everything)
- [ ] Admin-only endpoints: `/api/admin/*` → 403 for non-admins
- [ ] CORS configured: only your domain allowed (not `*`)
- [ ] HTTPS enforced: HTTP requests redirect to HTTPS
- [ ] HSTS header set: `Strict-Transport-Security: max-age=31536000`
- [ ] Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`

## Input Validation & Injection
- [ ] All user inputs validated with Zod/Joi on backend
- [ ] Prisma ORM prevents SQL injection for parameterized queries — but check for any raw SQL
- [ ] File upload: MIME type validation (not just extension — rename exploit.exe to exploit.pdf)
- [ ] File upload: scan for malware? (Optional but good)
- [ ] XSS: any user-generated content rendered as HTML? (Should use React's text rendering)
- [ ] CSRF: Next.js API routes — CSRF tokens implemented?

## Secrets Management
- [ ] `.env` file not committed to Git (check `.gitignore`)
- [ ] `.env.example` committed with placeholder values, not real keys
- [ ] OpenAI API key: not in frontend bundle (check browser devtools → Sources → grep for `sk-`)
- [ ] Sarvam API key: same check
- [ ] Evolution API key: same check
- [ ] Database URL: not in frontend bundle
- [ ] Rotate all API keys if any were accidentally exposed

## Infrastructure Security
- [ ] Hetzner VPS: SSH key auth only (no password SSH)
- [ ] Hetzner VPS: root login disabled
- [ ] Firewall (UFW): only ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open
- [ ] Port 5432 (PostgreSQL): NOT exposed to internet — only accessible from localhost
- [ ] Port 6379 (Redis): NOT exposed to internet
- [ ] Docker containers: not running as root
- [ ] Daily automated backups: DB dump to separate location (not same VPS)
- [ ] Backup restoration tested (a backup that's never been restored is not a backup)

## Rate Limiting
- [ ] Login endpoint: 5 attempts per 15 minutes per IP → 429
- [ ] WhatsApp trigger endpoints: rate limited to prevent flooding
- [ ] AI voice call trigger: rate limited to prevent runaway spending
- [ ] File upload: rate limited per user per hour

---

# 🧪 18. GENERAL BUG HUNTING — DEEP DIVE

## Form Validation
- [ ] Every required field shows validation error if empty (not just highlights red — give a message)
- [ ] Validation fires on submit AND on blur (not just on submit)
- [ ] Error messages are in English/Telugu (match ClickProps' preference)
- [ ] After fixing error and resubmitting, errors clear correctly
- [ ] Phone number fields: validate 10-digit Indian mobile number format
- [ ] Email fields: valid email format check
- [ ] Amount fields: numeric only, positive, max 2 decimal places
- [ ] Date fields: cannot set past dates where future dates required (e.g., follow-up date)

## Empty States
- [ ] New project with zero leads: lead list shows "No leads yet. Add your first lead." (not blank/broken)
- [ ] Agent with no commissions: commission page shows empty state (not Rs. 0 confusion)
- [ ] No recordings yet: call log shows empty state
- [ ] No payments yet: payment history shows empty state
- [ ] New customer portal (booking just made): installment schedule shows correctly even if first payment not due yet

## Loading States
- [ ] Every data fetch shows loading skeleton or spinner
- [ ] Button shows loading state after click (spinner on button, disabled state)
- [ ] Large data loads (1000+ leads): progressive loading, not white screen for 5 seconds
- [ ] Plot map loads: show progress while 680 polygons render

## Error States
- [ ] API call fails: show user-friendly error message ("Something went wrong. Please try again.")
- [ ] API call fails: don't lose user's form data (they shouldn't have to retype everything)
- [ ] Network failure mid-upload: show retry option
- [ ] Stripe/payment gateway error (if any): clear message to user

## Browser Testing
- [ ] Chrome (latest): full test
- [ ] Firefox (latest): full test
- [ ] Safari (latest): full test (especially for PWA and audio features)
- [ ] Edge (latest): smoke test
- [ ] Android Chrome: full mobile test
- [ ] iOS Safari: full mobile test (audio recording, file uploads behave differently)

## Timezone
- [ ] Server timezone set to IST (UTC+5:30) or all timestamps stored as UTC and converted to IST in display
- [ ] Pick one approach and be consistent everywhere
- [ ] "Today" boundaries: 12:00 AM IST to 11:59 PM IST (not UTC midnight)
- [ ] Installment due date "3 days before" calculated in IST
- [ ] Cron jobs all fire at IST times (check cron expressions)
- [ ] Test: create a task due "today" at 11:59 PM IST — verify it shows as today, not tomorrow

## Concurrency & Race Conditions
- [ ] Double-click submit button: request fires only once (button disabled after first click)
- [ ] Plot booking race condition (covered above)
- [ ] Payment recording: admin and accountant submit same payment simultaneously → only one saves
- [ ] Commission approval: double-approve doesn't double the commission
- [ ] BullMQ job deduplication: same WhatsApp message doesn't fire twice if job enqueued twice

## Data Consistency
- [ ] After any write operation, the read immediately after returns updated data (no caching stale data)
- [ ] Lead count on dashboard matches actual lead count in lead list
- [ ] Revenue on dashboard matches P&L report
- [ ] Booking count on dashboard matches booking list count
- [ ] If any of these don't match: find where the count/sum is being calculated differently

---

# 🚀 19. DEPLOYMENT & DEVOPS — DEEP DIVE

## Docker & Infrastructure
- [ ] `docker-compose.yml` has: app, postgres, redis, n8n — all services defined
- [ ] Environment variables passed via `.env` file (not hardcoded in compose file)
- [ ] Volumes: PostgreSQL data persists after container restart
- [ ] Volumes: Redis data persists after container restart (AOF enabled)
- [ ] Volumes: uploaded files persist (R2 handles this — verify R2 not local volume)
- [ ] `docker compose up -d` restarts all services after VPS reboot (check restart policy: `always`)
- [ ] VPS auto-restart after crash: `restart: always` in compose or systemd unit

## SSL & Domain
- [ ] SSL certificate valid and auto-renewing (Let's Encrypt with Certbot/Caddy)
- [ ] Domain resolves correctly: `crm.clickprops.com` (or whatever domain)
- [ ] SSL redirect: `http://` → `https://` (301 redirect)
- [ ] SSL expiry alert: 30 days before expiry → admin email

## Monitoring
- [ ] Uptime monitoring: external service (UptimeRobot free tier) pinging your domain every 5 minutes
- [ ] If server goes down → SMS/email alert within 5 minutes
- [ ] Error logging: all server errors logged to file or service (not just console.log)
- [ ] Disk usage alert: if VPS disk > 80% full → alert (recordings will fill disk fast)
- [ ] Memory usage: if RAM > 90% → alert

## Backup Strategy
- [ ] PostgreSQL: daily `pg_dump` to separate location (not same VPS)
- [ ] Backup retention: 30 days
- [ ] Cloudflare R2: files are R2's responsibility, but verify bucket is not accidentally deleted
- [ ] n8n workflows: exported and backed up
- [ ] Backup restoration drill: restore a 1-week-old backup to a test server — does everything work?

## CI/CD
- [ ] How is new code deployed? Manual `git pull` + `docker compose up`? Or automated pipeline?
- [ ] Zero-downtime deployment: does deploying new code briefly take site down?
- [ ] Rollback plan: if new deployment breaks something, how do you revert in < 5 minutes?
- [ ] Database migrations: run automatically on deployment (Prisma migrate deploy) or manually?
- [ ] Migration failure handling: if migration fails mid-deployment, is app left in broken state?

---

# 📋 PRIORITY ORDER TO FIX

**Fix these first (data-loss or money risk):**
1. Plot booking race condition
2. Payment calculation accuracy
3. Commission engine multi-level calculation
4. Data isolation (Agent A seeing Agent B's leads via API)
5. WhatsApp trigger deduplication (don't send 2 reminders for 1 installment)

**Fix these second (trust/reliability):**
6. Audit logs completeness
7. BullMQ job failures and retries
8. Database backups working and tested
9. SalesTrial webhook full pipeline
10. All P&L numbers match across dashboard, reports, raw records

**Fix these third (UX/polish):**
11. Empty states on all pages
12. Loading states on all forms/buttons
13. Mobile PWA on both iOS and Android
14. Timezone consistency everywhere
15. Form validation messages

---

Start by opening your codebase and going module by module through this list. For each item, either write a test, manually verify it, or fix the bug. Don't skip anything marked as **race condition**, **data isolation**, or **financial calculation** — those three categories are where real damage happens.

Want me to write specific test scripts or code fixes for any of these?