const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: prod } = await supabase.from('products').select('*').eq('approval_status', 'approved').neq('seller_id', 'fb09c575-2d0c-48d8-b1ff-b7a1ead8407a').limit(1).single();
  if (!prod) {
    console.log("No approved seller product found.");
    return;
  }
  console.log("Original status:", prod.approval_status);

  // simulate seller hitting "Submit for review" without changing anything
  const { data: updated, error } = await supabase.from('products').update({
    name: prod.name,
    description: prod.description,
    price: prod.price,
    details: prod.details, // same JSONB
    approval_status: 'submitted'
  }).eq('id', prod.id).select().single();

  if (error) {
    console.error(error);
  } else {
    console.log("New status after empty update:", updated.approval_status);
  }
}
run();
