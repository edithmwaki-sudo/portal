-- Map existing free-text ledger types to the new LedgerEntryType enum labels.
UPDATE "student_ledger_entries"
SET "type" = UPPER("type")
WHERE "type" IN ('invoice', 'payment', 'invoice_reversal', 'payment_reversal');
