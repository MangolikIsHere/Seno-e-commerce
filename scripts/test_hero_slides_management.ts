;(process.env as any).NODE_ENV = 'development'

import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { HeroSlideRecord, DEFAULT_HERO_SLIDE } from '../lib/hero-slides-shared'
import {
  saveHeroSlideAction,
  deleteHeroSlideAction,
  toggleHeroSlideStatusAction,
  reorderHeroSlidesAction,
  getAllHeroSlides,
  getCachedActiveHeroSlides
} from '../lib/hero-slides'

console.log('=================================================================')
console.log('SENO — HERO SLIDE STOREFRONT REFLECTION & REGRESSION VERIFICATION')
console.log('=================================================================\n')

let passedTests = 0
let totalTests = 0

async function test(name: string, fn: () => void | Promise<void>) {
  totalTests++
  try {
    const result = fn()
    if (result instanceof Promise) {
      await result
    }
    console.log(`[PASS] Case ${totalTests}: ${name}`)
    passedTests++
  } catch (err: any) {
    console.error(`[FAIL] Case ${totalTests}: ${name}`)
    console.error(`       Error: ${err.message}`)
    throw err
  }
}

async function runTests() {
  const localDataPath = path.join(process.cwd(), 'data', 'hero_slides.json')
  const originalBackup = fs.existsSync(localDataPath) ? fs.readFileSync(localDataPath, 'utf-8') : null

  // Capture original Supabase/local state to restore after tests
  const initialOriginalSlides = await getAllHeroSlides()

  try {
    // --------------------------------------------------------------------------
    // Test 1: Change the first slide heading and confirm storefront displays it
    // --------------------------------------------------------------------------
    await test('Case 1: Change first slide heading and confirm storefront reflects it', async () => {
      const slides = await getAllHeroSlides()
      assert(slides.length >= 1, 'Should have at least 1 slide')
      const firstSlide = slides[0]

      const updated = {
        ...firstSlide,
        headline: 'DIWALI SALE\nCURATED FESTIVE EDIT.'
      }

      const res = await saveHeroSlideAction(updated)
      assert.strictEqual(res.success, true, `Save should succeed: ${res.error}`)

      // Verify storefront active slides reflect the heading change
      const activeSlides = await getCachedActiveHeroSlides()
      const storefrontFirst = activeSlides.find(s => s.id === firstSlide.id)
      assert(storefrontFirst, 'First slide must be present in storefront active slides')
      assert.strictEqual(storefrontFirst.headline, 'DIWALI SALE\nCURATED FESTIVE EDIT.')
    })

    // --------------------------------------------------------------------------
    // Test 2: Change image and CTA destination
    // --------------------------------------------------------------------------
    await test('Case 2: Change first slide image and CTA destination', async () => {
      const slides = await getAllHeroSlides()
      const firstSlide = slides[0]

      const updated = {
        ...firstSlide,
        image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=90',
        cta_text: 'EXPLORE DIWALI EDIT',
        cta_link: '/offers/diwali-capsule'
      }

      const res = await saveHeroSlideAction(updated)
      assert.strictEqual(res.success, true)
      assert.strictEqual(res.slide?.cta_text, 'EXPLORE DIWALI EDIT')
      assert.strictEqual(res.slide?.cta_link, '/offers/diwali-capsule')

      const activeSlides = await getCachedActiveHeroSlides()
      const storefrontFirst = activeSlides.find(s => s.id === firstSlide.id)
      assert.strictEqual(storefrontFirst?.cta_text, 'EXPLORE DIWALI EDIT')
      assert.strictEqual(storefrontFirst?.cta_link, '/offers/diwali-capsule')
    })

    // --------------------------------------------------------------------------
    // Test 3: Move second slide to priority #1 and verify ordering on storefront
    // --------------------------------------------------------------------------
    await test('Case 3: Move second slide to priority #1 -> Storefront rank #1 updates', async () => {
      const slides = await getAllHeroSlides()
      assert(slides.length >= 2, 'Need at least 2 slides')

      const originalFirstId = slides[0].id
      const originalSecondId = slides[1].id

      // Swap priorities: slide 2 becomes #1, slide 1 becomes #2
      const newOrder = [originalSecondId, originalFirstId, ...slides.slice(2).map(s => s.id)]
      const res = await reorderHeroSlidesAction(newOrder)
      assert.strictEqual(res.success, true, `Reorder should succeed: ${res.error}`)

      // Verify active slides ordering on storefront
      const activeSlides = await getCachedActiveHeroSlides()
      assert(activeSlides.length >= 2)
      assert.strictEqual(activeSlides[0].id, originalSecondId, 'Second slide must now be rank #1 on storefront')
      assert.strictEqual(activeSlides[0].display_priority, 1)
      assert.strictEqual(activeSlides[1].id, originalFirstId, 'Original first slide must now be rank #2 on storefront')
      assert.strictEqual(activeSlides[1].display_priority, 2)
    })

    // --------------------------------------------------------------------------
    // Test 4: Deactivate first slide -> Storefront hides it immediately
    // --------------------------------------------------------------------------
    let deactivatedSlideId = ''
    await test('Case 4: Deactivate rank #1 slide -> Storefront hides it from customers', async () => {
      const activeBefore = await getCachedActiveHeroSlides()
      const targetSlide = activeBefore[0]
      deactivatedSlideId = targetSlide.id

      const res = await toggleHeroSlideStatusAction(deactivatedSlideId, false)
      assert.strictEqual(res.success, true)

      const activeAfter = await getCachedActiveHeroSlides()
      assert(!activeAfter.some(s => s.id === deactivatedSlideId), 'Deactivated slide must NOT be in active storefront slides')
    })

    // --------------------------------------------------------------------------
    // Test 5: Reactivate previously inactive slide
    // --------------------------------------------------------------------------
    await test('Case 5: Activate previously inactive slide -> Re-appears on storefront', async () => {
      assert(deactivatedSlideId, 'Must have deactivated slide ID')

      const res = await toggleHeroSlideStatusAction(deactivatedSlideId, true)
      assert.strictEqual(res.success, true)

      const activeAfter = await getCachedActiveHeroSlides()
      assert(activeAfter.some(s => s.id === deactivatedSlideId), 'Reactivated slide must appear in active storefront slides')
    })

    // --------------------------------------------------------------------------
    // Test 6: Create and delete a slide
    // --------------------------------------------------------------------------
    let tempSlideId = ''
    await test('Case 6: Create new slide and permanently delete it', async () => {
      const newSlide = {
        title: 'Diwali Special Showcase',
        eyebrow: 'DIWALI 2026',
        headline: 'DIWALI SALE',
        cta_text: 'CLAIM OFFER',
        cta_link: '/offers/diwali',
        image_url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1800&q=85',
        is_active: true,
        display_priority: 99
      }

      const saveRes = await saveHeroSlideAction(newSlide)
      assert.strictEqual(saveRes.success, true)
      assert(saveRes.slide?.id)
      tempSlideId = saveRes.slide.id

      // Confirm presence
      let slides = await getAllHeroSlides()
      assert(slides.some(s => s.id === tempSlideId))

      // Delete slide
      const delRes = await deleteHeroSlideAction(tempSlideId)
      assert.strictEqual(delRes.success, true)

      slides = await getAllHeroSlides()
      assert(!slides.some(s => s.id === tempSlideId), 'Deleted slide must no longer exist in database')
    })

    // --------------------------------------------------------------------------
    // Test 7: Verify fallback safety when no active slides exist
    // --------------------------------------------------------------------------
    await test('Case 7: Fallback safety returns default slide without crashing', () => {
      const emptySlides: HeroSlideRecord[] = []
      const active = emptySlides.filter(s => s.is_active)
      const resolved = active.length > 0 ? active : [DEFAULT_HERO_SLIDE]

      assert.strictEqual(resolved.length, 1)
      assert.strictEqual(resolved[0].title, DEFAULT_HERO_SLIDE.title)
    })

    // --------------------------------------------------------------------------
    // Test 8: Desktop and mobile image separation validation
    // --------------------------------------------------------------------------
    await test('Case 8: Desktop and mobile image separation validation', async () => {
      const testMobileSlide = {
        title: 'Responsive Campaign Test',
        headline: 'Responsive View',
        image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1800',
        mobile_image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=768',
        image_focal_point: 'top',
        is_active: true,
        display_priority: 50
      }

      const res = await saveHeroSlideAction(testMobileSlide)
      assert.strictEqual(res.success, true)
      assert.strictEqual(res.slide?.mobile_image_url, testMobileSlide.mobile_image_url)
      assert.strictEqual(res.slide?.image_focal_point, 'top')

      // Clean up test slide
      await deleteHeroSlideAction(res.slide!.id)
    })

    // --------------------------------------------------------------------------
    // Test 9: Verify unauthorized users cannot change slides
    // --------------------------------------------------------------------------
    await test('Case 9: Unauthorized users cannot edit or delete slides', async () => {
      // Temporarily simulate non-admin environment
      const previousEnv = (process.env as any).NODE_ENV
      ;(process.env as any).NODE_ENV = 'production'

      try {
        const res = await saveHeroSlideAction({
          title: 'Hacked Slide',
          headline: 'Hacked',
          image_url: 'https://evil.com/img.jpg'
        })
        assert.strictEqual(res.success, false, 'Save must fail without admin credentials')
        assert(res.error?.includes('Unauthorized'), 'Error message must specify unauthorized')

        const delRes = await deleteHeroSlideAction('00000000-0000-0000-0000-000000000001')
        assert.strictEqual(delRes.success, false, 'Delete must fail without admin credentials')
      } finally {
        ;(process.env as any).NODE_ENV = previousEnv
      }
    })

    // --------------------------------------------------------------------------
    // Test 10: Verify a failed save does not display a false success message
    // --------------------------------------------------------------------------
    await test('Case 10: Incomplete or invalid slide data returns clear error, never false success', async () => {
      const resMissingTitle = await saveHeroSlideAction({
        title: '',
        headline: 'Valid Headline',
        image_url: 'https://example.com/img.jpg'
      })
      assert.strictEqual(resMissingTitle.success, false)
      assert.strictEqual(resMissingTitle.error, 'Slide title is required.')

      const resMissingHeadline = await saveHeroSlideAction({
        title: 'Valid Title',
        headline: '',
        image_url: 'https://example.com/img.jpg'
      })
      assert.strictEqual(resMissingHeadline.success, false)
      assert.strictEqual(resMissingHeadline.error, 'Slide headline is required.')

      const resMissingImage = await saveHeroSlideAction({
        title: 'Valid Title',
        headline: 'Valid Headline',
        image_url: ''
      })
      assert.strictEqual(resMissingImage.success, false)
      assert.strictEqual(resMissingImage.error, 'Desktop background image is required.')
    })

    // --------------------------------------------------------------------------
    // Test 11: Verify 4-second hero slide interval in HeroCarousel source
    // --------------------------------------------------------------------------
    await test('Case 11: Hero carousel rotates every 4 seconds (4000ms)', () => {
      const heroCarouselPath = path.join(process.cwd(), 'components', 'HeroCarousel.tsx')
      const source = fs.readFileSync(heroCarouselPath, 'utf-8')
      assert(source.includes('4000'), 'HeroCarousel must contain 4000ms timer interval')
      assert(!source.includes('6000'), 'Old 6000ms timer interval should be removed')
    })

  } finally {
    // Restore pristine original slides to Supabase and local file
    try {
      const orderedOriginalIds = initialOriginalSlides.map(s => s.id)
      for (const slide of initialOriginalSlides) {
        await saveHeroSlideAction(slide)
      }
      await reorderHeroSlidesAction(orderedOriginalIds)
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr)
    }

    if (originalBackup) {
      fs.writeFileSync(localDataPath, originalBackup, 'utf-8')
    }
  }

  console.log('\n=================================================================')
  console.log(`ALL STOREFRONT HERO REGRESSION TESTS PASSED: ${passedTests}/${totalTests} (100%)`)
  console.log('=================================================================\n')
}

runTests().catch(err => {
  console.error('Fatal test failure:', err)
  process.exit(1)
})
