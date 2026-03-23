---
name: Blindersoe Feature Gap Analysis
description: Feature-by-feature comparison of Blindersoe vs ClickProps current state
type: project
---

# Blindersoe vs ClickProps — Feature Gap Analysis

**Analysis Date:** 2026-03-23
**Based on:** https://www.blindersoe.com/real-time-real-estate-plots-management-software/

---

## 1. Interactive Digital Layouts

### Blindersoe Offers:
- Interactive Digital Plot & Apartment Layouts with real-time visibility
- 3D digital floor plans
- Customer-facing interactive layouts
- Live filtering by status, facing, property category

### ClickProps Current State:
- ✅ **API Models:** Plot, Flat, layout filtering fields exist
- ✅ **Schema:** facingDirection, bhk, category, sqft enums exist
- ❌ **Frontend:** **REACT-KONVA CANVAS NOT BUILT** (critical blocker)
- ❌ **3D:** No 3D implementation (extra, not critical)

**Gap Score:** 50% (API ready, UI missing)
**Priority:** CRITICAL — Canvas is core differentiator

---

## 2. Booking & Reservation System

### Blindersoe Offers:
- Automated online booking platform
- **Conditional plot blocking with AUTO-EXPIRY** (critical)
- Real-time site visit scheduling
- **Token system with payment deadlines** (critical)

### ClickProps Current State:
- ✅ **Booking API:** Full CRUD exists
- ✅ **Plot blocking:** API endpoint exists
- ❌ **Auto-expiry logic:** NOT in Prisma schema (critical gap)
- ✅ **Site visit scheduling:** Model exists
- ❌ **Token system:** Payment deadline countdown NOT in schema

**Gap Score:** 70% (booking works, auto-expiry missing)
**Priority:** HIGH — Auto-expiry is Blindersoe's unique feature

---

## 3. Inventory Management

### Blindersoe Offers:
- Real-time tracking (Available, Booked, On-Hold)
- Multi-tower/block management
- Construction status updates
- Bulk plot entry capabilities
- Floor-wise unit management

### ClickProps Current State:
- ✅ **Status tracking:** Available, Booked, On-Hold enums exist
- ✅ **Real-time API:** All routes wired
- ✅ **Construction status:** Exists in Project model
- ✅ **Bulk entry:** API endpoint exists
- ✅ **Floor-wise management:** Flat model exists with floor logic

**Gap Score:** 100% (fully built)
**Priority:** NONE — Complete

---

## 4. Financial Management

### Blindersoe Offers:
- Commission tracking & automated payment processing
- Customer installment plan management with milestone triggers
- **Payment reminders** (automated)
- **Digital receipt generation** (automated)
- Multi-level MLM commission breakdown

### ClickProps Current State:
- ✅ **Commission:** Full tracking & API exists
- ✅ **Installment plans:** Full model & API exists
- ✅ **Payment reminders:** Cron now queues WhatsApp + email reminders
- ✅ **Digital receipt generation:** Receipt endpoint + queued receipt artifact/email flow implemented
- ✅ **MLM breakdown:** Commission rules exist

**Gap Score:** 90% (core + automation exists, needs live verification)
**Priority:** MEDIUM — Verify in production runtime

---

## 5. Documentation & Compliance

### Blindersoe Offers:
- Title & Deed Management with digital storage
- Property registration document attachment
- Sale agreements & completion certificates
- Stamp duty & legal expense monitoring

### ClickProps Current State:
- ✅ **Title & Deed:** CustomerDocument model exists
- ✅ **Documents:** API endpoints exist for upload
- ✅ **Sale agreements:** Document type enum exists
- ✅ **Stamp duty:** Exists in Installment model

**Gap Score:** 95% (all models exist, may need UI polish)
**Priority:** LOW — Core features built

---

## 6. Administrative Panel

### Blindersoe Offers:
- Employee access control with customizable permissions
- Filtering, searching, report export
- Project & media management (brochures, images, videos)
- **News & blog publishing** (content management)

### ClickProps Current State:
- ✅ **Access control:** 6-role RBAC fully built
- ✅ **Permissions:** 30+ granular permissions exist
- ✅ **Filtering/searching:** Global search API exists
- ✅ **Report export:** Admin reports page with export
- ⚠️ **Media management:** Basic file upload exists, not optimized
- ❌ **News & blog publishing:** NOT BUILT (extra feature)

**Gap Score:** 85% (admin panel complete, blog missing)
**Priority:** LOW — Blog is extra, not core CRM

---

## 7. Channel Partner Ecosystem

### Blindersoe Offers:
- Dedicated partner login with project-specific access
- Multi-level referral structure with earnings tracking
- Booking request submission & approval workflows
- Real-time commission visibility

### ClickProps Current State:
- ✅ **Partner login:** `channel_partner` role exists
- ✅ **Project access:** OrgId + role-based scoping
- ✅ **Multi-level referral:** Commission structure exists
- ✅ **Booking requests:** Workflow exists in API
- ✅ **Commission visibility:** Dashboard exists

**Gap Score:** 100% (fully built)
**Priority:** NONE — Complete

---

## 8. Customer Experience

### Blindersoe Offers:
- Secure customer login & booking history view
- **Development progress updates** (photo/video attachments)
- Lead capture from interactive layouts
- Professional inquiry submission

### ClickProps Current State:
- ✅ **Customer login:** NextAuth customer role exists
- ✅ **Booking history:** Customer portal shows all bookings
- ⚠️ **Progress updates:** Model exists, not fully featured
- ❌ **Lead capture from layouts:** Depends on Konva canvas (blocked)
- ✅ **Inquiry submission:** API endpoint exists

**Gap Score:** 75% (core exists, progress updates basic)
**Priority:** MEDIUM — Depends on Konva canvas

---

## Summary of Missing Features

### 🔴 CRITICAL (Must Have for Blindersoe Replacement)
1. **Interactive Konva Canvas** — Core differentiator (0% built)
2. **Plot Auto-Expiry Logic** — Unique Blindersoe feature (0% in schema)
3. **Token Payment Deadline System** — Unique Blindersoe feature (0% in schema)

### 🟡 HIGH PRIORITY (Should Have)
4. **Development Progress Updates** — Basic implementation only
5. **Responsive hardening** — still needs full mobile/tablet validation
6. **Live deployment verification** — automation needs real runtime testing

### 🟢 LOW PRIORITY (Nice to Have)
7. **News & Blog Publishing** — Not built, extra feature
8. **Media Optimization** — Basic upload exists, needs optimization
9. **3D Floor Plans** — Not built, extra feature

---

## Work Estimate

| Feature | Status | Est. Time | Owner |
|---------|--------|-----------|-------|
| Konva Canvas | Not Started | 2-3 hours | Frontend (Qwen/Vision) |
| Auto-Expiry Schema | Not Started | 1 hour | Database (Opus) |
| Token System Schema | Not Started | 1 hour | Database (Opus) |
| Payment Reminders Worker | Implemented, needs live verification | 30 min | Backend (GPT) |
| Receipt Generation | Implemented, needs live verification | 30 min | Backend (GPT) |
| Progress Updates UI | Partial | 1 hour | Frontend (Sonnet) |
| **TOTAL** | | **~6-7 hours** | All teams |

---

## To Be 100% Blindersoe Feature-Complete

**Must Do (Blocking Live Launch):**
1. Build Konva canvas component
2. Add auto-expiry to Prisma schema + API
3. Add token payment deadline system to schema + API

**Should Do (Before Going Live):**
4. Verify payment reminder worker in live runtime
5. Verify receipt generation flow end-to-end
6. Polish development progress updates

**Nice to Have (Post-Launch):**
7. News & blog publishing module
8. Optimize media management
9. Add 3D floor plan support

---

**Conclusion:** ClickProps is **~85% feature-complete** vs Blindersoe. The remaining 15% is:
- **3 critical blockers** (Konva, auto-expiry, token system)
- **2 automation features** (reminders, receipts)
- **1 polish feature** (progress updates)

All are achievable within 8-9 hours of focused work.
