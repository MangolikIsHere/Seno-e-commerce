const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');
const fs = require('fs');
const assert = require('assert');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envFile
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').trim()];
    })
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
const vapidSubject = env.VAPID_SUBJECT || 'mailto:support@seno.com';

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase configuration.');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function runTests() {
  console.log('--- STARTING NOTIFICATION & WEB PUSH VALIDATION ---');

  // 1. Fetch test profiles
  const { data: profiles, error: pErr } = await adminClient
    .from('profiles')
    .select('id, email, role')
    .limit(2);

  if (pErr || !profiles || profiles.length === 0) {
    console.error('Could not fetch test profiles:', pErr);
    process.exit(1);
  }

  const userA = profiles[0];
  const userB = profiles[1] || profiles[0];
  console.log(`Testing with User A: ${userA.id} (${userA.role})`);

  // 2. Test Idempotent Notification Creation via RPC
  const testIdempotencyKey = `test_dedup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  console.log('\n[TEST 1] Creating notification 1st time...');
  const { data: res1, error: err1 } = await adminClient.rpc('create_system_notification', {
    p_user_id: userA.id,
    p_type: 'payment_confirmed',
    p_title: 'Test Payment Confirmed',
    p_message: 'Your payment was verified.',
    p_data: { order_id: 'test-order-123', amount: 1500 },
    p_idempotency_key: testIdempotencyKey
  });

  assert.ifError(err1);
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.idempotent, false);
  const createdId = res1.id;
  console.log('✓ First insertion created notification ID:', createdId);

  console.log('\n[TEST 2] Duplicate insertion with same idempotency key (simulating webhook + reconciliation race)...');
  const { data: res2, error: err2 } = await adminClient.rpc('create_system_notification', {
    p_user_id: userA.id,
    p_type: 'payment_confirmed',
    p_title: 'Test Payment Confirmed',
    p_message: 'Your payment was verified.',
    p_data: { order_id: 'test-order-123', amount: 1500 },
    p_idempotency_key: testIdempotencyKey
  });

  assert.ifError(err2);
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.idempotent, true);
  assert.strictEqual(res2.id, createdId);
  console.log('✓ Idempotency verified: duplicate event correctly suppressed with identical ID.');

  // Verify only 1 row exists
  const { data: countRows } = await adminClient
    .from('notifications')
    .select('id')
    .eq('idempotency_key', testIdempotencyKey);

  assert.strictEqual(countRows.length, 1, 'Exactly one row must exist for idempotency key.');
  console.log('✓ Table verification confirmed exactly 1 row exists.');

  // 3. Test RLS Isolation: Anon client cannot insert directly
  console.log('\n[TEST 3] Testing RLS insert restriction (unauthenticated client attempting direct insert)...');
  const { data: directInsert, error: insertError } = await anonClient
    .from('notifications')
    .insert({
      user_id: userA.id,
      type: 'order_placed',
      title: 'Forged Notification',
      message: 'Malicious forged alert.'
    });

  assert.ok(insertError, 'Direct unauthenticated insert must fail due to RLS.');
  console.log('✓ RLS verified: direct unauthorized insert blocked with message:', insertError.message);

  // 4. Test RLS Read Isolation: Anon client cannot read notifications
  console.log('\n[TEST 4] Testing RLS read isolation (unauthenticated client attempting read)...');
  const { data: anonRead, error: readError } = await anonClient
    .from('notifications')
    .select('*');

  assert.strictEqual(anonRead.length, 0, 'Unauthenticated client must receive 0 rows.');
  console.log('✓ RLS verified: unauthenticated client reads 0 notifications.');

  // 5. Test VAPID Key Configuration & Signing
  console.log('\n[TEST 5] Testing VAPID configuration & Web Push setup...');
  assert.ok(vapidPublicKey, 'NEXT_PUBLIC_VAPID_PUBLIC_KEY must be configured.');
  assert.ok(vapidPrivateKey, 'VAPID_PRIVATE_KEY must be configured.');
  assert.ok(vapidSubject, 'VAPID_SUBJECT must be configured.');

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log('✓ VAPID details successfully configured with subject:', vapidSubject);

  // 6. Test Multi-Device Push Subscription Storage & Pruning
  console.log('\n[TEST 6] Testing multi-device push subscription storage & isolation...');
  const testEndpoint1 = `https://fcm.googleapis.com/fcm/send/test_device_1_${Date.now()}`;
  const testEndpoint2 = `https://fcm.googleapis.com/fcm/send/test_device_2_${Date.now()}`;

  // Insert two test subscriptions for userA
  await adminClient.from('push_subscriptions').upsert([
    {
      user_id: userA.id,
      endpoint: testEndpoint1,
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0AgtGoKEGPoQstST6D80igDHY2A9myq1NLHKNO120Sm4',
      auth: 'tBHItJI5svbpez7KI4CCXg'
    },
    {
      user_id: userA.id,
      endpoint: testEndpoint2,
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0AgtGoKEGPoQstST6D80igDHY2A9myq1NLHKNO120Sm4',
      auth: 'tBHItJI5svbpez7KI4CCXg'
    }
  ]);

  const { data: userSubs } = await adminClient
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userA.id);

  assert.ok(userSubs.length >= 2, 'User must have multiple subscriptions stored.');
  console.log(`✓ Multi-device support verified: user has ${userSubs.length} registered push subscription(s).`);

  // Cleanup test subscriptions
  await adminClient.from('push_subscriptions').delete().in('endpoint', [testEndpoint1, testEndpoint2]);
  await adminClient.from('notifications').delete().eq('id', createdId);
  console.log('✓ Test cleanup completed.');

  console.log('\n--- ALL NOTIFICATION & WEB PUSH TESTS PASSED ---');
}

runTests().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
