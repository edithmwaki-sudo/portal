-- Ad-hoc charge type lives on the invoice (for filtering) rather than on each
-- line item; line items stay free-form with provenance in snapshot_data.
ALTER TABLE "invoices" ADD COLUMN "charge_type" "AdhocChargeType";

ALTER TABLE "invoice_items" DROP COLUMN "charge_type";
