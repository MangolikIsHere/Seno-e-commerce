-- Keep category cover imagery in the same authoritative category records consumed by the storefront.

UPDATE public.categories
SET image_url = CASE slug
  WHEN 'ethnic-traditional-wear' THEN 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1100&q=85'
  WHEN 'western' THEN 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1100&q=85'
  WHEN 'topwear' THEN 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=85'
  WHEN 'bottomwear' THEN 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85'
  WHEN 'cosmetics' THEN 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=85'
  ELSE image_url
END
WHERE slug IN ('ethnic-traditional-wear', 'western', 'topwear', 'bottomwear', 'cosmetics');
