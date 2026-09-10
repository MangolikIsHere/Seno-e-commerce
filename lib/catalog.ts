export type Category = 'Topwear' | 'Bottomwear' | 'Outerwear' | 'Accessories'

export interface Product {
  id: string
  slug: string
  name: string
  category: Category
  description: string
  details?: string[]
  price: number
  compareAtPrice?: number
  image: string
  hoverImage: string
  images: string[]
  sizes: string[]
  colors: string[]
  color: string
  soldOut?: boolean
  isNew?: boolean
  isBestseller?: boolean
  isSale?: boolean
  createdAt: string
}

// Curated high quality fashion imagery with robust fallbacks
const img = (path: string) => `https://images.unsplash.com/${path}?auto=format&fit=crop&w=1000&q=85`

export const catalog: Product[] = [
  {
    id: 'seno-01',
    slug: 'seno-raw-denim-jacket',
    name: 'Seno Raw Denim Jacket',
    category: 'Outerwear',
    description: 'A structured, unwashed Japanese raw denim jacket designed for long-term wear and natural patina. Features dropped shoulders and clean welt pockets.',
    details: ['14.5oz Japanese Selvedge Denim', 'Custom matte silver tack buttons', 'Internal chest pocket', 'Made in limited quantities'],
    price: 12900,
    compareAtPrice: 14500,
    image: img('photo-1551028719-00167b16eac5'),
    hoverImage: img('photo-1529139574466-a303027c1d8b'),
    images: [
      img('photo-1551028719-00167b16eac5'),
      img('photo-1529139574466-a303027c1d8b'),
      img('photo-1576995853123-5a10305d93c0')
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Indigo', 'Raw Black'],
    color: 'Indigo',
    isNew: true,
    isBestseller: true,
    createdAt: '2026-08-01'
  },
  {
    id: 'seno-02',
    slug: 'contour-rib-tank',
    name: 'Contour Rib Tank',
    category: 'Topwear',
    description: 'Heavyweight organic cotton rib tank top with custom high neck binding. Engineered to hold shape through continuous wash and wear.',
    details: ['95% Organic Cotton, 5% Elastane', '260 GSM heavy rib', 'High binding neckline', 'Preshrunk fabric'],
    price: 3900,
    image: img('photo-1523381210434-271e8be1f52b'),
    hoverImage: img('photo-1503342217505-b0a15ec3261c'),
    images: [
      img('photo-1523381210434-271e8be1f52b'),
      img('photo-1503342217505-b0a15ec3261c')
    ],
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['White', 'Black', 'Oat'],
    color: 'White',
    isBestseller: true,
    createdAt: '2026-07-15'
  },
  {
    id: 'seno-03',
    slug: 'transit-wide-trousers',
    name: 'Transit Wide Trousers',
    category: 'Bottomwear',
    description: 'Relaxed double-pleated trousers in lightweight wool-blend drape. Tailored with a deep rise and wide leg profile.',
    details: ['60% Wool, 40% Viscose', 'Double front pleats', 'Hidden waist button slider', 'Dry clean only'],
    price: 8900,
    image: img('photo-1515886657613-9f3515b0c78f'),
    hoverImage: img('photo-1548883354-7622d03aca27'),
    images: [
      img('photo-1515886657613-9f3515b0c78f'),
      img('photo-1548883354-7622d03aca27')
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Charcoal', 'Olive'],
    color: 'Charcoal',
    isBestseller: true,
    createdAt: '2026-06-20'
  },
  {
    id: 'seno-04',
    slug: 'no-07-mesh-long-sleeve',
    name: 'No. 07 Mesh Long Sleeve',
    category: 'Topwear',
    description: 'Semi-sheer technical fine mesh long sleeve tee designed for subtle layering and tactile texture.',
    details: ['100% Recycled Polyester Mesh', 'Raw cut hem', 'Thumbhole cuffs', 'Relaxed silhouette'],
    price: 5900,
    image: img('photo-1483985988355-763728e1935b'),
    hoverImage: img('photo-1490481651871-ab68de25d43d'),
    images: [
      img('photo-1483985988355-763728e1935b'),
      img('photo-1490481651871-ab68de25d43d')
    ],
    sizes: ['S', 'M', 'L'],
    colors: ['Black', 'Smoke'],
    color: 'Black',
    isNew: true,
    createdAt: '2026-08-10'
  },
  {
    id: 'seno-05',
    slug: 'uniform-pleated-skirt',
    name: 'Uniform Pleated Skirt',
    category: 'Bottomwear',
    description: 'Architectural midi skirt with sharp knife pleats and an asymmetric front vent for fluid movement.',
    details: ['Poly-twill crease-resistant weave', 'Side concealed zipper', 'Internal waistband stay'],
    price: 7900,
    image: img('photo-1551488831-00ddcb6c6bd3'),
    hoverImage: img('photo-1509631179647-0177331693ae'),
    images: [
      img('photo-1551488831-00ddcb6c6bd3'),
      img('photo-1509631179647-0177331693ae')
    ],
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Stone', 'Black'],
    color: 'Stone',
    createdAt: '2026-05-11'
  },
  {
    id: 'seno-06',
    slug: 'archive-work-shirt',
    name: 'Archive Work Shirt',
    category: 'Topwear',
    description: 'Utility button-down cut from washed cotton poplin with reinforced chest flap pockets.',
    details: ['100% Washed Cotton Poplin', 'Dual gusseted chest pockets', 'Horn-effect buttons'],
    price: 6900,
    image: img('photo-1603252110481-7ba873bf42ab'),
    hoverImage: img('photo-1602810318383-e386cc2a3ccf'),
    images: [
      img('photo-1603252110481-7ba873bf42ab'),
      img('photo-1602810318383-e386cc2a3ccf')
    ],
    sizes: ['M', 'L', 'XL'],
    colors: ['Blue', 'Khaki'],
    color: 'Blue',
    soldOut: true,
    createdAt: '2026-04-02'
  },
  {
    id: 'seno-07',
    slug: 'everyday-canvas-tote',
    name: 'Everyday Canvas Tote',
    category: 'Accessories',
    description: 'Heavy 18oz cotton duck canvas carry-all tote with double-stitched web handles and internal zip pocket.',
    details: ['18oz Heavy Cotton Canvas', 'Internal key lanyard', 'Screen-printed Studio / 01 graphic'],
    price: 3200,
    image: img('photo-1594223274512-ad4803739b7c'),
    hoverImage: img('photo-1548036328-c9fa89d128fa'),
    images: [
      img('photo-1594223274512-ad4803739b7c'),
      img('photo-1548036328-c9fa89d128fa')
    ],
    sizes: ['One size'],
    colors: ['Black', 'Off-White'],
    color: 'Black',
    isBestseller: true,
    createdAt: '2026-03-19'
  },
  {
    id: 'seno-08',
    slug: 'form-02-tailored-blazer',
    name: 'Form 02 Tailored Blazer',
    category: 'Outerwear',
    description: 'Single-breasted relaxed blazer crafted from structured tropical wool with clean notch lapels.',
    details: ['100% Tropical Wool', 'Cupro lining', 'Welt chest pocket & interior flap pockets'],
    price: 14900,
    compareAtPrice: 16900,
    image: img('photo-1507679799987-c73779587ccf'),
    hoverImage: img('photo-1551488831-00ddcb6c6bd3'),
    images: [
      img('photo-1507679799987-c73779587ccf'),
      img('photo-1551488831-00ddcb6c6bd3')
    ],
    sizes: ['S', 'M', 'L'],
    colors: ['Black', 'Grey Slate'],
    color: 'Black',
    isSale: true,
    createdAt: '2026-07-28'
  },
  {
    id: 'seno-09',
    slug: 'daily-cotton-shirt',
    name: 'Daily Cotton Shirt',
    category: 'Topwear',
    description: 'Boxy poplin shirt with a spread collar and subtle back box pleat for an effortless silhouette.',
    details: ['Organic Crisp Cotton Poplin', 'Mother of pearl buttons', 'Curved hemline'],
    price: 6200,
    image: img('photo-1596755389378-c31d21fd1273'),
    hoverImage: img('photo-1605763240000-7e93b172d754'),
    images: [
      img('photo-1596755389378-c31d21fd1273'),
      img('photo-1605763240000-7e93b172d754')
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Cream', 'Sky Blue'],
    color: 'Cream',
    isNew: true,
    createdAt: '2026-08-15'
  },
  {
    id: 'seno-10',
    slug: 'utility-cargo-pant',
    name: 'Utility Cargo Pant',
    category: 'Bottomwear',
    description: 'Tactile cotton ripstop trousers featuring angled side flap pockets and adjustable hem cinches.',
    details: ['100% Cotton Ripstop', 'Articulated knee darts', 'Drawstring hem closures'],
    price: 9800,
    image: img('photo-1541099649105-f69ad21f3246'),
    hoverImage: img('photo-1515886657613-9f3515b0c78f'),
    images: [
      img('photo-1541099649105-f69ad21f3246'),
      img('photo-1515886657613-9f3515b0c78f')
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Olive', 'Washed Black'],
    color: 'Olive',
    createdAt: '2026-06-04'
  },
  {
    id: 'seno-11',
    slug: 'studio-cap',
    name: 'Studio Cap',
    category: 'Accessories',
    description: 'Unstructured 6-panel cap crafted from washed twill with tonal SENO embroidery.',
    details: ['100% Cotton Twill', 'Adjustable brass buckle strap', 'Tonal embroidery'],
    price: 2400,
    image: img('photo-1521369909029-2afed882baee'),
    hoverImage: img('photo-1534215754734-18e55d13e346'),
    images: [
      img('photo-1521369909029-2afed882baee'),
      img('photo-1534215754734-18e55d13e346')
    ],
    sizes: ['One size'],
    colors: ['Black', 'Khaki'],
    color: 'Black',
    isBestseller: true,
    createdAt: '2026-02-14'
  },
  {
    id: 'seno-12',
    slug: 'soft-form-cardigan',
    name: 'Soft Form Cardigan',
    category: 'Topwear',
    description: 'V-neck cardigan knit from soft merino wool blend with chunky horn buttons.',
    details: ['70% Merino Wool, 30% Alpaca', 'Ribbed cuffs and hem', 'Relaxed fit'],
    price: 7400,
    image: img('photo-1434389677669-e08b4cac3105'),
    hoverImage: img('photo-1485968579580-b6d095142e6e'),
    images: [
      img('photo-1434389677669-e08b4cac3105'),
      img('photo-1485968579580-b6d095142e6e')
    ],
    sizes: ['S', 'M', 'L'],
    colors: ['Oat', 'Charcoal'],
    color: 'Oat',
    createdAt: '2026-05-30'
  },
  {
    id: 'seno-13',
    slug: 'field-overshirt',
    name: 'Field Overshirt',
    category: 'Outerwear',
    description: 'Heavyweight cotton canvas overshirt designed for transitional weather layering.',
    details: ['100% Heavy Cotton Canvas', 'Double needle seam stitching', 'Dual flap chest pockets'],
    price: 10800,
    image: img('photo-1598808503746-f34c53b9323e'),
    hoverImage: img('photo-1551028719-00167b16eac5'),
    images: [
      img('photo-1598808503746-f34c53b9323e'),
      img('photo-1551028719-00167b16eac5')
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Moss', 'Tan'],
    color: 'Moss',
    isNew: true,
    createdAt: '2026-08-20'
  },
  {
    id: 'seno-14',
    slug: 'linea-slip-dress',
    name: 'Linea Slip Dress',
    category: 'Topwear',
    description: 'Fluid bias-cut satin dress with ultra-thin shoulder straps and a subtle cowl neckline.',
    details: ['100% Matte Silk Satin', 'Adjustable straps', 'Fully lined'],
    price: 8600,
    image: img('photo-1566174053879-31528523f8ae'),
    hoverImage: img('photo-1515886657613-9f3515b0c78f'),
    images: [
      img('photo-1566174053879-31528523f8ae'),
      img('photo-1515886657613-9f3515b0c78f')
    ],
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Ink', 'Champagne'],
    color: 'Ink',
    isNew: true,
    createdAt: '2026-08-05'
  },
  {
    id: 'seno-15',
    slug: 'soft-utility-scarf',
    name: 'Soft Utility Scarf',
    category: 'Accessories',
    description: 'Generously proportioned brushed wool scarf finished with raw fringed edges.',
    details: ['100% Pure Brushed Lambswool', 'Dimension: 200cm x 45cm', 'Woven SENO care label'],
    price: 2800,
    image: img('photo-1601924994987-69e26d50dc26'),
    hoverImage: img('photo-1520903920243-00d872a2d1c9'),
    images: [
      img('photo-1601924994987-69e26d50dc26'),
      img('photo-1520903920243-00d872a2d1c9')
    ],
    sizes: ['One size'],
    colors: ['Clay', 'Charcoal'],
    color: 'Clay',
    createdAt: '2026-01-10'
  },
  {
    id: 'seno-16',
    slug: 'studio-sweat',
    name: 'Studio Sweat',
    category: 'Topwear',
    description: 'Heavy French terry crewneck sweatshirt with dropped shoulders and ribbed gussets.',
    details: ['450 GSM Organic French Terry', 'Pre-shrunk finish', 'Reinforced rib collar'],
    price: 7200,
    image: img('photo-1556821840-3a63f95609a7'),
    hoverImage: img('photo-1503342217505-b0a15ec3261c'),
    images: [
      img('photo-1556821840-3a63f95609a7'),
      img('photo-1503342217505-b0a15ec3261c')
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Grey', 'Black'],
    color: 'Grey',
    createdAt: '2026-04-22'
  },
  {
    id: 'seno-17',
    slug: 'minimalist-leather-belt',
    name: 'Minimalist Leather Belt',
    category: 'Accessories',
    description: 'Vegetable-tanned full grain leather belt with custom brushed steel roller buckle.',
    details: ['Full grain Italian leather', '30mm width', 'Brushed steel hardware'],
    price: 3600,
    image: img('photo-1553062407-98eeb64c6a62'),
    hoverImage: img('photo-1521369909029-2afed882baee'),
    images: [
      img('photo-1553062407-98eeb64c6a62'),
      img('photo-1521369909029-2afed882baee')
    ],
    sizes: ['S', 'M', 'L'],
    colors: ['Black', 'Tan'],
    color: 'Black',
    isNew: true,
    createdAt: '2026-08-18'
  },
  {
    id: 'seno-18',
    slug: 'structured-wool-coat',
    name: 'Structured Wool Coat',
    category: 'Outerwear',
    description: 'Double-breasted long trench coat cut from heavy Melton wool with a waist belt tie.',
    details: ['80% Melton Wool, 20% Nylon', 'Storm flap panel', 'Deep side slant pockets'],
    price: 18900,
    image: img('photo-1544441893-675973e31985'),
    hoverImage: img('photo-1507679799987-c73779587ccf'),
    images: [
      img('photo-1544441893-675973e31985'),
      img('photo-1507679799987-c73779587ccf')
    ],
    sizes: ['S', 'M', 'L'],
    colors: ['Camel', 'Dark Navy'],
    color: 'Camel',
    isBestseller: true,
    createdAt: '2026-07-01'
  }
]

export const money = (n: number) => `₹${n.toLocaleString('en-IN')}`

export const getProduct = (slug: string): Product | undefined => {
  return catalog.find(product => product.slug === slug)
}

export const getRelatedProducts = (product: Product, limit = 4): Product[] => {
  return catalog
    .filter(item => item.category === product.category && item.slug !== product.slug)
    .concat(catalog.filter(item => item.slug !== product.slug))
    .slice(0, limit)
}

export const getNewArrivals = (limit = 4): Product[] => {
  return catalog.filter(p => p.isNew || p.createdAt > '2026-08-01').slice(0, limit)
}

export const getBestsellers = (limit = 4): Product[] => {
  return catalog.filter(p => p.isBestseller).slice(0, limit)
}

export const getCollectionProducts = (
  category: string,
  options?: {
    availability?: string
    size?: string
    color?: string
    sort?: string
    query?: string
  }
): Product[] => {
  let list = catalog.filter(p => {
    if (category === 'All' || category === 'All products' || category === '' || category === 'all') return true
    if (category === 'New arrivals' || category === 'new-arrivals') return p.isNew || p.createdAt > '2026-08-01'
    if (category === 'Bestsellers' || category === 'bestsellers') return p.isBestseller
    return p.category.toLowerCase() === category.toLowerCase()
  })

  if (options?.availability && options.availability !== 'All') {
    if (options.availability === 'In stock') list = list.filter(p => !p.soldOut)
    if (options.availability === 'Sold out') list = list.filter(p => p.soldOut)
  }

  if (options?.size && options.size !== 'All') {
    list = list.filter(p => p.sizes.includes(options.size!))
  }

  if (options?.color && options.color !== 'All') {
    list = list.filter(p => p.color.toLowerCase() === options.color!.toLowerCase())
  }

  if (options?.query && options.query.trim() !== '') {
    const q = options.query.toLowerCase().trim()
    list = list.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    )
  }

  if (options?.sort) {
    if (options.sort === 'Newest') {
      list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (options.sort === 'Price: low to high') {
      list = [...list].sort((a, b) => a.price - b.price)
    } else if (options.sort === 'Price: high to low') {
      list = [...list].sort((a, b) => b.price - a.price)
    } else if (options.sort === 'Best selling') {
      list = [...list].sort((a, b) => (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0))
    }
  }

  return list
}
