-- ==============================================================================
-- SENO MARKETPLACE — OFFERS & PROMOTIONS SYSTEM (PHASE 8)
-- Migration: 20261008000000_offers_and_promotions_system.sql
-- ==============================================================================

-- 1. PROMOTIONS TABLE
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'flat', 'bogo', 'free_shipping', 'coupon')),
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_value >= 0),
  bogo_buy_qty INTEGER DEFAULT 1 CHECK (bogo_buy_qty >= 1),
  bogo_get_qty INTEGER DEFAULT 1 CHECK (bogo_get_qty >= 1),
  bogo_discount_percent NUMERIC(5,2) DEFAULT 100.00 CHECK (bogo_discount_percent >= 0 AND bogo_discount_percent <= 100),
  coupon_code TEXT,
  applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'category', 'collection', 'products')),
  target_ids JSONB DEFAULT '[]'::jsonb,
  min_cart_value NUMERIC(10,2) DEFAULT NULL CHECK (min_cart_value IS NULL OR min_cart_value >= 0),
  min_quantity INTEGER DEFAULT NULL CHECK (min_quantity IS NULL OR min_quantity >= 1),
  max_discount_amount NUMERIC(10,2) DEFAULT NULL CHECK (max_discount_amount IS NULL OR max_discount_amount >= 0),
  usage_limit INTEGER DEFAULT NULL CHECK (usage_limit IS NULL OR usage_limit >= 1),
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  per_customer_limit INTEGER DEFAULT 1 CHECK (per_customer_limit IS NULL OR per_customer_limit >= 1),
  starts_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  ends_at TIMESTAMPTZ DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'expired')),
  allow_stacking BOOLEAN NOT NULL DEFAULT FALSE,
  show_on_homepage_hero BOOLEAN NOT NULL DEFAULT FALSE,
  hero_badge TEXT DEFAULT 'LIMITED OFFER',
  hero_headline TEXT,
  hero_subheading TEXT,
  hero_cta_text TEXT DEFAULT 'SHOP THE OFFER',
  hero_image_url TEXT,
  display_priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Unique index on coupon_code when not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_coupon_code_upper 
  ON public.promotions(UPPER(coupon_code)) 
  WHERE coupon_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_promotions_slug ON public.promotions(slug);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON public.promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_hero ON public.promotions(show_on_homepage_hero, display_priority DESC);

CREATE TRIGGER trg_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 2. PROMOTION REDEMPTIONS (AUDIT LOG FOR USAGE TRACKING & PER-CUSTOMER ENFORCEMENT)
CREATE TABLE IF NOT EXISTS public.promotion_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_promo_cust 
  ON public.promotion_redemptions(promotion_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_order 
  ON public.promotion_redemptions(order_id);

-- 3. ORDERS TABLE PROMOTION SNAPSHOT EXTENSIONS
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promotion_code TEXT,
  ADD COLUMN IF NOT EXISTS promotion_snapshot JSONB;

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;

-- Public can view active promotions
DROP POLICY IF EXISTS "promotions_public_active_select" ON public.promotions;
CREATE POLICY "promotions_public_active_select" 
  ON public.promotions 
  FOR SELECT 
  USING (status = 'active' OR public.is_admin());

-- Admin has full control
DROP POLICY IF EXISTS "promotions_admin_all" ON public.promotions;
CREATE POLICY "promotions_admin_all" 
  ON public.promotions 
  FOR ALL 
  TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Redemptions visibility
DROP POLICY IF EXISTS "promotion_redemptions_select" ON public.promotion_redemptions;
CREATE POLICY "promotion_redemptions_select" 
  ON public.promotion_redemptions 
  FOR SELECT 
  TO authenticated 
  USING (customer_id = auth.uid() OR public.is_admin());

-- 5. INITIAL EDITORIAL SEED PROMOTIONS
INSERT INTO public.promotions (
  name,
  slug,
  description,
  type,
  discount_value,
  bogo_buy_qty,
  bogo_get_qty,
  bogo_discount_percent,
  coupon_code,
  applies_to,
  target_ids,
  min_cart_value,
  min_quantity,
  max_discount_amount,
  usage_limit,
  usage_count,
  per_customer_limit,
  starts_at,
  ends_at,
  status,
  allow_stacking,
  show_on_homepage_hero,
  hero_badge,
  hero_headline,
  hero_subheading,
  hero_cta_text,
  hero_image_url,
  display_priority
) VALUES 
(
  'Festive Capsule — 20% Off',
  'festive-capsule-20-off',
  'Enjoy 20% off selected seasonal garments and traditional silhouettes.',
  'percentage',
  20.00,
  1,
  1,
  100.00,
  NULL,
  'all',
  '[]'::jsonb,
  1500.00,
  NULL,
  2000.00,
  NULL,
  0,
  1,
  timezone('utc'::text, now()),
  timezone('utc'::text, now() + interval '90 days'),
  'active',
  false,
  true,
  'LIMITED OFFER',
  '20% OFF SELECTED STYLES',
  'Discover considered silhouettes for everyday movement.',
  'SHOP THE OFFER',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85',
  10
),
(
  'Essentials Duo — Buy 1 Get 1 Free',
  'essentials-bogo-free',
  'Complimentary piece when purchasing from our tailored essentials selection.',
  'bogo',
  0.00,
  1,
  1,
  100.00,
  NULL,
  'category',
  '["topwear", "bottomwear"]'::jsonb,
  NULL,
  2,
  NULL,
  NULL,
  0,
  1,
  timezone('utc'::text, now()),
  timezone('utc'::text, now() + interval '60 days'),
  'active',
  false,
  true,
  'CURATED DUO',
  'BUY 1 GET 1 FREE',
  'Pair elevated tops with contemporary separates.',
  'EXPLORE BOGO EDIT',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1800&q=85',
  20
),
(
  'Welcome to SENO — ₹500 Off',
  'welcome-seno-500',
  'Get ₹500 off on your order above ₹2,500 using code SENO500.',
  'coupon',
  500.00,
  1,
  1,
  100.00,
  'SENO500',
  'all',
  '[]'::jsonb,
  2500.00,
  NULL,
  500.00,
  1000,
  0,
  1,
  timezone('utc'::text, now()),
  timezone('utc'::text, now() + interval '120 days'),
  'active',
  false,
  false,
  'SPECIAL WELCOME',
  '₹500 OFF ABOVE ₹2,500',
  'Use promo code SENO500 at checkout.',
  'SHOP WITH CODE',
  NULL,
  5
)
ON CONFLICT (slug) DO NOTHING;
