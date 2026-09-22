import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanup() {
  console.log('--- STARTING CLEANUP OF TEST ORDERS ---')

  // The 11 orders found in the audit
  const orderIds = [
    '24713bbd-d86c-4f4e-b481-f75979c5118a',
    'ae342491-551b-43dd-8ba0-ab7dbfba9e8f',
    'd7bd182b-316f-4c11-8bcf-c4dad199189e',
    '6839406c-07eb-4e28-92df-b3867008ed4c',
    '4dbd3c51-dc44-4834-af10-9cd2c09f5118',
    '9d0e19e9-a2ab-44f3-ad1c-842e25f51ade',
    '4161fb9d-6dfd-4766-b6ca-e0df399c5d98',
    'a39b3f37-591f-4fb8-9c6a-41ba35611c10',
    '3cdd1648-db0e-4a87-b744-0cb16c779494',
    'dc1643fd-3219-4ac0-b2eb-c4de71a40b59',
    '2c2c2b44-671c-43c9-bc59-937bab7365b8'
  ]

  for (const orderId of orderIds) {
    console.log(`Processing Order ID: ${orderId}`)
    
    // 1. Fetch order
    const { data: order, error: orderErr } = await supabase.from('orders').select('id, payment_status, status').eq('id', orderId).single()
    if (orderErr) {
      console.error(`  Error fetching order ${orderId}: ${orderErr.message}`)
      continue
    }

    // 2. If paid/confirmed, restore inventory manually
    if (order.payment_status === 'paid' || order.status === 'confirmed') {
      const { data: items, error: itemsErr } = await supabase.from('order_items').select('variant_id, quantity').eq('order_id', orderId)
      if (itemsErr) {
        console.error(`  Error fetching items for order ${orderId}: ${itemsErr.message}`)
        continue
      }
      
      for (const item of items) {
        if (!item.variant_id) continue;
        
        // Fetch current inventory
        const { data: inv, error: invErr } = await supabase.from('inventory').select('quantity').eq('variant_id', item.variant_id).single()
        if (invErr) {
          console.error(`  Error fetching inventory for variant ${item.variant_id}: ${invErr.message}`)
          continue
        }
        
        const newQty = inv.quantity + item.quantity
        const { error: updateErr } = await supabase.from('inventory').update({ quantity: newQty }).eq('variant_id', item.variant_id)
        if (updateErr) {
          console.error(`  Error updating inventory for variant ${item.variant_id}: ${updateErr.message}`)
          continue
        }
        
        console.log(`  Restored ${item.quantity} stock for variant ${item.variant_id}. New stock: ${newQty}`)
      }
    }

    // 3. Delete dependent records
    const { error: evErr } = await supabase.from('payment_events').delete().eq('order_id', orderId)
    if (evErr) console.error(`  Error deleting payment_events: ${evErr.message}`)
    else console.log(`  Deleted payment_events.`)

    const { error: oiErr } = await supabase.from('order_items').delete().eq('order_id', orderId)
    if (oiErr) console.error(`  Error deleting order_items: ${oiErr.message}`)
    else console.log(`  Deleted order_items.`)

    const { error: delOrderErr } = await supabase.from('orders').delete().eq('id', orderId)
    if (delOrderErr) console.error(`  Error deleting order: ${delOrderErr.message}`)
    else console.log(`  Deleted order ${orderId} successfully.`)

    console.log('----------------------------------------------------')
  }

  console.log('CLEANUP COMPLETE.')
}

cleanup().catch(console.error)
