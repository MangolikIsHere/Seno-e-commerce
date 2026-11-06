export type HeroMediaType = 'image' | 'video' | 'gif'

export interface HeroSlideRecord {
  id: string
  title: string
  eyebrow?: string | null
  headline: string
  subheading?: string | null
  cta_text: string
  cta_link: string
  image_url: string // Primary desktop media URL (or image/poster for video/gif)
  mobile_image_url?: string | null // Mobile-optimized image/media
  image_alt?: string | null
  image_focal_point?: 'center' | 'top' | 'bottom' | 'left' | 'right' | string
  text_alignment?: 'left' | 'center' | 'right'
  content_placement?: 'bottom-left' | 'center-left' | 'center' | 'bottom-center'
  overlay_opacity?: number
  is_active: boolean
  display_priority: number
  // Animated Media Extensions
  media_type?: HeroMediaType
  video_url?: string | null // Desktop MP4/WebM video URL
  mobile_video_url?: string | null // Mobile MP4/WebM video URL
  poster_url?: string | null // Poster image shown while loading or if autoplay blocked
  loop_video?: boolean
  muted_video?: boolean
  // Campaign Scheduling (Optional)
  start_date?: string | null
  end_date?: string | null
  created_at?: string
  updated_at?: string
}

/**
 * Robustly detect the media type of a hero slide with backward compatibility
 * for legacy records that only populate image_url with an mp4 or gif.
 */
export function resolveSlideMediaType(slide: Partial<HeroSlideRecord>): HeroMediaType {
  if (slide.media_type === 'video' || slide.media_type === 'gif' || slide.media_type === 'image') {
    return slide.media_type
  }

  // Check explicit video url
  if (slide.video_url || slide.mobile_video_url) {
    return 'video'
  }

  // Check URL extension in image_url
  const url = (slide.image_url || '').toLowerCase()
  if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov') || url.includes('/video/')) {
    return 'video'
  }

  if (url.endsWith('.gif')) {
    return 'gif'
  }

  return 'image'
}

export const DEFAULT_HERO_SLIDE: HeroSlideRecord = {
  id: '00000000-0000-0000-0000-000000000001',
  title: 'New forms for everyday',
  eyebrow: 'SPRING / SUMMER 26',
  headline: 'New forms\nfor everyday.',
  subheading: 'Considered clothing for everyday life.',
  cta_text: 'SHOP NOW',
  cta_link: '/collections/new-arrivals',
  image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85',
  mobile_image_url: null,
  image_alt: 'SENO Spring / Summer 26 Campaign',
  image_focal_point: 'center',
  text_alignment: 'left',
  content_placement: 'bottom-left',
  overlay_opacity: 25,
  is_active: true,
  display_priority: 1,
  media_type: 'image',
  video_url: null,
  mobile_video_url: null,
  poster_url: null,
  loop_video: true,
  muted_video: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}
