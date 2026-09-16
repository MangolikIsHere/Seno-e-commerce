-- Migration: 20260916000000_seller_workflow.sql
-- Description: Adds commission proposals, updates seller_status constraint, and configures storage.

-- 1. Update seller_status constraint
DO $$ 
DECLARE
  v_constraint_name text;
BEGIN
  -- Find the check constraint on seller_status
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.sellers'::regclass
    AND contype = 'c' 
    AND pg_get_constraintdef(oid) ILIKE '%seller_status%';
    
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.sellers DROP CONSTRAINT ' || v_constraint_name;
  END IF;
END $$;

ALTER TABLE public.sellers
  ADD CONSTRAINT sellers_seller_status_check 
  CHECK (seller_status IN ('pending', 'commission_proposed', 'commission_negotiation', 'approved', 'rejected', 'suspended'));

-- 2. Create commission_proposals table
CREATE TABLE IF NOT EXISTS public.commission_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  proposed_rate NUMERIC(5,2) NOT NULL CHECK (proposed_rate >= 0 AND proposed_rate <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected_by_seller', 'counter_proposed')),
  admin_message TEXT,
  seller_requested_rate NUMERIC(5,2) CHECK (seller_requested_rate IS NULL OR (seller_requested_rate >= 0 AND seller_requested_rate <= 100)),
  seller_request_reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  responded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_commission_proposals_seller_id ON public.commission_proposals(seller_id);
CREATE INDEX IF NOT EXISTS idx_commission_proposals_status ON public.commission_proposals(status);

CREATE TRIGGER trg_commission_proposals_updated_at
  BEFORE UPDATE ON public.commission_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 3. RLS for commission_proposals
ALTER TABLE public.commission_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_proposals_admin_all"
  ON public.commission_proposals
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "commission_proposals_seller_select"
  ON public.commission_proposals
  FOR SELECT
  TO authenticated
  USING (seller_id = public.get_current_seller_id());

CREATE POLICY "commission_proposals_seller_update"
  ON public.commission_proposals
  FOR UPDATE
  TO authenticated
  USING (seller_id = public.get_current_seller_id())
  WITH CHECK (seller_id = public.get_current_seller_id());

-- 4. Storage Bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for product-images
DO $$ 
BEGIN
  -- Admin can manage all
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Admin can manage all product images'
  ) THEN
    CREATE POLICY "Admin can manage all product images" 
    ON storage.objects FOR ALL TO authenticated 
    USING (bucket_id = 'product-images' AND public.is_admin());
  END IF;

  -- Sellers can insert their own images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Sellers can upload product images'
  ) THEN
    CREATE POLICY "Sellers can upload product images" 
    ON storage.objects FOR INSERT TO authenticated 
    WITH CHECK (bucket_id = 'product-images' AND public.get_current_seller_id() IS NOT NULL);
  END IF;

  -- Public can read all
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public can view product images'
  ) THEN
    CREATE POLICY "Public can view product images" 
    ON storage.objects FOR SELECT TO public 
    USING (bucket_id = 'product-images');
  END IF;
END $$;
