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

async function testConfig() {
  // Try to inspect the identities of existing users
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('Error fetching users:', error)
    return
  }

  console.log(`Total users: ${users.length}`)
  const emailCounts = {}
  users.forEach(u => {
    emailCounts[u.email] = (emailCounts[u.email] || 0) + 1
  })

  const duplicates = Object.keys(emailCounts).filter(e => emailCounts[e] > 1)
  console.log(`Emails with multiple users:`, duplicates)
  
  // Also check a random user to see the identities array
  if (users.length > 0) {
    console.log('Sample user identities:', JSON.stringify(users[0].identities, null, 2))
  }
}

testConfig().catch(console.error)
