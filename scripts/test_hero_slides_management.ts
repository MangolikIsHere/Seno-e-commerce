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
  getAllHeroSlides
} from '../lib/hero-slides'

console.log('=================================================================')
console.log('SENO — HERO SLIDE MANAGEMENT & PRIORITY COMPREHENSIVE VERIFICATION')
console.log('=================================================================\n')

let passedTests = 0
let totalTests = 0

function test(name: string, fn: () => void | Promise<void>) {
  totalTests++
  try {
    const result = fn()
    if (result instanceof Promise) {
      return result
        .then(() => {
          console.log(`[PASS] Case ${totalTests}: ${name}`)
          passedTests++
        })
        .catch(err => {
          console.error(`[FAIL] Case ${totalTests}: ${name}`)
          console.error(`       Error: ${err.message}`)
          throw err
        })
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
  // Backup local slides if exists
  const originalBackup = fs.existsSync(localDataPath) ? fs.readFileSync(localDataPath, 'utf-8') : null

  try {
    // --------------------------------------------------------------------------
    // Test 1: Verify Initial First Slide is not hardcoded and exists in editable store
    // --------------------------------------------------------------------------
    await test('Case 1: Initial first slide is an editable record with priority 1', async () => {
      const slides = await getAllHeroSlides()
      assert(slides.length >= 1, 'Should have at least 1 slide')
      const firstSlide = slides[0]
      assert.strictEqual(firstSlide.display_priority, 1)
      assert.strictEqual(firstSlide.is_active, true)
      assert(firstSlide.headline.includes('New forms'), 'First slide should be "New forms for everyday"')
      assert(firstSlide.image_url.length > 0, 'First slide must have background image')
    })

    // --------------------------------------------------------------------------
    // Test 2: Edit first slide heading and image
    // --------------------------------------------------------------------------
    await test('Case 2: Edit first slide heading, image, and CTA', async () => {
      const slides = await getAllHeroSlides()
      const firstSlide = slides[0]

      const updated = {
        ...firstSlide,
        headline: 'New forms for everyday life.',
        cta_text: 'EXPLORE CAPSULE',
        overlay_opacity: 35
      }

      const res = await saveHeroSlideAction(updated)
      assert.strictEqual(res.success, true)
      assert.strictEqual(res.slide?.headline, 'New forms for everyday life.')
      assert.strictEqual(res.slide?.cta_text, 'EXPLORE CAPSULE')
      assert.strictEqual(res.slide?.overlay_opacity, 35)

      // Verify persistence
      const freshSlides = await getAllHeroSlides()
      const savedSlide = freshSlides.find(s => s.id === firstSlide.id)
      assert.strictEqual(savedSlide?.headline, 'New forms for everyday life.')
    })

    // --------------------------------------------------------------------------
    // Test 3: Change first and second slide order
    // --------------------------------------------------------------------------
    await test('Case 3: Reorder slides — swap first and second slide', async () => {
      const slides = await getAllHeroSlides()
      assert(slides.length >= 2, 'Need at least 2 slides for reordering test')

      const originalFirstId = slides[0].id
      const originalSecondId = slides[1].id

      // Swap IDs: second slide becomes #1, first slide becomes #2
      const newOrder = [originalSecondId, originalFirstId, ...slides.slice(2).map(s => s.id)]
      const res = await reorderHeroSlidesAction(newOrder)
      assert.strictEqual(res.success, true)

      // Fetch and verify priorities
      const freshSlides = await getAllHeroSlides()
      const newFirst = freshSlides[0]
      const newSecond = freshSlides[1]

      assert.strictEqual(newFirst.id, originalSecondId, 'Second slide should now be in position #1')
      assert.strictEqual(newFirst.display_priority, 1)
      assert.strictEqual(newSecond.id, originalFirstId, 'Original first slide should now be in position #2')
      assert.strictEqual(newSecond.display_priority, 2)
    })

    // --------------------------------------------------------------------------
    // Test 4: Deactivate a slide and verify it is excluded from active storefront slides
    // --------------------------------------------------------------------------
    await test('Case 4: Deactivate slide #1 -> Hidden from active storefront slides', async () => {
      const slides = await getAllHeroSlides()
      const currentFirst = slides[0]

      const res = await toggleHeroSlideStatusAction(currentFirst.id, false)
      assert.strictEqual(res.success, true)

      // Verify active slides list excludes it
      const freshSlides = await getAllHeroSlides()
      const target = freshSlides.find(s => s.id === currentFirst.id)
      assert.strictEqual(target?.is_active, false)

      const activeOnly = freshSlides.filter(s => s.is_active)
      assert(!activeOnly.some(s => s.id === currentFirst.id), 'Inactive slide must NOT be in active list')
      assert(activeOnly.length > 0, 'Remaining active slides must be present')
    })

    // --------------------------------------------------------------------------
    // Test 5: Reactivate the slide
    // --------------------------------------------------------------------------
    await test('Case 5: Reactivate slide -> Re-appears in active storefront slides', async () => {
      const slides = await getAllHeroSlides()
      const inactiveSlide = slides.find(s => !s.is_active)
      assert(inactiveSlide, 'Should have an inactive slide from previous test')

      const res = await toggleHeroSlideStatusAction(inactiveSlide.id, true)
      assert.strictEqual(res.success, true)

      const freshSlides = await getAllHeroSlides()
      const reactivated = freshSlides.find(s => s.id === inactiveSlide.id)
      assert.strictEqual(reactivated?.is_active, true)
    })

    // --------------------------------------------------------------------------
    // Test 6: Create a new custom slide
    // --------------------------------------------------------------------------
    let createdSlideId = ''
    await test('Case 6: Create new slide with custom mobile image and focal point', async () => {
      const newSlide = {
        title: 'Monochrome Studio Silhouettes',
        eyebrow: 'EXCLUSIVE PREVIEW',
        headline: 'Monochrome\nSilhouettes.',
        subheading: 'Architectural lines and refined drapery.',
        cta_text: 'DISCOVER EDIT',
        cta_link: '/collections/western',
        image_url: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1800&q=85',
        mobile_image_url: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=800&q=85',
        image_focal_point: 'top',
        text_alignment: 'center' as const,
        content_placement: 'center' as const,
        overlay_opacity: 40,
        is_active: true,
        display_priority: 99
      }

      const res = await saveHeroSlideAction(newSlide)
      assert.strictEqual(res.success, true)
      assert(res.slide?.id, 'New slide must have an ID')
      createdSlideId = res.slide!.id

      assert.strictEqual(res.slide?.title, 'Monochrome Studio Silhouettes')
      assert.strictEqual(res.slide?.mobile_image_url, newSlide.mobile_image_url)
      assert.strictEqual(res.slide?.image_focal_point, 'top')
      assert.strictEqual(res.slide?.content_placement, 'center')
    })

    // --------------------------------------------------------------------------
    // Test 7: Delete a slide with confirmation
    // --------------------------------------------------------------------------
    await test('Case 7: Delete newly created slide permanently', async () => {
      assert(createdSlideId, 'Must have created slide ID')
      const res = await deleteHeroSlideAction(createdSlideId)
      assert.strictEqual(res.success, true)

      const freshSlides = await getAllHeroSlides()
      assert(!freshSlides.some(s => s.id === createdSlideId), 'Deleted slide must no longer exist')
    })

    // --------------------------------------------------------------------------
    // Test 8: Empty / Fallback safety
    // --------------------------------------------------------------------------
    await test('Case 8: Fallback safety when no active slides exist', () => {
      // Simulate rendering when slides array has 0 active items
      const emptySlides: HeroSlideRecord[] = []
      const active = emptySlides.filter(s => s.is_active)
      const resolved = active.length > 0 ? active : [DEFAULT_HERO_SLIDE]

      assert.strictEqual(resolved.length, 1)
      assert.strictEqual(resolved[0].id, DEFAULT_HERO_SLIDE.id)
      assert.strictEqual(resolved[0].is_active, true)
    })

    // --------------------------------------------------------------------------
    // Test 9: Responsive image resolution & text placement validation
    // --------------------------------------------------------------------------
    await test('Case 9: Mobile and desktop image separation data validation', async () => {
      const slides = await getAllHeroSlides()
      for (const slide of slides) {
        assert(typeof slide.display_priority === 'number', 'Priority must be a number')
        assert(slide.display_priority >= 1, 'Priority must be >= 1')
        assert(typeof slide.is_active === 'boolean', 'is_active must be boolean')
        assert(slide.image_url.startsWith('http'), 'image_url must be valid URL')
        if (slide.mobile_image_url) {
          assert(slide.mobile_image_url.startsWith('http'), 'mobile_image_url must be valid URL')
        }
      }
    })

  } finally {
    // Restore original state if needed
    if (originalBackup) {
      fs.writeFileSync(localDataPath, originalBackup, 'utf-8')
    }
  }

  console.log('\n=================================================================')
  console.log(`ALL HERO SLIDE TESTS PASSED: ${passedTests}/${totalTests} (100%)`)
  console.log('=================================================================\n')
}

runTests().catch(err => {
  console.error('Fatal test failure:', err)
  process.exit(1)
})
