-- ==============================================================================
-- SENO STOREFRONT — HERO SLIDE ANIMATED VIDEO & GIF EXTENSION
-- Migration: 20261107010000_hero_slides_animated_video_gif.sql
-- ==============================================================================

ALTER TABLE public.hero_slides
  ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'gif')),
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS mobile_video_url TEXT,
  ADD COLUMN IF NOT EXISTS poster_url TEXT,
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- Refresh comment documentation
COMMENT ON COLUMN public.hero_slides.media_type IS 'Media kind for hero slide: image, video (MP4/WebM), or gif';
COMMENT ON COLUMN public.hero_slides.video_url IS 'Desktop video source URL for video slides';
COMMENT ON COLUMN public.hero_slides.mobile_video_url IS 'Mobile-optimized video source URL (portrait/square)';
COMMENT ON COLUMN public.hero_slides.poster_url IS 'Poster image displayed while video loads or if autoplay blocked';

