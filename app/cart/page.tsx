import Link from 'next/link'
export default function CartPage(){return <main className="simple-page"><p className="kicker">YOUR SENO BAG</p><h1>Cart</h1><div className="empty-state"><span>○</span><p>Your cart is empty.</p><Link href="/" className="dark-button">Continue shopping</Link></div></main>}
