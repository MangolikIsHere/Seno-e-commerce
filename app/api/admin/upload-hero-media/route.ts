import { NextRequest, NextResponse } from 'next/server'
import { uploadHeroMediaAction } from '@/lib/hero-media'
import { checkIsAdmin } from '@/lib/admin'

export async function POST(request: NextRequest) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const result = await uploadHeroMediaAction(formData)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      url: result.url,
      mediaType: result.mediaType,
      fileSize: result.fileSize
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Media upload failed.' }, { status: 500 })
  }
}
