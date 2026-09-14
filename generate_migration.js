const fs = require('fs');
const path = require('path');

const img = (p) => 'https://images.unsplash.com/' + p + '?auto=format&fit=crop&w=1000&q=85';

const catalog = [
  {
    id: 'seno-01', slug: 'seno-raw-denim-jacket', name: 'Seno Raw Denim Jacket', category: 'Outerwear',
    description: 'A structured, unwashed Japanese raw denim jacket designed for long-term wear and natural patina. Features dropped shoulders and clean welt pockets.',
    details: ['14.5oz Japanese Selvedge Denim', 'Custom matte silver tack buttons', 'Internal chest pocket', 'Made in limited quantities'],
    price: 12900, compareAtPrice: 14500,
    images: [img('photo-1551028719-00167b16eac5'), img('photo-1529139574466-a303027c1d8b'), img('photo-1576995853123-5a10305d93c0')],
    sizes: ['S', 'M', 'L', 'XL'], colors: ['Indigo', 'Raw Black'], color: 'Indigo',
    isNew: true, isBestseller: true, createdAt: '2026-08-01', weight: 900, soldOut: false
  },
  {
    id: 'seno-02', slug: 'contour-rib-tank', name: 'Contour Rib Tank', category: 'Topwear',
    description: 'Heavyweight organic cotton rib tank top with custom high neck binding. Engineered to hold shape through continuous wash and wear.',
    details: ['95% Organic Cotton, 5% Elastane', '260 GSM heavy rib', 'High binding neckline', 'Preshrunk fabric'],
    price: 3900, compareAtPrice: null,
    images: [img('photo-1523381210434-271e8be1f52b'), img('photo-1503342217505-b0a15ec3261c')],
    sizes: ['XS', 'S', 'M', 'L'], colors: ['White', 'Black', 'Oat'], color: 'White',
    isBestseller: true, createdAt: '2026-07-15', weight: 150, soldOut: false
  },
  {
    id: 'seno-03', slug: 'transit-wide-trousers', name: 'Transit Wide Trousers', category: 'Bottomwear',
    description: 'Relaxed double-pleated trousers in lightweight wool-blend drape. Tailored with a deep rise and wide leg profile.',
    details: ['60% Wool, 40% Viscose', 'Double front pleats', 'Hidden waist button slider', 'Dry clean only'],
    price: 8900, compareAtPrice: null,
    images: [img('photo-1515886657613-9f3515b0c78f'), img('photo-1548883354-7622d03aca27')],
    sizes: ['S', 'M', 'L', 'XL'], colors: ['Charcoal', 'Olive'], color: 'Charcoal',
    isBestseller: true, createdAt: '2026-06-20', weight: 450, soldOut: false
  },
  {
    id: 'seno-04', slug: 'no-07-mesh-long-sleeve', name: 'No. 07 Mesh Long Sleeve', category: 'Topwear',
    description: 'Semi-sheer technical fine mesh long sleeve tee designed for subtle layering and tactile texture.',
    details: ['100% Recycled Polyester Mesh', 'Raw cut hem', 'Thumbhole cuffs', 'Relaxed silhouette'],
    price: 5900, compareAtPrice: null,
    images: [img('photo-1483985988355-763728e1935b'), img('photo-1490481651871-ab68de25d43d')],
    sizes: ['S', 'M', 'L'], colors: ['Black', 'Smoke'], color: 'Black',
    isNew: true, createdAt: '2026-08-10', weight: 120, soldOut: false
  },
  {
    id: 'seno-05', slug: 'uniform-pleated-skirt', name: 'Uniform Pleated Skirt', category: 'Bottomwear',
    description: 'Architectural midi skirt with sharp knife pleats and an asymmetric front vent for fluid movement.',
    details: ['Poly-twill crease-resistant weave', 'Side concealed zipper', 'Internal waistband stay'],
    price: 7900, compareAtPrice: null,
    images: [img('photo-1551488831-00ddcb6c6bd3'), img('photo-1509631179647-0177331693ae')],
    sizes: ['XS', 'S', 'M', 'L'], colors: ['Stone', 'Black'], color: 'Stone',
    createdAt: '2026-05-11', weight: 300, soldOut: false
  },
  {
    id: 'seno-06', slug: 'archive-work-shirt', name: 'Archive Work Shirt', category: 'Topwear',
    description: 'Utility button-down cut from washed cotton poplin with reinforced chest flap pockets.',
    details: ['100% Washed Cotton Poplin', 'Dual gusseted chest pockets', 'Horn-effect buttons'],
    price: 6900, compareAtPrice: null,
    images: [img('photo-1603252110481-7ba873bf42ab'), img('photo-1602810318383-e386cc2a3ccf')],
    sizes: ['M', 'L', 'XL'], colors: ['Blue', 'Khaki'], color: 'Blue',
    soldOut: true, createdAt: '2026-04-02', weight: 250
  },
  {
    id: 'seno-07', slug: 'everyday-canvas-tote', name: 'Everyday Canvas Tote', category: 'Accessories',
    description: 'Heavy 18oz cotton duck canvas carry-all tote with double-stitched web handles and internal zip pocket.',
    details: ['18oz Heavy Cotton Canvas', 'Internal key lanyard', 'Screen-printed Studio / 01 graphic'],
    price: 3200, compareAtPrice: null,
    images: [img('photo-1594223274512-ad4803739b7c'), img('photo-1548036328-c9fa89d128fa')],
    sizes: ['One size'], colors: ['Black', 'Off-White'], color: 'Black',
    isBestseller: true, createdAt: '2026-03-19', weight: 500, soldOut: false
  },
  {
    id: 'seno-08', slug: 'form-02-tailored-blazer', name: 'Form 02 Tailored Blazer', category: 'Outerwear',
    description: 'Single-breasted relaxed blazer crafted from structured tropical wool with clean notch lapels.',
    details: ['100% Tropical Wool', 'Cupro lining', 'Welt chest pocket & interior flap pockets'],
    price: 14900, compareAtPrice: 16900,
    images: [img('photo-1507679799987-c73779587ccf'), img('photo-1551488831-00ddcb6c6bd3')],
    sizes: ['S', 'M', 'L'], colors: ['Black', 'Grey Slate'], color: 'Black',
    isSale: true, createdAt: '2026-07-28', weight: 650, soldOut: false
  },
  {
    id: 'seno-09', slug: 'daily-cotton-shirt', name: 'Daily Cotton Shirt', category: 'Topwear',
    description: 'Boxy poplin shirt with a spread collar and subtle back box pleat for an effortless silhouette.',
    details: ['Organic Crisp Cotton Poplin', 'Mother of pearl buttons', 'Curved hemline'],
    price: 6200, compareAtPrice: null,
    images: [img('photo-1596755389378-c31d21fd1273'), img('photo-1605763240000-7e93b172d754')],
    sizes: ['S', 'M', 'L', 'XL'], colors: ['Cream', 'Sky Blue'], color: 'Cream',
    isNew: true, createdAt: '2026-08-15', weight: 200, soldOut: false
  },
  {
    id: 'seno-10', slug: 'utility-cargo-pant', name: 'Utility Cargo Pant', category: 'Bottomwear',
    description: 'Tactile cotton ripstop trousers featuring angled side flap pockets and adjustable hem cinches.',
    details: ['100% Cotton Ripstop', 'Articulated knee darts', 'Drawstring hem closures'],
    price: 9800, compareAtPrice: null,
    images: [img('photo-1541099649105-f69ad21f3246'), img('photo-1515886657613-9f3515b0c78f')],
    sizes: ['S', 'M', 'L', 'XL'], colors: ['Olive', 'Washed Black'], color: 'Olive',
    createdAt: '2026-06-04', weight: 500, soldOut: false
  },
  {
    id: 'seno-11', slug: 'studio-cap', name: 'Studio Cap', category: 'Accessories',
    description: 'Unstructured 6-panel cap crafted from washed twill with tonal SENO embroidery.',
    details: ['100% Cotton Twill', 'Adjustable brass buckle strap', 'Tonal embroidery'],
    price: 2400, compareAtPrice: null,
    images: [img('photo-1521369909029-2afed882baee'), img('photo-1534215754734-18e55d13e346')],
    sizes: ['One size'], colors: ['Black', 'Khaki'], color: 'Black',
    isBestseller: true, createdAt: '2026-02-14', weight: 100, soldOut: false
  },
  {
    id: 'seno-12', slug: 'soft-form-cardigan', name: 'Soft Form Cardigan', category: 'Topwear',
    description: 'V-neck cardigan knit from soft merino wool blend with chunky horn buttons.',
    details: ['70% Merino Wool, 30% Alpaca', 'Ribbed cuffs and hem', 'Relaxed fit'],
    price: 7400, compareAtPrice: null,
    images: [img('photo-1434389677669-e08b4cac3105'), img('photo-1485968579580-b6d095142e6e')],
    sizes: ['S', 'M', 'L'], colors: ['Oat', 'Charcoal'], color: 'Oat',
    createdAt: '2026-05-30', weight: 350, soldOut: false
  },
  {
    id: 'seno-13', slug: 'field-overshirt', name: 'Field Overshirt', category: 'Outerwear',
    description: 'Heavyweight cotton canvas overshirt designed for transitional weather layering.',
    details: ['100% Heavy Cotton Canvas', 'Double needle seam stitching', 'Dual flap chest pockets'],
    price: 10800, compareAtPrice: null,
    images: [img('photo-1598808503746-f34c53b9323e'), img('photo-1551028719-00167b16eac5')],
    sizes: ['S', 'M', 'L', 'XL'], colors: ['Moss', 'Tan'], color: 'Moss',
    isNew: true, createdAt: '2026-08-20', weight: 600, soldOut: false
  },
  {
    id: 'seno-14', slug: 'linea-slip-dress', name: 'Linea Slip Dress', category: 'Topwear',
    description: 'Fluid bias-cut satin dress with ultra-thin shoulder straps and a subtle cowl neckline.',
    details: ['100% Matte Silk Satin', 'Adjustable straps', 'Fully lined'],
    price: 8600, compareAtPrice: null,
    images: [img('photo-1566174053879-31528523f8ae'), img('photo-1515886657613-9f3515b0c78f')],
    sizes: ['XS', 'S', 'M', 'L'], colors: ['Ink', 'Champagne'], color: 'Ink',
    isNew: true, createdAt: '2026-08-05', weight: 150, soldOut: false
  },
  {
    id: 'seno-15', slug: 'soft-utility-scarf', name: 'Soft Utility Scarf', category: 'Accessories',
    description: 'Generously proportioned brushed wool scarf finished with raw fringed edges.',
    details: ['100% Pure Brushed Lambswool', 'Dimension: 200cm x 45cm', 'Woven SENO care label'],
    price: 2800, compareAtPrice: null,
    images: [img('photo-1601924994987-69e26d50dc26'), img('photo-1520903920243-00d872a2d1c9')],
    sizes: ['One size'], colors: ['Clay', 'Charcoal'], color: 'Clay',
    createdAt: '2026-01-10', weight: 200, soldOut: false
  },
  {
    id: 'seno-16', slug: 'studio-sweat', name: 'Studio Sweat', category: 'Topwear',
    description: 'Heavy French terry crewneck sweatshirt with dropped shoulders and ribbed gussets.',
    details: ['450 GSM Organic French Terry', 'Pre-shrunk finish', 'Reinforced rib collar'],
    price: 7200, compareAtPrice: null,
    images: [img('photo-1556821840-3a63f95609a7'), img('photo-1503342217505-b0a15ec3261c')],
    sizes: ['S', 'M', 'L', 'XL'], colors: ['Grey', 'Black'], color: 'Grey',
    createdAt: '2026-04-22', weight: 450, soldOut: false
  },
  {
    id: 'seno-17', slug: 'minimalist-leather-belt', name: 'Minimalist Leather Belt', category: 'Accessories',
    description: 'Vegetable-tanned full grain leather belt with custom brushed steel roller buckle.',
    details: ['Full grain Italian leather', '30mm width', 'Brushed steel hardware'],
    price: 3600, compareAtPrice: null,
    images: [img('photo-1553062407-98eeb64c6a62'), img('photo-1521369909029-2afed882baee')],
    sizes: ['S', 'M', 'L'], colors: ['Black', 'Tan'], color: 'Black',
    isNew: true, createdAt: '2026-08-18', weight: 150, soldOut: false
  },
  {
    id: 'seno-18', slug: 'structured-wool-coat', name: 'Structured Wool Coat', category: 'Outerwear',
    description: 'Double-breasted long trench coat cut from heavy Melton wool with a waist belt tie.',
    details: ['80% Melton Wool, 20% Nylon', 'Storm flap panel', 'Deep side slant pockets'],
    price: 18900, compareAtPrice: null,
    images: [img('photo-1544441893-675973e31985'), img('photo-1507679799987-c73779587ccf')],
    sizes: ['S', 'M', 'L'], colors: ['Camel', 'Dark Navy'], color: 'Camel',
    isBestseller: true, createdAt: '2026-07-01', weight: 1200, soldOut: false
  }
];

const categoryCode = (name) => {
  const codes = { 'Outerwear': 'OUT', 'Topwear': 'TOP', 'Bottomwear': 'BTM', 'Accessories': 'ACC' };
  return codes[name] || 'GEN';
};

const colorCode = (name) => {
  const codes = {
    'Indigo': 'IND', 'Raw Black': 'RBK', 'White': 'WHT', 'Black': 'BLK', 'Oat': 'OAT',
    'Charcoal': 'CHR', 'Olive': 'OLV', 'Smoke': 'SMK', 'Stone': 'STN', 'Blue': 'BLU',
    'Khaki': 'KHK', 'Off-White': 'OWH', 'Grey Slate': 'GSL', 'Cream': 'CRM',
    'Sky Blue': 'SKY', 'Washed Black': 'WBK', 'Moss': 'MOS', 'Tan': 'TAN', 'Ink': 'INK',
    'Champagne': 'CHP', 'Clay': 'CLY', 'Grey': 'GRY', 'Camel': 'CML', 'Dark Navy': 'DNV'
  };
  return codes[name] || name.substring(0, 3).toUpperCase();
};

const sizeCode = (name) => {
  if (name === 'One size') return 'OS';
  return name.toUpperCase();
};

const escape = (str) => {
  if (str === null || str === undefined) return 'NULL';
  return "'" + str.replace(/'/g, "''") + "'";
};

let sql = "-- ==============================================================================\n" +
"-- SENO FASHION MARKETPLACE - STAGE 3 MIGRATION\n" +
"-- Migration: 20260914000001_seed_seno_catalog.sql\n" +
"-- Description: Seed 18 platform products, categories, collections and variants.\n" +
"-- ==============================================================================\n\n" +
"DO $$\n" +
"DECLARE\n" +
"  v_platform_id UUID;\n" +
"  v_cat_topwear UUID;\n" +
"  v_cat_bottomwear UUID;\n" +
"  v_cat_outerwear UUID;\n" +
"  v_cat_accessories UUID;\n" +
"  v_col_new UUID;\n" +
"  v_col_bestsellers UUID;\n" +
"  v_product_id UUID;\n" +
"  v_variant_id UUID;\n" +
"BEGIN\n" +
"  -- 1. Get Platform Seller ID\n" +
"  SELECT id INTO v_platform_id FROM public.sellers WHERE seller_type = 'platform' LIMIT 1;\n" +
"  IF v_platform_id IS NULL THEN\n" +
"    RAISE EXCEPTION 'Platform seller not found.';\n" +
"  END IF;\n\n" +
"  -- 2. Upsert Categories\n" +
"  INSERT INTO public.categories (name, slug, description, display_order)\n" +
"  VALUES \n" +
"    ('Topwear', 'topwear', 'Shirts, Tanks & Cardigans', 1),\n" +
"    ('Bottomwear', 'bottomwear', 'Pleated Trousers & Cargo Pants', 2),\n" +
"    ('Outerwear', 'outerwear', 'Selvedge Denim & Wool Blazers', 3),\n" +
"    ('Accessories', 'accessories', 'Canvas Totes & Brushed Wool', 4)\n" +
"  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;\n  \n" +
"  SELECT id INTO v_cat_topwear FROM public.categories WHERE slug = 'topwear';\n" +
"  SELECT id INTO v_cat_bottomwear FROM public.categories WHERE slug = 'bottomwear';\n" +
"  SELECT id INTO v_cat_outerwear FROM public.categories WHERE slug = 'outerwear';\n" +
"  SELECT id INTO v_cat_accessories FROM public.categories WHERE slug = 'accessories';\n\n" +
"  -- 3. Upsert Collections\n" +
"  INSERT INTO public.collections (name, slug, description)\n" +
"  VALUES \n" +
"    ('New Arrivals', 'new-arrivals', 'Curated Releases'),\n" +
"    ('Bestsellers', 'bestsellers', 'Essential Staples')\n" +
"  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;\n\n" +
"  SELECT id INTO v_col_new FROM public.collections WHERE slug = 'new-arrivals';\n" +
"  SELECT id INTO v_col_bestsellers FROM public.collections WHERE slug = 'bestsellers';\n\n";

// 4. Products
catalog.forEach(p => {
  sql += "  -- Product: " + p.name + "\n" +
  "  INSERT INTO public.products (\n" +
  "    seller_id, category_id, name, slug, description, details, price, compare_at_price,\n" +
  "    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status\n" +
  "  )\n" +
  "  VALUES (\n" +
  "    v_platform_id, \n" +
  "    CASE '" + p.category + "' \n" +
  "      WHEN 'Topwear' THEN v_cat_topwear \n" +
  "      WHEN 'Bottomwear' THEN v_cat_bottomwear \n" +
  "      WHEN 'Outerwear' THEN v_cat_outerwear \n" +
  "      WHEN 'Accessories' THEN v_cat_accessories \n" +
  "    END,\n" +
  "    " + escape(p.name) + ", " + escape(p.slug) + ", " + escape(p.description) + ", '" + JSON.stringify(p.details).replace(/'/g, "''") + "'::jsonb,\n" +
  "    " + p.price + ", " + (p.compareAtPrice || 'NULL') + ", " + p.weight + ", false, " + (p.isNew || false) + ", " + (p.isBestseller || false) + ", true, 'approved'\n" +
  "  )\n" +
  "  ON CONFLICT (slug) DO UPDATE SET \n" +
  "    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, \n" +
  "    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller\n" +
  "  RETURNING id INTO v_product_id;\n  ";

  // Images (idempotent: delete existing images for this product before inserting)
  sql += "\n  DELETE FROM public.product_images WHERE product_id = v_product_id;\n";
  p.images.forEach((img, idx) => {
    sql += "  INSERT INTO public.product_images (product_id, url, display_order, is_primary)\n" +
    "  VALUES (v_product_id, " + escape(img) + ", " + idx + ", " + (idx === 0) + ");\n";
  });

  // Variants & Inventory
  p.sizes.forEach(sz => {
    p.colors.forEach(col => {
      const sku = "SENO-" + categoryCode(p.category) + "-" + colorCode(col) + "-" + sizeCode(sz);
      const qty = p.soldOut ? 0 : 1;
      
      sql += "\n  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)\n" +
      "  VALUES (v_product_id, " + escape(sz) + ", " + escape(col) + ", " + escape(sku) + ", true)\n" +
      "  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active\n" +
      "  RETURNING id INTO v_variant_id;\n\n" +
      "  INSERT INTO public.inventory (variant_id, quantity)\n" +
      "  VALUES (v_variant_id, " + qty + ")\n" +
      "  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;\n      ";
    });
  });

  // Collections linking
  if (p.isNew) {
    sql += "\n  INSERT INTO public.collection_products (collection_id, product_id)\n" +
    "  VALUES (v_col_new, v_product_id) ON CONFLICT DO NOTHING;\n    ";
  }
  if (p.isBestseller) {
    sql += "\n  INSERT INTO public.collection_products (collection_id, product_id)\n" +
    "  VALUES (v_col_bestsellers, v_product_id) ON CONFLICT DO NOTHING;\n    ";
  }
});

sql += "\nEND $$;\n";

fs.writeFileSync(path.join(__dirname, 'supabase', 'migrations', '20260914000001_seed_seno_catalog.sql'), sql);
console.log('Migration generated.');
