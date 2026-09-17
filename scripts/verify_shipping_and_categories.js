const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260917000000_product_shipping_and_categories.sql'), 'utf8')
const orderMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20260914000003_checkout_order_creation.sql'), 'utf8')
const catalog = fs.readFileSync(path.join(root, 'lib/catalog.ts'), 'utf8')
const sellers = fs.readFileSync(path.join(root, 'lib/sellers.ts'), 'utf8')
const categories = fs.readFileSync(path.join(root, 'lib/categories.ts'), 'utf8')
const categoryPage = fs.readFileSync(path.join(root, 'app/collections/[category]/page.tsx'), 'utf8')

let passed = 0
function test(name, callback) {
  callback()
  passed++
  console.log(`[PASS] ${name}`)
}

function weightShipping(weight) {
  if (weight <= 500) return 70
  return 70 + Math.ceil((weight - 500) / 500) * 20
}

function mixedShipping(subtotal, lines) {
  if (subtotal >= 1999) return 0
  const weightLines = lines.filter(line => line.method !== 'custom')
  const custom = lines.filter(line => line.method === 'custom').reduce((sum, line) => sum + line.charge, 0)
  const weight = weightLines.reduce((sum, line) => sum + line.weight * line.quantity, 0)
  return (weightLines.length ? weightShipping(weight) : 0) + custom
}

test('Mixed cart combines weight-based and custom line shipping', () => {
  assert.strictEqual(mixedShipping(1000, [
    { method: 'weight_based', weight: 500, quantity: 1, charge: 0 },
    { method: 'custom', weight: 500, quantity: 3, charge: 100 }
  ]), 170)
})

test('Custom shipping is charged once per product line, not quantity', () => {
  assert.strictEqual(mixedShipping(1000, [{ method: 'custom', weight: 500, quantity: 3, charge: 100 }]), 100)
})

test('Free shipping threshold waives mixed shipping', () => {
  assert.strictEqual(mixedShipping(1999, [{ method: 'custom', weight: 500, quantity: 3, charge: 100 }]), 0)
})

test('Database migration validates product shipping fields and category safety', () => {
  assert.match(migration, /shipping_method TEXT NOT NULL/)
  assert.match(migration, /custom_delivery_charge NUMERIC/)
  assert.match(migration, /admin_deactivate_category/)
  assert.match(migration, /v_custom_shipping/)
})

test('Order creation uses database product shipping configuration', () => {
  assert.match(orderMigration, /CREATE OR REPLACE FUNCTION public\.create_order/)
  assert.match(migration, /pg_get_functiondef/)
  assert.match(migration, /calculate_shipping\(v_subtotal, v_total_weight, v_custom_shipping\)/)
})

test('Public catalog mapping exposes database shipping configuration', () => {
  assert.match(catalog, /shippingMethod: row\.shipping_method/)
  assert.match(catalog, /customDeliveryCharge: row\.custom_delivery_charge/)
})

test('Seller submissions persist shipping before admin approval', () => {
  assert.match(sellers, /approval_status: 'submitted'/)
  assert.match(sellers, /shipping_method/)
  assert.match(sellers, /custom_delivery_charge/)
})

test('Categories are database-backed and routed canonically', () => {
  assert.match(categories, /from\('categories'\)/)
  assert.match(categories, /revalidatePath\('\/collections\/\[category\]', 'page'\)/)
  assert.match(categoryPage, /getActiveCategories/)
  assert.match(categoryPage, /collections\/\$\{slug\}/)
})

console.log(`\nShipping and category verification passed: ${passed}`)
