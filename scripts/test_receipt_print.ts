import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PrintableReceipt } from '../components/receipt/PrintableReceipt'

console.log('--- STARTING SENO ADMIN RECEIPT PRINT VERIFICATION TEST SUITE ---')

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

// Sample realistic order from Platform Orders
const mockAdminOrder = {
  id: 'ord_12345678-abcd',
  order_number: 'SENO-2026-9876',
  created_at: '2026-10-28T14:30:00.000Z',
  status: 'processing',
  payment_status: 'paid',
  payment_method: 'Razorpay UPI',
  razorpay_payment_id: 'pay_ABCxyz123',
  subtotal_amount: 3500.00,
  discount_amount: 500.00,
  shipping_amount: 60.00,
  total_amount: 3060.00,
  promotion_code: 'FESTIVE500',
  promotion_snapshot: {
    coupon_code: 'FESTIVE500',
    discount_label: 'Festive Luxury ₹500 Off'
  },
  profiles: {
    full_name: 'Ananya Roy',
    email: 'ananya.roy@example.com',
    phone: '+91 98300 98300'
  },
  shipping_address: {
    recipient_name: 'Ananya Roy',
    phone: '+91 98300 98300',
    address_line1: '45 Ballygunge Circular Road',
    address_line2: 'Apartment 7B',
    landmark: 'Opposite South Point High School',
    city: 'Kolkata',
    state: 'West Bengal',
    postal_code: '700019',
    country: 'India'
  },
  order_items: [
    {
      id: 'item_1',
      product_name: 'Nocturne Silk Velvet Cape',
      sku: 'SENO-NSVC-BLK-M',
      quantity: 1,
      unit_price: 3500.00,
      total_amount: 3500.00,
      variant_details: {
        size: 'Medium',
        colour: 'Obsidian Black'
      },
      seller: {
        brand_name: 'Maison SENO Studio'
      }
    }
  ]
}

async function runTests() {
  // 1. A4 Format Content Integrity
  test('Case 1: A4 Printable Receipt contains all required branding, line items & financials', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrintableReceipt, {
        order: mockAdminOrder,
        format: 'a4',
        audience: 'admin'
      })
    )

    // Branding
    assert.strictEqual(html.includes('SENO'), true, 'Must include SENO brand name')
    assert.strictEqual(html.includes('Official Order Receipt'), true, 'Must include official receipt header')

    // Order number & date
    assert.strictEqual(html.includes('SENO-2026-9876'), true, 'Must include order number')
    assert.strictEqual(html.includes('October'), true, 'Must include formatted date')

    // Statuses
    assert.strictEqual(html.includes('PROCESSING'), true, 'Must display humanized order status')
    assert.strictEqual(html.includes('PAID'), true, 'Must display payment status')
    assert.strictEqual(html.includes('Razorpay UPI'), true, 'Must display payment method')

    // Customer & delivery address
    assert.strictEqual(html.includes('Ananya Roy'), true, 'Must include customer name')
    assert.strictEqual(html.includes('45 Ballygunge Circular Road'), true, 'Must include address line 1')
    assert.strictEqual(html.includes('Apartment 7B'), true, 'Must include address line 2')
    assert.strictEqual(html.includes('Opposite South Point High School'), true, 'Must include landmark')
    assert.strictEqual(html.includes('700019'), true, 'Must include postal code')

    // Line items
    assert.strictEqual(html.includes('Nocturne Silk Velvet Cape'), true, 'Must include product name')
    assert.strictEqual(html.includes('SENO-NSVC-BLK-M'), true, 'Must include SKU')
    assert.strictEqual(html.includes('Medium'), true, 'Must include size variant')
    assert.strictEqual(html.includes('Obsidian Black'), true, 'Must include colour variant')

    // Financial breakdown
    assert.strictEqual(html.includes('FESTIVE500'), true, 'Must include promo code')
    assert.strictEqual(html.includes('3,500'), true, 'Must include formatted subtotal')
    assert.strictEqual(html.includes('500'), true, 'Must include formatted discount')
    assert.strictEqual(html.includes('3,060'), true, 'Must include formatted total amount')
  })

  // 2. Compact 80mm Format Content Integrity
  test('Case 2: Compact 80mm format includes receipt metadata and 80mm container class', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrintableReceipt, {
        order: mockAdminOrder,
        format: 'compact',
        audience: 'admin'
      })
    )

    assert.strictEqual(html.includes('seno-receipt-compact'), true, 'Must include compact class')
    assert.strictEqual(html.includes('SENO-2026-9876'), true, 'Must include order number')
    assert.strictEqual(html.includes('Nocturne Silk Velvet Cape'), true, 'Must include product name')
    assert.strictEqual(html.includes('Opposite South Point High School'), true, 'Must include landmark')
    assert.strictEqual(html.includes('PAID'), true, 'Must include payment status')
  })

  // 3. CSS Print Rule Verification: backdrop is NOT display:none
  test('Case 3: app/globals.css @media print does NOT set .receipt-modal-backdrop to display:none', () => {
    let cssPath = path.resolve('app/globals.css')
    if (!fs.existsSync(cssPath)) cssPath = path.resolve('seno-e-commerce-store/app/globals.css')
    const css = fs.readFileSync(cssPath, 'utf8')

    const printMediaIdx = css.indexOf('@media print')
    assert.notStrictEqual(printMediaIdx, -1, '@media print block must exist')
    const printBlock = css.substring(printMediaIdx)

    // Check that .receipt-modal-backdrop is NOT under display: none
    const displayNoneSection = printBlock.substring(
      printBlock.indexOf('.no-print,'),
      printBlock.indexOf('display: none !important;')
    )
    assert.strictEqual(
      displayNoneSection.includes('.receipt-modal-backdrop'),
      false,
      '.receipt-modal-backdrop must NOT be in display:none list'
    )

    // Check that .receipt-modal-backdrop is made transparent and unconstrained
    assert.strictEqual(
      printBlock.includes('.receipt-modal-backdrop {'),
      true,
      'Must have dedicated .receipt-modal-backdrop print rule'
    )
    assert.strictEqual(
      printBlock.includes('position: static !important;'),
      true,
      'Backdrop must be static in print'
    )
  })

  // 4. CSS Print Rule Verification: Underlying page elements eradicated via body.receipt-modal-open
  test('Case 4: app/globals.css @media print eliminates underlying admin page via body.receipt-modal-open', () => {
    let cssPath = path.resolve('app/globals.css')
    if (!fs.existsSync(cssPath)) cssPath = path.resolve('seno-e-commerce-store/app/globals.css')
    const css = fs.readFileSync(cssPath, 'utf8')

    assert.strictEqual(
      css.includes('body.receipt-modal-open > *:not(.receipt-modal-backdrop)'),
      true,
      'Must eradicate non-modal root elements during receipt modal printing'
    )
  })

  // 5. ReceiptModal portal & isolated iframe printing verification
  test('Case 5: ReceiptModal uses createPortal and isolated iframe for print execution', () => {
    let modalPath = path.resolve('components/receipt/ReceiptModal.tsx')
    if (!fs.existsSync(modalPath)) modalPath = path.resolve('seno-e-commerce-store/components/receipt/ReceiptModal.tsx')
    const code = fs.readFileSync(modalPath, 'utf8')

    // createPortal
    assert.strictEqual(code.includes('createPortal'), true, 'Must use createPortal')
    assert.strictEqual(code.includes('createPortal(modalContent, document.body)'), true, 'Must portal to document.body')

    // Body class isolation
    assert.strictEqual(code.includes("document.body.classList.add('receipt-modal-open')"), true, 'Must add receipt-modal-open class')
    assert.strictEqual(code.includes("document.body.classList.remove('receipt-modal-open')"), true, 'Must remove receipt-modal-open class on close')

    // Iframe print routine
    assert.strictEqual(code.includes("document.createElement('iframe')"), true, 'Must create isolated print iframe')
    assert.strictEqual(code.includes('iframe.contentWindow?.print()'), true, 'Must call print on iframe window')
    assert.strictEqual(code.includes('SENO-Receipt-'), true, 'Must set clean PDF document title on iframe')
  })

  console.log(`\n--- ALL RECEIPT PRINT TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED ---`)
  if (failed > 0) {
    process.exit(1)
  }
}

runTests()
