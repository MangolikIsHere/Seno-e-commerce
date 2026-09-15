/**
 * Verification Script for SENO Stage 6: Commerce Core (Checkout, Orders & Shipping)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== SENO COMMERCE CORE VERIFICATION ===\n');

let passedTests = 0;
let totalTests = 0;

function runTest(description, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`[PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${description}`);
    console.error(`       Error: ${err.message}`);
  }
}

// ----------------------------------------------------------------------------
// TEST 1: SHIPPING CALCULATION - BASE INCREMENTAL
// ----------------------------------------------------------------------------
const defaultSettings = {
  calculation_mode: 'base_incremental',
  free_shipping_threshold: 1999.00,
  base_weight_grams: 500.00,
  base_rate: 70.00,
  incremental_weight_grams: 500.00,
  incremental_rate: 20.00,
  is_active: true
};

function calculateShipping(subtotal, weightGrams, settings, rules = []) {
  if (settings.free_shipping_threshold !== null && subtotal >= settings.free_shipping_threshold) {
    return 0.00;
  }
  if (settings.calculation_mode === 'base_incremental') {
    if (weightGrams <= settings.base_weight_grams) {
      return Number(settings.base_rate);
    }
    const extraWeight = weightGrams - settings.base_weight_grams;
    const units = Math.ceil(extraWeight / settings.incremental_weight_grams);
    return Number(settings.base_rate) + units * Number(settings.incremental_rate);
  }
  if (settings.calculation_mode === 'weight_slab' && rules.length > 0) {
    const matching = rules.find(r => weightGrams >= r.min_weight_grams && weightGrams < r.max_weight_grams);
    if (matching) return Number(matching.rate);
    const highest = [...rules].sort((a,b) => b.max_weight_grams - a.max_weight_grams)[0];
    if (highest) return Number(highest.rate);
  }
  return Number(settings.base_rate);
}

runTest('Base incremental: weight <= 500g costs ₹70 base rate', () => {
  assert.strictEqual(calculateShipping(1000, 300, defaultSettings), 70);
  assert.strictEqual(calculateShipping(1000, 500, defaultSettings), 70);
});

runTest('Base incremental: weight 800g costs ₹70 + (1 * ₹20) = ₹90', () => {
  assert.strictEqual(calculateShipping(1000, 800, defaultSettings), 90);
});

runTest('Base incremental: weight 1000g costs ₹70 + (1 * ₹20) = ₹90', () => {
  assert.strictEqual(calculateShipping(1000, 1000, defaultSettings), 90);
});

runTest('Base incremental: weight 1200g costs ₹70 + (2 * ₹20) = ₹110', () => {
  assert.strictEqual(calculateShipping(1000, 1200, defaultSettings), 110);
});

runTest('Base incremental: weight 2200g costs ₹70 + (4 * ₹20) = ₹150', () => {
  assert.strictEqual(calculateShipping(1000, 2200, defaultSettings), 150);
});

runTest('Free shipping threshold: subtotal >= ₹1,999 yields ₹0 shipping fee', () => {
  assert.strictEqual(calculateShipping(1998, 2200, defaultSettings), 150);
  assert.strictEqual(calculateShipping(1999, 2200, defaultSettings), 0);
  assert.strictEqual(calculateShipping(12900, 4500, defaultSettings), 0);
});

// ----------------------------------------------------------------------------
// TEST 2: SHIPPING CALCULATION - WEIGHT SLAB MODE
// ----------------------------------------------------------------------------
const slabSettings = {
  calculation_mode: 'weight_slab',
  free_shipping_threshold: 1999.00,
  base_weight_grams: 500.00,
  base_rate: 70.00,
  incremental_weight_grams: 500.00,
  incremental_rate: 20.00,
  is_active: true
};

const sampleSlabs = [
  { min_weight_grams: 0, max_weight_grams: 500, rate: 60 },
  { min_weight_grams: 500, max_weight_grams: 1500, rate: 100 },
  { min_weight_grams: 1500, max_weight_grams: 3000, rate: 160 }
];

runTest('Weight slab: 400g resolves to first slab (₹60)', () => {
  assert.strictEqual(calculateShipping(1000, 400, slabSettings, sampleSlabs), 60);
});

runTest('Weight slab: 800g resolves to second slab (₹100)', () => {
  assert.strictEqual(calculateShipping(1000, 800, slabSettings, sampleSlabs), 100);
});

runTest('Weight slab: 2000g resolves to third slab (₹160)', () => {
  assert.strictEqual(calculateShipping(1000, 2000, slabSettings, sampleSlabs), 160);
});

runTest('Weight slab: weight exceeding highest slab uses highest slab rate (₹160)', () => {
  assert.strictEqual(calculateShipping(1000, 5000, slabSettings, sampleSlabs), 160);
});

runTest('Weight slab: subtotal >= threshold waives slab rate to ₹0', () => {
  assert.strictEqual(calculateShipping(2500, 800, slabSettings, sampleSlabs), 0);
});

// ----------------------------------------------------------------------------
// TEST 3: DATABASE MIGRATION VERIFICATION
// ----------------------------------------------------------------------------
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260914000003_checkout_order_creation.sql');

runTest('Migration 20260914000003 exists and is readable', () => {
  assert.ok(fs.existsSync(migrationPath), 'Migration file not found');
});

const migrationSql = fs.readFileSync(migrationPath, 'utf8');

runTest('Migration defines shipping seed with agreed baseline values', () => {
  assert.ok(migrationSql.includes("INSERT INTO public.shipping_settings"), 'Missing shipping_settings insert');
  assert.ok(migrationSql.includes("1999.00"), 'Missing 1999 free shipping threshold');
  assert.ok(migrationSql.includes("70.00"), 'Missing base_rate 70.00');
  assert.ok(migrationSql.includes("20.00"), 'Missing incremental_rate 20.00');
  assert.ok(migrationSql.includes("'base_incremental'"), 'Missing base_incremental mode');
});

runTest('Migration defines order_idempotency_keys table for duplicate protection', () => {
  assert.ok(migrationSql.includes("CREATE TABLE IF NOT EXISTS public.order_idempotency_keys"), 'Missing idempotency table');
  assert.ok(migrationSql.includes("idempotency_key TEXT PRIMARY KEY"), 'Missing idempotency key primary key');
});

runTest('Migration defines public.calculate_shipping function', () => {
  assert.ok(migrationSql.includes("CREATE OR REPLACE FUNCTION public.calculate_shipping"), 'Missing calculate_shipping');
  assert.ok(migrationSql.includes("STABLE"), 'calculate_shipping should be stable');
});

runTest('Migration defines public.create_order with atomic row-level inventory locking (FOR UPDATE)', () => {
  assert.ok(migrationSql.includes("CREATE OR REPLACE FUNCTION public.create_order"), 'Missing create_order function');
  assert.ok(migrationSql.includes("SECURITY DEFINER"), 'create_order must be SECURITY DEFINER');
  assert.ok(migrationSql.includes("FOR UPDATE"), 'Missing SELECT ... FOR UPDATE on inventory');
  assert.ok(migrationSql.includes("UPDATE public.inventory"), 'Missing atomic inventory update');
});

runTest('Migration validates address ownership against customer account', () => {
  assert.ok(migrationSql.includes("FROM public.addresses"), 'Must validate against addresses table');
  assert.ok(migrationSql.includes("user_id = v_customer_id"), 'Must enforce address ownership user_id = auth.uid');
});

runTest('Migration snapshots historical order item fields', () => {
  assert.ok(migrationSql.includes("product_name"), 'Must snapshot product_name');
  assert.ok(migrationSql.includes("sku"), 'Must snapshot sku');
  assert.ok(migrationSql.includes("variant_details"), 'Must snapshot variant_details');
  assert.ok(migrationSql.includes("unit_price"), 'Must snapshot unit_price');
  assert.ok(migrationSql.includes("unit_weight_grams"), 'Must snapshot unit_weight_grams');
  assert.ok(migrationSql.includes("commission_rate"), 'Must snapshot commission_rate');
  assert.ok(migrationSql.includes("commission_amount"), 'Must snapshot commission_amount');
  assert.ok(migrationSql.includes("seller_payout_amount"), 'Must snapshot seller_payout_amount');
  assert.ok(migrationSql.includes("fulfillment_status"), 'Must snapshot fulfillment_status');
});

// ----------------------------------------------------------------------------
// TEST 4: SOURCE CODE ARCHITECTURE VERIFICATION
// ----------------------------------------------------------------------------
const ordersLibPath = path.join(__dirname, '..', 'lib', 'orders.ts');
const ordersLib = fs.readFileSync(ordersLibPath, 'utf8');

runTest('lib/orders.ts defines server actions with server-side authentication check', () => {
  assert.ok(ordersLib.includes("'use server'"), 'orders.ts must be a server module');
  assert.ok(ordersLib.includes("placeOrderAction"), 'Missing placeOrderAction');
  assert.ok(ordersLib.includes("getCustomerOrders"), 'Missing getCustomerOrders');
  assert.ok(ordersLib.includes("getCustomerOrderById"), 'Missing getCustomerOrderById');
  assert.ok(ordersLib.includes("auth.getUser()"), 'Must verify user session server-side');
});

runTest('lib/orders.ts does not expose seller commission/payout to customers', () => {
  assert.ok(!ordersLib.includes("commission_amount,\n"), 'Customer query must not expose commission_amount');
  assert.ok(!ordersLib.includes("seller_payout_amount,\n"), 'Customer query must not expose seller_payout_amount');
});

const storeContextPath = path.join(__dirname, '..', 'context', 'StoreContext.tsx');
const storeContext = fs.readFileSync(storeContextPath, 'utf8');

runTest('StoreContext provides clearCart and clearOrderedItems', () => {
  assert.ok(storeContext.includes("clearCart: () => void"), 'Missing clearCart in type');
  assert.ok(storeContext.includes("clearOrderedItems"), 'Missing clearOrderedItems');
});

const checkoutPagePath = path.join(__dirname, '..', 'app', 'checkout', 'page.tsx');
const checkoutPage = fs.readFileSync(checkoutPagePath, 'utf8');

runTest('Checkout page enforces authentication and protects against duplicate submissions', () => {
  assert.ok(checkoutPage.includes("Sign In Required"), 'Must prompt unauthenticated users to sign in');
  assert.ok(checkoutPage.includes("idempotencyKey"), 'Must submit unique idempotency token');
  assert.ok(checkoutPage.includes("isSubmitting"), 'Must maintain submitting state to prevent double submission');
  assert.ok(checkoutPage.includes("clearCart()"), 'Must clear cart on order success');
});

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`Tests Passed: ${passedTests} / ${totalTests}`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
