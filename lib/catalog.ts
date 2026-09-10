export type Product={slug:string;name:string;category:string;price:number;color:string;image:string;sizes:string[];soldOut?:boolean;tag?:string;description?:string}
const img=(id:string)=>`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1100&q=85`
export const catalog:Product[]=[
{slug:'seno-raw-denim-jacket',name:'Seno Raw Denim Jacket',category:'Outerwear',price:12900,color:'Indigo',image:img('photo-1551028719-00167b16eac5'),sizes:['S','M','L','XL'],tag:'New'},
{slug:'contour-rib-tank',name:'Contour Rib Tank',category:'Topwear',price:3900,color:'White',image:img('photo-1523381210434-271e8be1f52b'),sizes:['XS','S','M','L']},
{slug:'transit-wide-trousers',name:'Transit Wide Trousers',category:'Bottomwear',price:8900,color:'Charcoal',image:img('photo-1515886657613-9f3515b0c78f'),sizes:['S','M','L','XL']},
{slug:'no-07-mesh-long-sleeve',name:'No. 07 Mesh Long Sleeve',category:'Topwear',price:5900,color:'Black',image:img('photo-1483985988355-763728e1935b'),sizes:['S','M','L'],tag:'New'},
{slug:'uniform-pleated-skirt',name:'Uniform Pleated Skirt',category:'Bottomwear',price:7900,color:'Stone',image:img('photo-1551488831-00ddcb6c6bd3'),sizes:['XS','S','M','L']},
{slug:'archive-work-shirt',name:'Archive Work Shirt',category:'Topwear',price:6900,color:'Blue',image:img('photo-1603252110481-7ba873bf42ab'),sizes:['M','L','XL'],soldOut:true},
{slug:'everyday-canvas-tote',name:'Everyday Canvas Tote',category:'Accessories',price:3200,color:'Black',image:img('photo-1594223274512-ad4803739b7c'),sizes:['One size']},
{slug:'form-02-tailored-blazer',name:'Form 02 Tailored Blazer',category:'Outerwear',price:14900,color:'Black',image:img('photo-1507679799987-c73779587ccf'),sizes:['S','M','L']},
{slug:'daily-cotton-shirt',name:'Daily Cotton Shirt',category:'Topwear',price:6200,color:'Cream',image:img('photo-1596755389378-c31d21fd1273'),sizes:['S','M','L','XL']},
{slug:'utility-cargo-pant',name:'Utility Cargo Pant',category:'Bottomwear',price:9800,color:'Olive',image:img('photo-1541099649105-f69ad21f3246'),sizes:['S','M','L']},
{slug:'studio-cap',name:'Studio Cap',category:'Accessories',price:2400,color:'Black',image:img('photo-1521369909029-2afed882baee'),sizes:['One size']},
{slug:'soft-form-cardigan',name:'Soft Form Cardigan',category:'Topwear',price:7400,color:'Oat',image:img('photo-1434389677669-e08b4cac3105'),sizes:['S','M','L']},
{slug:'field-overshirt',name:'Field Overshirt',category:'Outerwear',price:10800,color:'Moss',image:img('photo-1598808503746-f34c53b9323e'),sizes:['S','M','L','XL']},
{slug:'linea-slip-dress',name:'Linea Slip Dress',category:'Dresses',price:8600,color:'Ink',image:img('photo-1566174053879-31528523f8ae'),sizes:['XS','S','M','L'],tag:'New'},
{slug:'soft-utility-scarf',name:'Soft Utility Scarf',category:'Accessories',price:2800,color:'Clay',image:img('photo-1601924994987-69e26d50dc26'),sizes:['One size']},
{slug:'studio-sweat',name:'Studio Sweat',category:'Topwear',price:7200,color:'Grey',image:img('photo-1556821840-3a63f95609a7'),sizes:['S','M','L','XL']}
]
export const money=(n:number)=>`₹${n.toLocaleString('en-IN')}`
export const getProduct=(slug:string)=>catalog.find(product=>product.slug===slug)
export const productSlug=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
export const collections=['All products','New arrivals','Topwear','Bottomwear','Accessories','Collections']
export function getCollectionProducts(collection:string){if(collection==='All products')return catalog;if(collection==='New arrivals')return catalog.filter(p=>p.tag==='New');if(collection==='Collections')return catalog.slice(4,12);return catalog.filter(p=>p.category===collection)}
