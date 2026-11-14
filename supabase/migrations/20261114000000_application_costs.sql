-- -----------------------------------------------------------------------------
-- Migration: 20261114000000_application_costs.sql
-- Description: Optional cost estimate fields on applications, used by the
-- application page and the Compare view. All amounts are in cost_currency.
-- -----------------------------------------------------------------------------

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS cost_currency TEXT NULL,
  ADD COLUMN IF NOT EXISTS tuition_per_year NUMERIC(14, 2) NULL,
  ADD COLUMN IF NOT EXISTS living_cost_per_year NUMERIC(14, 2) NULL,
  ADD COLUMN IF NOT EXISTS application_fee NUMERIC(14, 2) NULL,
  ADD COLUMN IF NOT EXISTS funding_per_year NUMERIC(14, 2) NULL,
  ADD COLUMN IF NOT EXISTS duration_years NUMERIC(3, 1) NULL;

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS chk_applications_cost_currency;
ALTER TABLE public.applications
  ADD CONSTRAINT chk_applications_cost_currency
  CHECK (cost_currency IS NULL OR cost_currency ~ '^[A-Z]{3}$');

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS chk_applications_costs_non_negative;
ALTER TABLE public.applications
  ADD CONSTRAINT chk_applications_costs_non_negative
  CHECK (
    (tuition_per_year IS NULL OR tuition_per_year >= 0)
    AND (living_cost_per_year IS NULL OR living_cost_per_year >= 0)
    AND (application_fee IS NULL OR application_fee >= 0)
    AND (funding_per_year IS NULL OR funding_per_year >= 0)
  );

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS chk_applications_duration_years;
ALTER TABLE public.applications
  ADD CONSTRAINT chk_applications_duration_years
  CHECK (duration_years IS NULL OR (duration_years > 0 AND duration_years <= 10));
