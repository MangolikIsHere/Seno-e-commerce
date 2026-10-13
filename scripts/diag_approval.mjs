import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, serviceKey)

async function test() {
  const { data: p1 } = await supabase.from('products').select('*').eq('seller_id', '41cd4b62-5088-455a-b73f-8b4330c13f04')
  console.log('MY FASHION BOUTIQUE products:', p1)

  const { data: p2 } = await supabase.from('products').select('*').eq('seller_id', '65d8d996-fefb-4c53-af5b-7cbb4b96225c')
  console.log('New saha vareites store products:', p2)
}

test()
