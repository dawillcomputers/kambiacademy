# Flutterwave Payout System - Deployment Guide

## 🚀 Quick Start: 5-Step Deployment

### Step 1: Get Flutterwave API Key
1. Go to [Flutterwave Dashboard](https://dashboard.flutterwave.com)
2. Navigate to Settings → API → Live Keys
3. Copy the **Secret Key** (starts with `sk_live_`)
4. Keep it safe - you'll need this in Step 2

### Step 2: Set Environment Variable
```bash
# In your project directory
wrangler pages secret put FLUTTERWAVE_SECRET

# When prompted, paste your Flutterwave secret key
```

### Step 2b: Update Flutterwave Redirect Domain
In the Flutterwave dashboard, set the production checkout redirect/callback URL to:

```text
https://kambiacademy.com/payment-callback
```

Do not leave any old `*.kambiacademy.pages.dev` callback hostnames configured for production payments.

### Step 3: Apply Database Migration
```bash
# For local development
wrangler d1 execute DB --local --file=./migrations/0025_payouts_system.sql
wrangler d1 execute DB --local --file=./migrations/0026_superadmin_auth_logic.sql

# For production
wrangler d1 execute DB --remote --file=./migrations/0025_payouts_system.sql
wrangler d1 execute DB --remote --file=./migrations/0026_superadmin_auth_logic.sql
```

### Step 4: Update Tutor Bank Details (Important!)
The payout system needs tutor bank information. Run this SQL to add a sample:

```sql
-- For tutors, save their bank details
-- Tables to update: users (add bank_code, bank_account_number fields OR save in profile)
-- Example tutor banking fields:
UPDATE users SET 
  bank_account_number = '1234567890',
  bank_code = '044'  -- Access Bank
WHERE role = 'teacher' AND id = 1;
```

### Step 5: Build & Deploy
```bash
# Build the project
npm run build

# Deploy to Cloudflare Pages
npm run deploy:pages

# Or use the deploy task
npm run deploy:production
```

---

## ✅ Verification Checklist

After deployment, verify everything works:

```bash
# 1. Check Cloudflare Worker triggers
# Go to: Cloudflare Dashboard → Workers → Triggers → Crons
# Should show: 0 2 * * MON (Every Monday at 2 AM UTC)

# 2. Test API endpoint (requires auth token)
curl -X GET https://your-domain.com/api/finance/payouts-reconciliation \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN"

# 3. Check payout dashboard loads
# Visit: https://your-domain.com/superadmin/payouts
# Should show empty analytics (first payout runs Monday)

# 4. Verify database tables created
wrangler d1 execute DB --command "PRAGMA table_list" | grep payout
# Should show: payouts, payout_batches, payout_failures, payout_reconciliations, payout_settings
```

---

## 🔧 Configuration Options

### Modify Payout Settings
```sql
-- Connect to your D1 database and run:
UPDATE payout_settings SET
  min_payout_amount = 50,              -- Lower minimum to ₦50
  max_payout_per_batch = 1000000,      -- Increase batch limit to ₦1M
  batch_day_of_week = 2,               -- Change to Tuesday
  batch_time = '03:00:00',             -- Change time to 3 AM
  auto_reconcile = 1,                  -- Enable auto reconciliation
  reconcile_delay_hours = 3,           -- Wait 3 hours for reconciliation
  max_retries = 5,                     -- Increase retry attempts to 5
  retry_interval_hours = 12            -- Retry every 12 hours
WHERE id = 'settings';
```

---

## 🧪 Testing Guide

### Test 1: Create Test Payout
```bash
# Using API
curl -X POST https://your-domain.com/api/finance/payouts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "action": "payout_tutor",
    "tutor_id": 1,
    "amount": 5000
  }'

# Expected response:
{
  "payout_id": "P-1234567890-1",
  "tutor_id": 1,
  "tutor_name": "John Tutor",
  "amount": 5000,
  "status": "processing",
  "flutterwave_ref": "FLW-1234567890"
}
```

### Test 2: Check Reconciliation
```bash
# Get payout analytics
curl -X GET https://your-domain.com/api/finance/payouts-reconciliation \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN"

# Should show your test payout in "processing_amount"
```

### Test 3: Retry Failed Payout
```bash
# If payout failed, retry it
curl -X POST https://your-domain.com/api/finance/payouts-reconciliation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "action": "retry_failed",
    "payout_id": "P-1234567890-1"
  }'

# Expected response:
{
  "success": true,
  "message": "Retry 1 of 3 initiated",
  "attempt": 1
}
```

### Test 4: Access Dashboard
```
Browser: https://your-domain.com/superadmin/payouts
- Login as super_admin
- Should see empty analytics (or test payouts)
- Can use "Retry Now" and "Verify" buttons
```

---

## 🐛 Troubleshooting

### Issue: "FLUTTERWAVE_SECRET not found"
```
Solution:
1. Run: wrangler pages secret put FLUTTERWAVE_SECRET
2. Paste your API key when prompted
3. Redeploy: npm run deploy:pages
```

### Issue: "Unauthorized" error on /api/finance/payouts
```
Solution:
1. Verify you're logged in as super_admin
2. Check token is not expired (30 days)
3. Include Authorization header:
   -H "Authorization: Bearer YOUR_TOKEN"
```

### Issue: "Payout record not found"
```
Solution:
1. Run migration: wrangler d1 execute DB --local --file=./migrations/0025_payouts_system.sql
2. Check table exists: SELECT * FROM payouts LIMIT 1;
3. Verify tutor_id exists in users table
```

### Issue: "Flutterwave API returned error"
```
Solution:
1. Verify API key is correct (should start with sk_live_)
2. Check tutor has bank account saved
3. Ensure amount is within Flutterwave limits
4. Check Flutterwave account has sufficient balance
5. Review error log: GET /api/finance/payouts-reconciliation
```

### Issue: Payouts not running at scheduled time
```
Solution:
1. Verify Cloudflare Cron trigger is enabled
2. Check timezone - cron is UTC: "0 2 * * MON" = Monday 2 AM UTC
3. Manually trigger: POST /api/finance/payouts?action=create_batch
4. Check worker logs in Cloudflare Dashboard
```

---

## 📊 Monitoring & Maintenance

### Daily Tasks:
- [ ] Check failed payout count on dashboard
- [ ] Verify reconciliation completed for previous batch

### Weekly Tasks:
- [ ] Monitor Monday 2 AM UTC payout batch
- [ ] Review failed payouts (if any)
- [ ] Check retry effectiveness

### Monthly Tasks:
- [ ] Export payout analytics report
- [ ] Verify tutor satisfaction with payments
- [ ] Review Flutterwave reconciliation accuracy
- [ ] Check for any API errors in logs

### Quarterly Tasks:
- [ ] Review and update payout settings if needed
- [ ] Audit payout_failures table for patterns
- [ ] Test disaster recovery procedures
- [ ] Update documentation if processes change

---

## 🔐 Security Best Practices

1. **Protect API Key**:
   - Never commit FLUTTERWAVE_SECRET to git
   - Use Cloudflare environment secrets only
   - Rotate key annually

2. **Access Control**:
   - Only grant super_admin role to trusted users
   - Audit who creates payouts (audit_logs table)
   - Monitor for suspicious patterns

3. **Transaction Verification**:
   - Always verify payouts with reconciliation
   - Check Flutterwave API responses
   - Log all failures for review

4. **Data Protection**:
   - Tutor bank details encrypted in database
   - HTTPS for all API calls
   - No logging of sensitive data

---

## 📱 Super Admin Operations

### Access Payouts Dashboard:
1. Login at https://your-domain.com/admin
2. Navigate to "Payouts" in sidebar
3. View real-time analytics and failed payouts

### Manual Actions:
- **Retry Failed Payout**: Click "Retry Now" button
- **Verify Payout Status**: Click "Verify" button
- **Update Settings**: Edit payout configuration
- **View History**: Filter by timeframe (7/30/90 days)

### Batch Manual Trigger:
```
1. Dashboard → Finance → Payouts
2. (Future feature) "Run Batch Now" button
3. Or use API: POST /api/finance/payouts?action=create_batch
```

---

## 🎯 Success Criteria

After deployment, confirm:

✅ Payouts dashboard loads without errors
✅ First weekly batch runs Monday at 2 AM UTC
✅ All tutors with balance > ₦100 receive payouts
✅ Reconciliation completes after 2 hours
✅ Failed payouts retry automatically
✅ Super admin can manually retry/verify payouts
✅ Audit logs show all payout operations

---

## 📞 Support & Resources

- **Flutterwave Docs**: https://developer.flutterwave.com/docs
- **API Reference**: https://developer.flutterwave.com/reference
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **D1 Database**: https://developers.cloudflare.com/d1/

---

**Status**: Ready to Deploy ✅
**Last Updated**: 2024
**Maintained By**: Kambi Academy Team
