const fs = require('fs')
const path = require('path')
const assert = require('assert')

const root = path.join(__dirname, '..')

const migrationPath = path.join(root, 'supabase/migrations/20260919000000_fulfillment_lifecycle.sql')
assert.ok(fs.existsSync(migrationPath), 'Missing fulfillment lifecycle migration')

const migration = fs.readFileSync(migrationPath, 'utf8')
assert.ok(migration.includes("in_transit"), 'Migration must support in_transit lifecycle state')
assert.ok(migration.includes("out_for_delivery"), 'Migration must support out_for_delivery lifecycle state')
assert.ok(migration.includes("estimated_delivery_date"), 'Migration must support ETA date tracking')

const sellerOrdersPage = path.join(root, 'app/seller/orders/[orderId]/page.tsx')
assert.ok(fs.existsSync(sellerOrdersPage), 'Missing seller order detail page')

const customerTrackPage = path.join(root, 'app/account/orders/[id]/track/page.tsx')
assert.ok(fs.existsSync(customerTrackPage), 'Missing customer tracking page')

const sellerLib = fs.readFileSync(path.join(root, 'lib/sellers.ts'), 'utf8')
assert.ok(sellerLib.includes('getSellerOrderById'), 'Seller order detail server action missing')
assert.ok(sellerLib.includes('updateSellerOrderFulfillment'), 'Seller fulfillment update action missing')

console.log('Fulfillment workflow regression check passed.')
