-- Migration: Update courses to new pricing model
-- All courses are free to enroll, only certificates are paid

-- Rename and update instructor_courses table
ALTER TABLE public.instructor_courses
  DROP COLUMN IF EXISTS price_type,
  DROP COLUMN IF EXISTS price_numeric;

ALTER TABLE public.instructor_courses
  ADD COLUMN IF NOT EXISTS certificate_price numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'MZM';

-- Create index for certificate pricing
CREATE INDEX IF NOT EXISTS idx_instructor_courses_certificate_price
  ON public.instructor_courses (certificate_price)
  WHERE certificate_price > 0;

-- Update enrollments to track certificate payments separately
ALTER TABLE IF EXISTS public.enrollments
  ADD COLUMN IF NOT EXISTS certificate_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_price numeric(12,2) NOT NULL DEFAULT 0;

-- Add comment explaining the new model
COMMENT ON COLUMN public.instructor_courses.certificate_price IS 'Price of the certificate in MZM (0 = free)';
COMMENT ON COLUMN public.enrollments.certificate_paid IS 'Whether the student has paid for the certificate';
COMMENT ON COLUMN public.enrollments.certificate_price IS 'Certificate price at the time of enrollment';

-- Migration marker
INSERT INTO public._migrations (name, executed_at)
VALUES ('20260212_000001_update_courses_pricing_model', now())
ON CONFLICT DO NOTHING;
