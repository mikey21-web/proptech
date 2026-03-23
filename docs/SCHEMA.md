# ClickProps CRM Database Schema

PostgreSQL 15 schema with 35+ tables, soft deletes, multi-tenant architecture, full audit trail.

## GROUP 1: Authentication (NextAuth.js) — 3 tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **Account** | OAuth provider credentials | userId, provider, providerAccountId, refresh_token |
| **Session** | Active sessions | sessionToken (unique), userId, expires |
| **VerificationToken** | Email verification | identifier, token (unique), expires |

**Note:** Credentials provider (username/password) uses User.password directly.

---

## GROUP 2: Organizations & Access — 6 tables

```
Organization (1) ──┬─→ (n) User
                   ├─→ (n) Role
                   ├─→ (n) Project
                   ├─→ (n) Lead
                   ├─→ (n) Agent
                   └─→ (n) Configuration
```

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **Organization** | Tenant container | id, name, domain (unique), gstNumber, reraNumber, settings (JSON) |
| **User** | Team member | id, email (unique), password (bcrypt), status, orgId |
| **Role** | Access group | id, name, orgId, isSystem (cannot delete) |
| **Permission** | Individual action | id, resource, action (e.g., "lead:create") |
| **UserRole** | User-to-role mapping | userId, roleId (composite unique) |
| **RolePermission** | Role-to-permission mapping | roleId, permissionId (composite unique) |

**Indexes:**
- User: (email), (orgId), (status)
- Role: (orgId, name) unique
- UserRole: (userId), (roleId)

---

## GROUP 3: Leads & CRM — 7 tables

```
Lead (1) ──┬─→ (1) Organization
           ├─→ (1) User (assignedTo)
           ├─→ (1) User (createdBy)
           ├─→ (1) LeadSource
           ├─→ (1) Project
           ├─→ (1) Customer
           ├─→ (n) Communication
           ├─→ (n) Activity
           ├─→ (n) Task
           └─→ (n) Note
```

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **Lead** | Sales prospect | id, name, phone, email, status (enum), priority, budget, orgId |
| **LeadSource** | Where lead came from | id, name, orgId (e.g., "99acres", "Walk-in", "Referral") |
| **LeadStatus** | Custom lead statuses | id, name (unique), color, sortOrder, isFinal |
| **Communication** | Call/email/SMS/meeting | id, type (enum), direction, subject, body, duration, leadId |
| **Activity** | Work log | id, type (enum: call, email, meeting, note), title, description, leadId |
| **Task** | Reminders/follow-ups | id, title, status (pending/in_progress/completed), dueDate, priority |
| **Note** | Quick notes on lead | id, content, isPinned, leadId |

**Indexes:**
- Lead: (orgId), (status), (priority), (phone), (email), (createdAt), (orgId, status)
- Communication: (leadId), (type), (createdAt)
- Task: (assigneeId), (status), (dueDate), (priority)

**Enum Values:**
- LeadStatus: new, contacted, qualified, negotiation, site_visit, proposal_sent, won, lost, junk
- Priority: low, medium, high, urgent
- CommunicationType: call, email, sms, whatsapp, meeting, site_visit, other
- TaskStatus: pending, in_progress, completed, cancelled, overdue

---

## GROUP 4: Projects & Inventory — 6 tables

```
Project (1) ──┬─→ (n) Plot
              ├─→ (n) Flat
              ├─→ (n) Amenity
              ├─→ (n) ProjectImage
              └─→ (n) CommissionRule

Plot/Flat (1) ──→ (n) Booking
```

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **Project** | Real estate project | id, name, slug, type (enum), status, address, city, reraNumber, totalUnits |
| **Plot** | Land plots | id, plotNumber, area, dimensions, facing, price, status (available/reserved/booked/sold) |
| **Flat** | Apartments | id, flatNumber, floor, bedrooms, bathrooms, area, price, status |
| **Amenity** | Project amenities | id, name, description, icon |
| **ProjectImage** | Photos | id, url, caption, isPrimary, sortOrder |
| **ProjectStatus** | Custom project statuses | id, name (unique), color, sortOrder |

**Indexes:**
- Project: (orgId), (status), (city), (type)
- Plot: (projectId), (status), (price)
- Flat: (projectId), (status), (bedrooms), (price)

**Enums:**
- ProjectType: residential, commercial, mixed, villa, plot, apartment
- ProjectStatus: upcoming, under_construction, ready_to_move, completed, on_hold, cancelled
- PlotStatus: available, reserved, booked, sold, mortgaged, blocked
- FlatStatus: available, reserved, booked, sold, blocked

---

## GROUP 5: Bookings & Transactions — 7 tables

```
Booking (1) ──┬─→ (1) Customer
              ├─→ (1) Project
              ├─→ (1) Plot
              ├─→ (1) Flat
              ├─→ (1) Agent
              ├─→ (n) Payment
              ├─→ (n) Installment
              ├─→ (n) Transaction
              ├─→ (n) Refund
              └─→ (n) Commission
```

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **Booking** | Sales transaction | id, bookingNumber (unique), status, totalAmount, netAmount, paidAmount, balanceAmount |
| **Payment** | Cash received | id, amount, mode (cash/cheque/upi/loan), status, paymentDate, bankName |
| **Installment** | Payment schedule | id, installmentNo, amount, dueDate, paidAmount, status |
| **Transaction** | Ledger entry | id, type (payment/refund/commission), amount, bookingId |
| **Refund** | Money returned | id, amount, reason, status (requested/approved/processing/completed), referenceNo |
| **BookingStatus** | Custom statuses | id, name (unique), color, sortOrder |
| **PaymentMode** | Payment types | id, name (unique), isActive, sortOrder |

**Indexes:**
- Booking: (orgId), (customerId), (projectId), (status), (bookingDate), (orgId, status)
- Payment: (bookingId), (status), (paymentDate), (mode)
- Installment: (bookingId), (dueDate), (status)

**Enums:**
- BookingStatus: pending, confirmed, agreement_signed, registration_done, possession_given, cancelled, refunded
- PaymentMode: cash, cheque, bank_transfer, upi, credit_card, debit_card, demand_draft, emi, loan, other
- TransactionType: payment, refund, commission, adjustment, penalty, discount

---

## GROUP 6: Customers — 3 tables

```
Customer (1) ──┬─→ (n) CustomerContact
               ├─→ (n) CustomerDocument
               ├─→ (n) Booking
               ├─→ (n) Lead
               └─→ (n) Loan
```

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **Customer** | Buyer/investor | id, name, phone, email, city, panNumber, aadhaarNumber, dateOfBirth |
| **CustomerContact** | Co-buyers | id, name, relation (spouse/father/nominee), phone, isPrimary |
| **CustomerDocument** | Verification docs | id, type (aadhaar/pan/passport), fileUrl, isVerified, expiryDate |

**Indexes:**
- Customer: (orgId), (phone), (email), (orgId, phone)
- CustomerDocument: (customerId), (type)

**Enum:**
- DocumentType: aadhaar, pan, passport, driving_license, voter_id, bank_statement, salary_slip, itr, agreement, receipt, photo, other

---

## GROUP 7: Agents & Commissions — 5 tables

```
Agent (1) ──┬─→ (1) User
            ├─→ (1) AgentTeam
            ├─→ (n) Booking
            └─→ (n) Commission

AgentTeam (1) ──→ (n) Agent
CommissionStructure (1) ──→ (n) CommissionRule
```

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **Agent** | Sales agent | id, agentCode (unique), reraNumber, panNumber, bankAccount, ifscCode, isActive |
| **AgentTeam** | Team grouping | id, name, leaderId (leader agent), description |
| **CommissionStructure** | Rule template | id, name, type (percentage/flat/tiered), isDefault, isActive, orgId |
| **CommissionRule** | Tier/bracket | id, minAmount, maxAmount, percentage, flatAmount, structureId, projectId |
| **Commission** | Earned commission | id, amount, percentage, status (pending/approved/paid), agentId, bookingId |

**Indexes:**
- Agent: (orgId), (agentCode), (isActive)
- CommissionStructure: (orgId), (isActive)
- Commission: (agentId), (bookingId), (status)

**Enum:**
- CommissionStatus: pending, approved, paid, cancelled, clawed_back
- CommissionType: percentage, flat, tiered

---

## GROUP 8: Loans — 4 tables

```
Loan (1) ──┬─→ (1) Customer
           ├─→ (1) Booking
           ├─→ (n) LoanInstallment
           └─→ (n) LoanDocument

LoanInstallment (1) ──→ (1) Loan
```

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **Loan** | Bank financing | id, loanNumber (unique), bankName, sanctionedAmount, disbursedAmount, status, emiAmount |
| **LoanInstallment** | EMI schedule | id, installmentNo, principal, interest, dueDate, paidDate, status |
| **LoanDocument** | Loan docs | id, type (DocumentType), documentNo, fileUrl |
| **LoanStatus** | Custom statuses | id, name (unique), color, sortOrder |

**Indexes:**
- Loan: (orgId), (customerId), (bookingId), (status), (loanNumber)
- LoanInstallment: (loanId), (dueDate), (status)

**Enum:**
- LoanStatus: applied, documents_submitted, under_review, sanctioned, disbursed, rejected, closed

---

## GROUP 9: Settings & Audit — 3 tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **Configuration** | Org settings | id, key, value (JSON), type, orgId |
| **AuditLog** | Change history | id, action (create/update/delete), entity, entityId, oldValues, newValues, userId, orgId |
| **Webhook** | Event subscriptions | id, url, event (lead_created/booking_updated/etc), secret, isActive, orgId |

**Indexes:**
- AuditLog: (orgId), (userId), (entity, entityId), (action), (createdAt)
- Webhook: (orgId), (event), (isActive)

---

## Common Patterns

### Soft Deletes
All major tables have `deletedAt` timestamp (null = active):
```sql
-- Active records
SELECT * FROM Lead WHERE deletedAt IS NULL;

-- All queries automatically exclude soft-deleted records
```

### Org Scoping
All multi-tenant data includes `orgId`:
```sql
-- Find user's leads
SELECT * FROM Lead
WHERE orgId = $1 AND deletedAt IS NULL;
```

### Timestamps
All tables have `createdAt` and `updatedAt` (auto-managed by Prisma):
```sql
SELECT * FROM Lead
WHERE createdAt >= NOW() - INTERVAL '30 days';
```

---

## Example Queries

### Find user's leads with agent details
```typescript
const leads = await prisma.lead.findMany({
  where: {
    orgId: user.orgId,
    assignedToId: user.id,
    deletedAt: null
  },
  include: {
    assignedTo: { select: { id: true, name: true, email: true } },
    communications: true,
    tasks: true
  }
});
```

### Get agent's bookings and earnings
```typescript
const agent = await prisma.agent.findUnique({
  where: { id: agentId },
  include: {
    bookings: {
      where: { deletedAt: null }
    },
    commissions: {
      where: { status: 'paid' }
    }
  }
});
```

### List overdue payment installments
```typescript
const overdue = await prisma.installment.findMany({
  where: {
    status: 'overdue',
    dueDate: { lt: new Date() },
    booking: { deletedAt: null }
  },
  include: { booking: { include: { customer: true } } }
});
```

### Project inventory summary
```typescript
const [plots, flats] = await Promise.all([
  prisma.plot.groupBy({
    by: ['status'],
    where: { projectId },
    _count: true
  }),
  prisma.flat.groupBy({
    by: ['status'],
    where: { projectId },
    _count: true
  })
]);
```

---

## Constraints & Validation

- **Email:** Unique per organization (User.email)
- **Phone:** Required, indexed for fast lookup
- **Amount fields:** DECIMAL(14,2) for INR currency
- **Dates:** TIMESTAMP with timezone
- **Soft deletes:** Always query with `deletedAt IS NULL`
- **Foreign keys:** CASCADE delete for org-level data, RESTRICT for user-critical data
