# Audit Report: Branding, Course Management, AI & Payment Systems

**Date**: April 15, 2026  
**Status**: Analysis Complete

---

## 1. BRANDING & INFRASTRUCTURE REFERENCES

### Cloudflare References Location
Cloudflare branding and infrastructure mentions found **ONLY** in:
- **Documentation files** (not visible to users):
  - `kambi.md` (architecture notes)
  - `student.md` (implementation guide)
  - `README.md` (dev guide)
  - Migration files (0001-0016)
  - Seed file (production.sql)
  - Package config (wrangler.jsonc, package.json)
  - TypeScript config (references @cloudflare/workers-types)

### Frontend Status: ✅ CLEAN
- **No Cloudflare branding in user-facing code**
- No direct references in `/src` directory frontend
- No visible mentions in `/components` or `/pages`
- No mentions in public assets or deployed UI

### Backend Status: ✅ SAFE
- PagesFunction types only appear in `/functions/api` code (internal)
- All Cloudflare-specific patterns isolated to backend layer
- Workers/Pages abstractions completely hidden from frontend

### Recommendation
✅ **No action needed** — Cloudflare infrastructure is transparent to users; can be migrated to any host without UI changes.

---

## 2. COURSE MANAGEMENT ARCHITECTURE

### Three Course Types Now Coexist:

#### **Type A: Teacher-Created Courses** (Require Approval)
- **Database**: `courses` table
- **Workflow**:
  1. Teacher creates and publishes to `root_courses` (or custom collection)
  2. Admin reviews via `AdminPanel.tsx` → "Course Approval" tab
  3. Admin approves/rejects via `admin/courses.ts` PATCH endpoint
  4. Only approved courses appear on public listings
- **Table**: `tutor_courses` (with `status: pending|approved|rejected`)

#### **Type B: Platform Courses** (Pre-loaded)
- **Database**: `courses` table in seed data
- **Workflow**: Direct platform setup (no approval needed)
- **Display**: Always visible to students

#### **Type C: AI-Generated Courses** (No Approval Required)
- **Database**: In-memory `courses` state in `StudentDashboard.tsx`
- **Workflow**:
  1. Student generates course via `AICourses` component
  2. Course object created with `tags: ['AI']` and `deliveryMode: 'AI generated'`
  3. Immediately added to `MOCK_COURSES` array (in-memory)
  4. Accessible via normal course routes (`/student/courses/:id`)
- **Status**: Automatically enrolled after payment/completion
- **Lifespan**: Session-based (persists until browser refresh)

### Course Display Logic

**Current Implementation** (`courses.tsx`):
```typescript
const enrolledCourses = courses.filter(c => user.enrolledCourses?.includes(c.id));
const availableCourses = courses.filter(c => !user.enrolledCourses?.includes(c.id));
```

- ✅ Enrolled courses show progress bar
- ✅ Available courses show "Enroll Now"
- ✅ AI-tagged courses appear with `tags` property
- ✅ No distinction needed in UI (same rendering pipeline)

### Recommendation
**Persistence Issue**: AI-generated courses are lost on refresh. To fix:
1. Add `localStorage` backup for AI courses OR
2. Create `/api/ai-courses` endpoint for persistent storage OR
3. Document that AI course generation is ephemeral (session-based demo)

---

## 3. ARTIFICIAL INTELLIGENCE SETUP

### Current AI Implementation: **NONE USED**

**Observation**: 
- No OpenAI, Claude, Gemini, or other LLM API calls in codebase
- `AICourses` component uses **mock simulation** only:
  ```typescript
  setTimeout(() => {
    const mockCourse: AICourse = {
      id: `ai-${Date.now()}`,
      title: `${topic} Mastery`,
      // Hardcoded template response
    };
    setGeneratedCourse(mockCourse);
  }, 2000); // 2-second delay for UX
  ```

### Why This Matters
- No real curriculum generation happening
- No LLM costs or API keys needed now
- Placeholder for future integration

### Recommended Future AI Integration Points

#### **Option 1: Cloudflare Workers AI** (Already deployed infrastructure)
```
POST /api/ai/generate-course
- Uses: Cloudflare Workers AI (on-device, lower latency)
- Cost: Pay-per-inference (~$0.03-$0.10 per course)
- Latency: ~2-5 seconds
- No external API calls needed
```

#### **Option 2: OpenAI API** (Higher quality)
```
POST /api/ai/generate-course
- Uses: GPT-4 or GPT-4 Turbo
- Cost: ~$0.50-$2.00 per course (context-dependent)
- Latency: ~5-15 seconds
- Requires: API key rotation, rate limiting
```

#### **Option 3: Anthropic Claude** (Good balance)
```
POST /api/ai/generate-course
- Uses: Claude 3 Sonnet/Opus
- Cost: ~$0.30-$1.50 per course
- Latency: ~3-8 seconds
- Requires: API key, rate limiting
```

### Recommendation
- **Short-term**: Keep mock for demo/testing
- **Production**: Use **Cloudflare Workers AI** (0 external API calls, lowest operational overhead)
- **High quality needed**: Hybrid approach (Workers AI for drafts, Claude for refinement)

---

## 4. PAYMENT PROCESSING ARCHITECTURE

### Current Payment Implementation: **SIMULATED**

**Modal Component** (`PaymentModal.tsx`):
```typescript
const isFreeCourse = course.price === 0;

// Payment form exists but does NOT:
// - Submit to actual payment processor
// - Handle card validation
// - Process transactions
// - Generate receipts
```

**Flow**:
1. Click "Enroll" → `onSelectCourse(course)` → Payment modal opens
2. User enters fake card data (not validated or transmitted)
3. Click "Pay" → `onConfirm()` → `handlePaymentSuccess()`
4. Course "purchased" locally (no backend payment processing)

### Issues to Resolve Before Production

#### **1. No Currency Conversion**
- Prices stored as `price: number` (e.g., `4500` for ₦4,500)
- `priceLabel: ₦4,500` displayed correctly
- **But**: No Naira ↔ USD/GBP conversion logic exists
- **Impact**: Teachers set prices in Naira, but payment gateway expects USD

#### **2. No Payment Gateway Integration**
- No Flutterwave, Stripe, Paystack, or other processor calls
- No transaction records stored
- No revenue tracking

#### **3. No Revenue Splitting**
- Teachers should earn 70% (see `platform_settings` table)
- Platform earns 30%
- **Currently**: Earnings only tracked in mock data (`constants.ts`)

### Recommended Payment Flow for Production

```
Student clicks "Pay ₦4,500"
    ↓
Payment Modal opens with amount in local currency
    ↓
System converts: ₦4,500 = ~$3.00 USD (based on live rate)
    ↓
Call Flutterwave API (supports Naira directly):
  POST /payments/initialize {
    amount: 4500,
    currency: "NGN",
    email: student_email,
    metadata: { courseId, studentId, teacherId }
  }
    ↓
Redirect to Flutterwave hosted page
    ↓
User pays with local method (card, mobile money, bank transfer)
    ↓
Flutterwave webhook callback:
  POST /api/webhooks/flutterwave {
    status: "success",
    amount: 4500,
    reference: "FLW_REF_123"
  }
    ↓
Backend:
  1. Verify webhook signature
  2. Create enrollment record
  3. Calculate teacher payout: 4500 * 0.70 = ₦3,150
  4. Record teacher earnings in `teacher_earnings` table
  5. Emit webhook to teacher (instant notification)
    ↓
Student redirect: /student/courses/:id (enrolled + course unlocked)
```

### High-Level Models Strategy

**For ensuring payment gateway quality pays for better AI models**:

1. **Revenue Alignment Model**
   - 10% of platform earnings → AI/ML operational budget
   - Remaining 20% → platform operations, server costs, support

2. **Tiered AI Model Selection**
   - Free/Basic courses: Cloudflare Workers AI (low cost, sufficient)
   - Paid courses (< ₦5,000): Anthropic Claude (medium cost, high quality)
   - Premium courses (> ₦10,000): GPT-4 Turbo + Claude hybrid (highest quality)

3. **Payment → Model Quality Feedback Loop**
   - Track course completion rates by AI model used
   - Invest in higher-cost models if completion rates improve 10%+
   - Cache successful course generations (reduce API calls)

---

## 5. ACTION ITEMS CHECKLIST

### ✅ Completed (In Current Session)
- [x] AI-generated courses tagged with `tags: ['AI']`
- [x] AI courses routed to general course pool (in-memory)
- [x] Payment modal uses `priceLabel` (Naira displayed correctly)
- [x] Student profile form includes country and certificate name fields
- [x] Teacher earnings split configured (70/30) in platform_settings

### ⚠️ Needs Implementation
- [ ] Add persistent storage for AI-generated courses (DB or localStorage)
- [ ] Integrate Flutterwave payment API (current: mock only)
- [ ] Add webhook handling for payment confirmations
- [ ] Implement teacher payout system with earnings tracking
- [ ] Add currency conversion utility (Naira ↔ major currencies)
- [ ] Set up Cloudflare Workers AI endpoint for real AI generation
- [ ] Create admin dashboard for monitoring payment/revenue metrics

### Future: Production Readiness
- [ ] PCI compliance for payment handling (or use hosted Flutterwave page)
- [ ] Rate limiting on AI course generation (prevent abuse/excess costs)
- [ ] User audit logs for payment disputes
- [ ] Certificate generation and verification system
- [ ] Revenue reporting per teacher and course

---

## 6. SUMMARY

| Concern | Status | Risk |
|---------|--------|------|
| Cloudflare branding in UI | ✅ None found | Low |
| Course management architecture | ✅ Supports all 3 types | Low |
| AI implementation | ⚠️ Mock only | Medium |
| Payment processing | ❌ Not integrated | **Critical** |
| Currency handling | ⚠️ Partial (display only) | Medium |
| Teacher revenue split | ✅ Configured | Low |

**Overall Readiness for Launch**: ~40% (requires payment integration before revenue generation is possible)

