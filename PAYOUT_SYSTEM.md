# Flutterwave Payout Automation System

## Overview

The Kambi Academy Payout System provides automated, reliable tutor payment processing via Flutterwave. It includes:

- **Automatic Weekly Payouts**: Triggered via Cloudflare Cron every Monday at 2:00 AM UTC
- **Flutterwave Integration**: Direct API integration for secure fund transfers
- **Automatic Reconciliation**: Verifies payment status with Flutterwave after 2 hours
- **Retry Logic**: Automatically retries failed transfers (max 3 attempts with 24-hour backoff)
- **Transaction Tracking**: Full audit trail of all payout operations
- **Super Admin Dashboard**: Real-time analytics and payout management interface

## System Architecture

```
Weekly Cron (MON 02:00 UTC)
    ↓
Payout Scheduler (payouts-scheduler.ts)
    ├→ Batch Creation
    ├→ Tutor Selection (balance > min_amount)
    ├→ Flutterwave Initiation
    └→ Wallet Debit
    ↓
Reconciliation (2 hours later)
    ├→ Get Processing Payouts
    ├→ Verify Status with Flutterwave API
    └→ Update Records
    ↓
Retry Handler (24-hour intervals)
    ├→ Check Failed/Pending Retries
    ├→ Retry Failed Transfers
    └→ Log Results
```

## API Endpoints

### 1. GET `/api/finance/payouts`
**Description**: Get payout history and current status
**Authentication**: super_admin only
**Query Parameters**: 
- `timeframe`: '7days' | '30days' | '90days' (default: 30days)

**Response**:
```json
{
  "analytics": {
    "total_payouts": 156,
    "completed_amount": 2500000,
    "processing_amount": 450000,
    "failed_amount": 0,
    "pending_amount": 125000,
    "completed_count": 145,
    "processing_count": 8,
    "failed_count": 0,
    "pending_count": 3,
    "tutors_paid": 92
  },
  "failed_payouts": [...],
  "settings": {...}
}
```

### 2. POST `/api/finance/payouts`
**Description**: Trigger payout actions
**Authentication**: super_admin only
**Body**:
```json
{
  "action": "create_batch" | "payout_tutor" | "reconcile",
  "tutor_id": 123 (optional),
  "amount": 50000 (optional)
}
```

### 3. GET `/api/finance/payouts-reconciliation`
**Description**: Get detailed reconciliation analytics
**Authentication**: super_admin only

**Response**:
```json
{
  "analytics": {...},
  "failed_payouts": [
    {
      "id": "BATCH-1234-T45",
      "tutor_id": 45,
      "name": "John Tutor",
      "amount": 50000,
      "error_message": "Insufficient recipient bank info",
      "attempt_number": 1,
      "next_retry": "2024-01-15T10:30:00Z"
    }
  ],
  "recent_batches": [...],
  "settings": {...}
}
```

### 4. POST `/api/finance/payouts-reconciliation`
**Description**: Manage payout reconciliation
**Authentication**: super_admin only
**Actions**:
- `retry_failed`: Retry a failed payout
- `verify_payout`: Verify single payout status with Flutterwave
- `reconcile_batch`: Reconcile entire batch
- `update_settings`: Update payout configuration

## Database Schema

### `payouts` Table
```sql
CREATE TABLE payouts (
  id TEXT PRIMARY KEY,                      -- Unique payout ID
  tutor_id INTEGER NOT NULL,                -- Teacher ID
  amount REAL NOT NULL,                     -- Amount in NGN
  status TEXT DEFAULT 'pending',            -- pending|processing|completed|failed|refunded
  flutterwave_reference TEXT,               -- Flutterwave transfer ID
  flutterwave_meta TEXT,                    -- JSON metadata from API
  retry_count INTEGER DEFAULT 0,            -- Number of retry attempts
  last_error TEXT,                          -- Last error message
  scheduled_date DATETIME,                  -- When scheduled for payout
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `payout_batches` Table
```sql
CREATE TABLE payout_batches (
  id TEXT PRIMARY KEY,                      -- Batch ID (e.g., BATCH-WEEKLY-1234567890)
  batch_date DATETIME NOT NULL,             -- When batch was created
  payout_count INTEGER DEFAULT 0,           -- Number of payouts in batch
  total_amount REAL DEFAULT 0,              -- Total amount in batch
  status TEXT DEFAULT 'pending',            -- pending|completed|reconciled|failed
  flutterwave_batch_ref TEXT,               -- Flutterwave batch reference
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `payout_failures` Table
```sql
CREATE TABLE payout_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payout_id TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  attempt_number INTEGER DEFAULT 1,
  next_retry DATETIME,
  status TEXT DEFAULT 'pending_retry',      -- pending_retry|max_retries_exceeded|resolved
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `payout_settings` Table
```sql
CREATE TABLE payout_settings (
  id TEXT PRIMARY KEY DEFAULT 'settings',
  min_payout_amount REAL DEFAULT 100,       -- Minimum balance to trigger payout
  max_payout_per_batch REAL DEFAULT 500000, -- Max total per weekly batch
  batch_day_of_week INTEGER DEFAULT 1,      -- 0-6 (0=Sun, 1=Mon, etc)
  batch_time TEXT DEFAULT '02:00:00',       -- HH:MM:SS UTC
  auto_reconcile BOOLEAN DEFAULT 1,
  reconcile_delay_hours INTEGER DEFAULT 2,
  max_retries INTEGER DEFAULT 3,
  retry_interval_hours INTEGER DEFAULT 24,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Configuration

### Flutterwave API Key
Set via Cloudflare environment variable:
```bash
wrangler pages secret put FLUTTERWAVE_SECRET
```

### Payout Settings (SQL)
```sql
UPDATE payout_settings SET
  min_payout_amount = 100,
  max_payout_per_batch = 500000,
  batch_day_of_week = 1,                    -- Monday
  batch_time = '02:00:00',                  -- 2 AM UTC
  auto_reconcile = 1,
  reconcile_delay_hours = 2,
  max_retries = 3,
  retry_interval_hours = 24
WHERE id = 'settings';
```

## Workflow

### 1. Weekly Batch Creation
**Trigger**: Every Monday 02:00 UTC

```typescript
// Get all tutors with balance > min_payout_amount
// For each tutor:
//   - Create payout record with status='pending'
//   - Call Flutterwave API to initiate transfer
//   - Update payout status to 'processing'
//   - Debit tutor's wallet_transactions
//   - Record in payout_batches
```

### 2. Automatic Reconciliation
**Trigger**: 2 hours after batch completion (04:00 UTC)

```typescript
// Get all payouts with status='processing'
// For each payout:
//   - Query Flutterwave API for transfer status
//   - Update payout status based on response
//   - Log reconciliation result
//   - If failed: create payout_failures record
```

### 3. Automatic Retry
**Trigger**: Every 24 hours for pending retries

```typescript
// Get all failures with status='pending_retry' and next_retry <= now
// For each failure:
//   - Attempt retry via Flutterwave API
//   - If success: update status='resolved'
//   - If failure: record new failure, increment attempt_number
//   - If max_retries exceeded: update status='max_retries_exceeded'
```

## Super Admin Dashboard

Access via `/superadmin/payouts`

### Features:
- **Real-time Analytics**: View completed, processing, failed, pending amounts
- **Failed Payout Management**: Retry or verify failed transfers
- **Settings Panel**: Configure minimum amounts, batch timing, retry limits
- **Batch History**: View previous batch details and reconciliation status
- **Auto Reconciliation**: Enable/disable automatic verification

### Operations:
- **Retry Failed Payout**: Manually trigger retry for specific payout
- **Verify Payout**: Check status with Flutterwave without waiting for scheduled reconciliation
- **Update Settings**: Modify payout configuration dynamically

## Error Handling

### Common Failures:
1. **Insufficient Bank Details**: Tutor hasn't provided bank information
   - **Retry**: Manual retry after bank info is added
   - **Status**: pending_retry

2. **Insufficient Funds**: Recipient account restrictions
   - **Retry**: Automatic retry next day
   - **Status**: pending_retry

3. **Network Timeout**: Temporary Flutterwave API issue
   - **Retry**: Automatic retry after 24 hours
   - **Status**: pending_retry

4. **Invalid Recipient**: Wrong bank details
   - **Manual Action**: Super admin must update tutor bank info
   - **Status**: manual_intervention_required

### Retry Logic:
```
Attempt 1: Immediate failure → next_retry in 24 hours
Attempt 2: Failed → next_retry in 24 hours
Attempt 3: Failed → Status = 'max_retries_exceeded'
Manual: Super admin intervention required
```

## Security

- ✅ **Role-based Access**: Only super_admin can access payout endpoints
- ✅ **Encrypted Secrets**: FLUTTERWAVE_SECRET stored in Cloudflare environment
- ✅ **Audit Logging**: All operations logged to audit_logs table
- ✅ **Rate Limiting**: Cloudflare built-in rate limiting on API endpoints
- ✅ **Minimum Reserve**: ₦2,000 reserve enforced before payout
- ✅ **Transaction Tracking**: All wallet changes traceable

## Monitoring

### Health Checks:
- Processing payouts stuck for >24 hours
- Failed payout count exceeds threshold
- Batch completion time anomalies
- Reconciliation discrepancies

### Alerts (to implement):
- Failed retry max attempts reached
- Batch incomplete (< expected payout count)
- Reconciliation verification failed
- Flutterwave API down/timeout

## Testing

### Local Testing:
```bash
# Apply migration
npm run db:migrate:local

# Test payout creation
curl -X POST http://localhost:3000/api/finance/payouts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"action": "payout_tutor", "tutor_id": 1, "amount": 5000}'

# Test reconciliation
curl -X POST http://localhost:3000/api/finance/payouts-reconciliation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"action": "reconcile_batch", "batch_id": "BATCH-1234"}'
```

### Production Deployment:
```bash
# 1. Deploy migration
npm run db:migrate:production

# 2. Set Flutterwave secret
wrangler pages secret put FLUTTERWAVE_SECRET --env production

# 3. Deploy code
npm run deploy:pages

# 4. Verify cron is running
# Check in Cloudflare Workers → Triggers → Crons
```

## Implementation Notes

1. **Tutor Bank Details**: System assumes tutors have saved bank details in their profile
   - Extend `users` table if needed: `bank_account_number`, `bank_code`, `account_name`
   
2. **Flutterwave Account**: Must be configured with:
   - Business account for NGN transfers
   - Sufficient balance to cover payouts
   - API key with transfer permissions

3. **Minimum Reserve**: ₦2,000 held in wallet as platform reserve
   - Prevents overdrafts
   - Amount configurable via payout_settings

4. **Batch Limits**: 
   - Min per payout: ₦100 (configurable)
   - Max per batch: ₦500,000 (configurable)
   - Prevents overloading Flutterwave

5. **Reconciliation Delay**: 2 hours recommended
   - Allows Flutterwave transfer processing
   - Reduces false negatives

## Future Enhancements

- [ ] Multi-currency support (USD, GHS, KES)
- [ ] Payout scheduling per teacher
- [ ] Batch hold/approval workflow
- [ ] Webhook integration for real-time Flutterwave updates
- [ ] Payout analytics dashboard with charts
- [ ] Email notifications to tutors
- [ ] Failed payout escalation workflow
- [ ] Tax withholding calculation
- [ ] Payout history export (CSV/PDF)
