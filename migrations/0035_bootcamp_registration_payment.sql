-- Migration: 0035_bootcamp_registration_payment
-- Adds payment tracking to bootcamp registrations so the registration fee can be
-- collected through the same Flutterwave gateway used for student course payments.
-- A registration with a fee stays `pending_payment` until Flutterwave verifies it.

ALTER TABLE bootcamp_registrations ADD COLUMN payment_ref TEXT DEFAULT '';
ALTER TABLE bootcamp_registrations ADD COLUMN payment_status TEXT DEFAULT 'unpaid'; -- unpaid | paid | free
ALTER TABLE bootcamp_registrations ADD COLUMN amount_due REAL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_bootcamp_registrations_payment_ref ON bootcamp_registrations(payment_ref);
