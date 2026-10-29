export interface HeroSlideRecord {
  id: string
  title: string
  eyebrow?: string | null
  headline: string
  subheading?: string | null
  cta_text: string
  cta_link: string
  image_url: string
  mobile_image_url?: string | null
  image_alt?: string | null
  image_focal_point?: 'center' | 'top' | 'bottom' | 'left' | 'right' | string
  text_alignment?: 'left' | 'center' | 'right'
  content_placement?: 'bottom-left' | 'center-left' | 'center' | 'bottom-center'
  overlay_opacity?: number
  is_active: boolean
  display_priority: number
  created_at?: string
  updated_at?: string
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
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

