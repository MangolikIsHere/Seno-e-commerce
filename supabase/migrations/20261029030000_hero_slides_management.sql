-- ==============================================================================
-- SENO STOREFRONT — HERO SLIDE MANAGEMENT SYSTEM
-- Migration: 20261029030000_hero_slides_management.sql
-- ==============================================================================

-- 1. HERO SLIDES TABLE
CREATE TABLE IF NOT EXISTS public.hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  eyebrow TEXT,
  headline TEXT NOT NULL,
  subheading TEXT,
  cta_text TEXT NOT NULL DEFAULT 'SHOP NOW',
  cta_link TEXT NOT NULL DEFAULT '/collections/new-arrivals',
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  image_alt TEXT,
  image_focal_point TEXT DEFAULT 'center',
  text_alignment TEXT DEFAULT 'left',
  content_placement TEXT DEFAULT 'bottom-left',
  overlay_opacity INTEGER DEFAULT 25 CHECK (overlay_opacity >= 0 AND overlay_opacity <= 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_priority INTEGER NOT NULL DEFAULT 1 CHECK (display_priority >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indices for ordering and active storefront lookups
CREATE INDEX IF NOT EXISTS idx_hero_slides_storefront
  ON public.hero_slides(is_active, display_priority ASC, created_at ASC);

-- Automatic updated_at trigger if set_current_timestamp_updated_at exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_current_timestamp_updated_at'
  ) THEN
    CREATE TRIGGER trg_hero_slides_updated_at
      BEFORE UPDATE ON public.hero_slides
      FOR EACH ROW
      EXECUTE FUNCTION public.set_current_timestamp_updated_at();
  END IF;
END $$;

-- 2. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Storefront visitors can read active slides only (or admins can read all)
DROP POLICY IF EXISTS "hero_slides_public_active_select" ON public.hero_slides;
CREATE POLICY "hero_slides_public_active_select"
  ON public.hero_slides
  FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

-- Authorized admins have full CRUD permissions
DROP POLICY IF EXISTS "hero_slides_admin_manage" ON public.hero_slides;
CREATE POLICY "hero_slides_admin_manage"
  ON public.hero_slides
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. FORWARD-SAFE EDITABLE MIGRATION OF THE INITIAL FIRST SLIDE & FEATURED SLIDES
-- Safely seeds the initial slides if table is newly created, so every slide is immediately editable
INSERT INTO public.hero_slides (
  id,
  title,
  eyebrow,
  headline,
  subheading,
  cta_text,
  cta_link,
  image_url,
  mobile_image_url,
  image_alt,
  image_focal_point,
  text_alignment,
  content_placement,
  overlay_opacity,
  is_active,
  display_priority
)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'New forms for everyday',
  'SPRING / SUMMER 26',
  E'New forms\nfor everyday.',
  'Considered clothing for everyday life.',
  'SHOP NOW',
  '/collections/new-arrivals',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85',
  NULL,
  'SENO Spring / Summer 26 Campaign',
  'center',
  'left',
  'bottom-left',
  25,
  TRUE,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM public.hero_slides WHERE title = 'New forms for everyday'
);

INSERT INTO public.hero_slides (
  id,
  title,
  eyebrow,
  headline,
  subheading,
  cta_text,
  cta_link,
  image_url,
  mobile_image_url,
  image_alt,
  image_focal_point,
  text_alignment,
  content_placement,
  overlay_opacity,
  is_active,
  display_priority
)
SELECT
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Essentials Duo — Buy 1 Get 1 Free',
  'CURATED DUO',
  'BUY 1 GET 1 FREE',
  'Pair elevated tops with contemporary separates.',
  'EXPLORE BOGO EDIT',
  '/offers/essentials-bogo-free',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1800&q=85',
  NULL,
  'SENO Tailored Essentials Campaign',
  'center',
  'left',
  'bottom-left',
  30,
  TRUE,
  2
WHERE NOT EXISTS (
  SELECT 1 FROM public.hero_slides WHERE title = 'Essentials Duo — Buy 1 Get 1 Free'
);

INSERT INTO public.hero_slides (
  id,
  title,
  eyebrow,
  headline,
  subheading,
  cta_text,
  cta_link,
  image_url,
  mobile_image_url,
  image_alt,
  image_focal_point,
  text_alignment,
  content_placement,
  overlay_opacity,
  is_active,
  display_priority
)
SELECT
  '00000000-0000-0000-0000-000000000003'::uuid,
  'Festive Capsule — 20% Off',
  'LIMITED OFFER',
  '20% OFF SELECTED STYLES',
  'Discover considered silhouettes for everyday movement.',
  'SHOP THE OFFER',
  '/offers/festive-capsule-20-off',
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1800&q=85',
  NULL,
  'SENO Festive Capsule Campaign',
  'center',
  'left',
  'bottom-left',
  30,
  TRUE,
  3
WHERE NOT EXISTS (
  SELECT 1 FROM public.hero_slides WHERE title = 'Festive Capsule — 20% Off'
);

