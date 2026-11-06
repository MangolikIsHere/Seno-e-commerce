async function main() {
  const res = await fetch('http://localhost:3000/');
  const html = await res.text();
  const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map(m => m[1].replace(/<[^>]*>/g, '').trim());
  console.log('Homepage H2 Headings:');
  headings.forEach((h, i) => console.log(`${i + 1}. ${h}`));

  const kickers = [...html.matchAll(/<span[^>]*class="[^"]*section-kicker[^"]*"[^>]*>([\s\S]*?)<\/span>/g)].map(m => m[1].trim());
  console.log('\nSection Kickers:', kickers);
}
main().catch(console.error);

