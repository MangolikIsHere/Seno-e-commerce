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

async function runAudit() {
  console.log('--- STARTING AUDIT ---')

  // Fetch all orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: true })

  if (ordersError) {
    console.error('Error fetching orders:', ordersError)
    return
  }

  // Fetch all order items
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('id, order_id, seller_id, product_name, variant_id')

  if (itemsError) {
    console.error('Error fetching order items:', itemsError)
    return
  }

  // Fetch payment events
  const { data: paymentEvents, error: eventsError } = await supabase
    .from('payment_events')
    .select('id, order_id, event_type')

  if (eventsError && eventsError.code !== '42P01') {
    console.error('Error fetching payment events:', eventsError)
  }

  // Fetch all users to map customer_id to email
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError) {
    console.error('Error fetching users:', usersError)
    return
  }

  const userMap = {}
  users.forEach(u => { userMap[u.id] = u.email })

  // Find admins
  const { data: adminData } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
  
  const adminIds = adminData ? adminData.map(a => a.id) : []

  console.log(`Found ${orders.length} orders total.\n`)

  for (const order of orders) {
    const items = orderItems.filter(i => i.order_id === order.id)
    const customerEmail = userMap[order.customer_id] || 'Unknown'
    const isAdmin = adminIds.includes(order.customer_id)
    
    const isLikelyTest = isAdmin || customerEmail.includes('test') || customerEmail.includes('demo')
    const reason = isLikelyTest ? (isAdmin ? 'Customer is an Admin' : 'Customer email looks like test') : 'Real Order'

    const sellers = Array.from(new Set(items.map(i => i.seller_id)))
    const sellerEmails = sellers.map(s => userMap[s] || 'Unknown')

    console.log(`Order ID: ${order.id} | ${order.order_number}`)
    console.log(`Created: ${order.created_at}`)
    console.log(`Customer: ${customerEmail} (ID: ${order.customer_id}) ${isAdmin ? '[ADMIN]' : ''}`)
    console.log(`Status: ${order.status} | Payment: ${order.payment_status}`)
    console.log(`RZP Order Ref: ${order.razorpay_order_id || 'N/A'}`)
    console.log(`Payment Ref: ${order.payment_reference || 'N/A'}`)
    console.log(`Sellers involved: ${sellerEmails.join(', ')}`)
    console.log(`Is Test?: ${isLikelyTest ? 'YES - ' + reason : 'NO - ' + reason}`)
    console.log(`Dependent items: ${items.length} order_item(s)`)
    const orderPaymentEvents = (paymentEvents || []).filter(e => e.order_id === order.id)
    console.log(`Dependent payment events: ${orderPaymentEvents.length} event(s) (${orderPaymentEvents.map(e => e.event_type).join(', ')})`)
    console.log('----------------------------------------------------')
  }

}

runAudit().catch(console.error)
