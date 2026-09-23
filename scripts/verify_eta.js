require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('order_items').select('estimated_delivery_date').limit(1);
  if (error) {
    if (error.code === 'PGRST204' || error.message.includes('Could not find')) {
      console.log('COLUMN_MISSING_IN_CACHE_OR_DB:', error.message);
    } else {
      console.log('ERROR:', error.message);
    }
  } else {
    console.log('COLUMN_EXISTS:', data);
  }
}
main();
