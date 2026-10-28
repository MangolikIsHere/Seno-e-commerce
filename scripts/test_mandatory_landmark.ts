import assert from 'node:assert'
import { createAddress, updateAddress, Address, AddressInput } from '../lib/addresses'
import { OrderAddress } from '../lib/orders'

console.log('--- STARTING SENO MANDATORY LANDMARK VERIFICATION TEST SUITE ---')

let passed = 0
let failed = 0

function test(description: string, fn: () => void | Promise<void>) {
  try {
    const res = fn()
    if (res instanceof Promise) {
      return res
        .then(() => {
          console.log(`[PASS] ${description}`)
          passed++
        })
        .catch(err => {
          console.error(`[FAIL] ${description}`)
          console.error(err)
          failed++
        })
    }
    console.log(`[PASS] ${description}`)
    passed++
  } catch (err) {
    console.error(`[FAIL] ${description}`)
    console.error(err)
    failed++
  }
}

async function runTests() {
  // 1. Validation test: Empty landmark rejected
  await test('Case 1: createAddress rejects empty landmark', async () => {
    let errorThrown = false
    try {
      await createAddress('test-user-id', {
        recipient_name: 'Deb Roy',
        phone: '9876543210',
        address_line1: '123 Fashion Ave',
        address_line2: 'Apt 4B',
        landmark: '',
        city: 'Kolkata',
        state: 'West Bengal',
        postal_code: '700001',
        country: 'India',
        is_default: false
      })
    } catch (e: any) {
      errorThrown = true
      assert.strictEqual(
        e.message,
        'Please enter a nearby landmark to help locate your address.'
      )
    }
    assert.strictEqual(errorThrown, true, 'Should have thrown landmark error')
  })

  // 2. Validation test: Whitespace-only landmark rejected
  await test('Case 2: createAddress rejects whitespace-only landmark', async () => {
    let errorThrown = false
    try {
      await createAddress('test-user-id', {
        recipient_name: 'Deb Roy',
        phone: '9876543210',
        address_line1: '123 Fashion Ave',
        address_line2: 'Apt 4B',
        landmark: '     \t  \n  ',
        city: 'Kolkata',
        state: 'West Bengal',
        postal_code: '700001',
        country: 'India',
        is_default: false
      })
    } catch (e: any) {
      errorThrown = true
      assert.strictEqual(
        e.message,
        'Please enter a nearby landmark to help locate your address.'
      )
    }
    assert.strictEqual(errorThrown, true, 'Should have thrown landmark error on whitespace')
  })

  // 3. Validation test: updateAddress rejects whitespace-only landmark
  await test('Case 3: updateAddress rejects whitespace-only landmark', async () => {
    let errorThrown = false
    try {
      await updateAddress('test-user-id', 'addr-123', {
        recipient_name: 'Deb Roy',
        phone: '9876543210',
        address_line1: '123 Fashion Ave',
        address_line2: 'Apt 4B',
        landmark: '   ',
        city: 'Kolkata',
        state: 'West Bengal',
        postal_code: '700001',
        country: 'India',
        is_default: false
      })
    } catch (e: any) {
      errorThrown = true
      assert.strictEqual(
        e.message,
        'Please enter a nearby landmark to help locate your address.'
      )
    }
    assert.strictEqual(errorThrown, true, 'Should have thrown landmark error on whitespace update')
  })

  // 4. OrderAddress typing and snapshot structure
  test('Case 4: OrderAddress contract correctly requires or includes landmark', () => {
    const validOrderAddress: OrderAddress = {
      recipient_name: 'Ananya Sen',
      phone: '9830098300',
      address_line1: '45 Park Street',
      address_line2: 'Suite 201',
      landmark: 'Near SBI Main Branch',
      city: 'Kolkata',
      state: 'West Bengal',
      postal_code: '700016',
      country: 'India'
    }

    assert.strictEqual(validOrderAddress.landmark, 'Near SBI Main Branch')
    assert.strictEqual(validOrderAddress.recipient_name, 'Ananya Sen')
  })

  // 5. Checkout validation logic simulation for legacy address without landmark
  test('Case 5: Legacy saved address without landmark requires landmark before checkout', () => {
    const legacySavedAddress: Address = {
      id: 'legacy-addr-1',
      user_id: 'user-1',
      recipient_name: 'Priya Sharma',
      phone: '9876543210',
      address_line1: 'Flat 302, Green Valley Apartments',
      address_line2: 'Phase 1',
      landmark: null, // Legacy address with no landmark
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560001',
      country: 'India',
      is_default: true,
      created_at: new Date().toISOString()
    }

    // Customer selects this address at checkout without entering landmark
    let selectedLandmarkInput = ''
    let canProceedToCheckout = Boolean(
      legacySavedAddress.landmark?.trim() || selectedLandmarkInput.trim()
    )
    assert.strictEqual(canProceedToCheckout, false, 'Should block checkout when landmark is missing')

    // Customer provides landmark in the inline prompt
    selectedLandmarkInput = 'Opposite City Hospital'
    canProceedToCheckout = Boolean(
      legacySavedAddress.landmark?.trim() || selectedLandmarkInput.trim()
    )
    assert.strictEqual(canProceedToCheckout, true, 'Should allow checkout once landmark is provided')

    // Resolved payload to placeOrderAction
    const resolvedPayload: OrderAddress = {
      recipient_name: legacySavedAddress.recipient_name,
      phone: legacySavedAddress.phone,
      address_line1: legacySavedAddress.address_line1,
      address_line2: legacySavedAddress.address_line2,
      landmark: selectedLandmarkInput.trim(),
      city: legacySavedAddress.city,
      state: legacySavedAddress.state,
      postal_code: legacySavedAddress.postal_code,
      country: legacySavedAddress.country
    }
    assert.strictEqual(resolvedPayload.landmark, 'Opposite City Hospital')
  })

  // 6. Formatting & Display checks for receipts, order details, and invoices
  test('Case 6: Order display snapshot includes landmark alongside address lines', () => {
    const orderSnapshot: OrderAddress = {
      recipient_name: 'Rahul Bose',
      phone: '9812345678',
      address_line1: '12 Alipore Road',
      address_line2: 'Block B, 3rd Floor',
      landmark: 'Near National Library',
      city: 'Kolkata',
      state: 'West Bengal',
      postal_code: '700027',
      country: 'India'
    }

    // Simulate formatting as done in PrintableReceipt & Order Dossier
    const formattedAddressLines = [
      `${orderSnapshot.address_line1}${orderSnapshot.address_line2 ? `, ${orderSnapshot.address_line2}` : ''}`,
      orderSnapshot.landmark ? `Landmark: ${orderSnapshot.landmark}` : null,
      `${orderSnapshot.city}, ${orderSnapshot.state} ${orderSnapshot.postal_code}`,
      orderSnapshot.country
    ].filter(Boolean)

    assert.strictEqual(
      formattedAddressLines[1],
      'Landmark: Near National Library',
      'Landmark must be formatted as second block'
    )
  })

  // 7. Migration file validation
  test('Case 7: Migration file exists and defines safe nullable column', () => {
    const fs = require('fs')
    const path = require('path')
    let migrationPath = path.resolve('supabase/migrations/20261029000000_add_landmark_to_addresses.sql')
    if (!fs.existsSync(migrationPath)) {
      migrationPath = path.resolve('seno-e-commerce-store/supabase/migrations/20261029000000_add_landmark_to_addresses.sql')
    }
    assert.strictEqual(fs.existsSync(migrationPath), true, 'Migration file must exist')
    const content = fs.readFileSync(migrationPath, 'utf8')
    assert.strictEqual(content.includes('ADD COLUMN IF NOT EXISTS landmark TEXT'), true, 'Must add landmark TEXT safely')
    assert.strictEqual(content.includes('NOT NULL'), false, 'Must not be NOT NULL to avoid breaking legacy rows')
  })

  console.log(`\n--- TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED ---`)
  if (failed > 0) {
    process.exit(1)
  }
}

runTests()
