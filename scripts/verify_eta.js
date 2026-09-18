require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
