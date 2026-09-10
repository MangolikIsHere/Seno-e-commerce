import Link from 'next/link'
export default function WishlistPage(){return <main className="simple-page"><p className="kicker">YOUR SAVED PIECES</p><h1>Wishlist</h1><p>Your saved pieces will appear here.</p><div className="empty-state"><span>♡</span><p>Nothing saved yet.</p><Link href="/" className="dark-button">Explore the collection</Link></div></main>}
