import storefront from '../storefront.html?raw';
export function GET() {
  return new Response(storefront, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
