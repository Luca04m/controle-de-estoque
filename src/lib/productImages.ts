/**
 * Maps product SKU → image path relative to BASE_URL
 * Handles GitHub Pages sub-path (/controle-de-estoque/) transparently
 */

// Vite sets BASE_URL to '/' locally and '/controle-de-estoque/' on GH Pages
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

const PATHS: Record<string, string> = {
  'ML-HONEY-SG':  'products/honey/garrafa-semfundo.webp',
  'ML-HONEY-CMP': 'products/honey/completo-semfundo.webp',
  'ML-HONEY-PNG': 'products/honey/pingente-semfundo.webp',
  'ML-CAPU-SG':   'products/cappuccino/garrafa-semfundo.webp',
  'ML-CAPU-CMP':  'products/cappuccino/completo-semfundo.webp',
  'ML-CAPU-PNG':  'products/cappuccino/pingente-semfundo.webp',
  'ML-BLEND-SG':  'products/blended/garrafa-semfundo.webp',
  'ML-BLEND-CMP': 'products/blended/completo-semfundo.webp',
  'ML-BLEND-PNG': 'products/blended/pingente-semfundo.webp',
}

export function getProductImage(sku: string): string | undefined {
  const p = PATHS[sku]
  return p ? `${BASE}/${p}` : undefined
}
