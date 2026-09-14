-- Insert the default SENO platform seller if it doesn't already exist
INSERT INTO public.sellers (
  store_name,
  slug,
  seller_type,
  seller_status
) VALUES (
  'SENO',
  'seno-official',
  'platform',
  'approved'
)
ON CONFLICT (slug) DO NOTHING;
