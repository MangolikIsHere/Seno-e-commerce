'use server'

import fs from 'fs'
import path from 'path'
import { getAdminSupabase } from '@/lib/supabaseAdmin'
import { checkIsAdmin } from '@/lib/admin'

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif'
]

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime'
]

const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024 // 15MB
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

export interface HeroUploadResult {
  url?: string
  mediaType?: 'image' | 'video' | 'gif'
  fileSize?: number
  error?: string
}

export async function uploadHeroMediaAction(formData: FormData): Promise<HeroUploadResult> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { error: 'Unauthorized: Admin privileges required.' }
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return { error: 'No media file provided.' }
  }

  const mime = file.type.toLowerCase()
  const isVideo = ALLOWED_VIDEO_TYPES.includes(mime)
  const isImage = ALLOWED_IMAGE_TYPES.includes(mime)

  if (!isVideo && !isImage) {
    return {
      error: 'Unsupported file format. Please upload JPG, PNG, WebP, GIF, or MP4/WebM video.'
    }
  }

  if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
    return { error: 'Video file size exceeds the 50MB limit.' }
  }

  if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
    return { error: 'Image file size exceeds the 15MB limit.' }
  }

  const mediaType: 'image' | 'video' | 'gif' = isVideo
    ? 'video'
    : mime === 'image/gif'
    ? 'gif'
    : 'image'

  const buffer = Buffer.from(await file.arrayBuffer())
  const cleanExt = path.extname(file.name) || (isVideo ? '.mp4' : mime === 'image/gif' ? '.gif' : '.jpg')
  const cleanBase = path.basename(file.name, cleanExt).replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `${Date.now()}_${cleanBase}${cleanExt}`
  const storagePath = `hero/${fileName}`

  // 1. Primary: Upload to Supabase Storage
  try {
    const supabase = getAdminSupabase()
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('product-images')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (!uploadErr && uploadData) {
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath)

      if (urlData?.publicUrl) {
        return {
          url: urlData.publicUrl,
          mediaType,
          fileSize: file.size
        }
      }
    }

    console.warn('[HeroMedia] Supabase storage upload notice:', uploadErr?.message)
  } catch (err: any) {
    console.warn('[HeroMedia] Supabase storage exception:', err?.message)
  }

  // 2. Reliable Local Fallback: write to public/uploads/hero/
  try {
    const localDir = path.join(process.cwd(), 'public', 'uploads', 'hero')
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true })
    }
    const localFilePath = path.join(localDir, fileName)
    fs.writeFileSync(localFilePath, buffer)

    return {
      url: `/uploads/hero/${fileName}`,
      mediaType,
      fileSize: file.size
    }
  } catch (localErr: any) {
    console.error('[HeroMedia] Local fallback save error:', localErr)
    return { error: 'Failed to upload media to storage and local fallback.' }
  }
}
