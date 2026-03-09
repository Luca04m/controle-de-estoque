/**
 * Maps product SKU → local image path
 * Images are in /public/products/{category}/{variant}-semfundo.webp
 */

const BASE = '/products'

export const PRODUCT_IMAGE: Record<string, string> = {
  'ML-HONEY-SG':   `${BASE}/honey/garrafa-semfundo.webp`,
  'ML-HONEY-CMP':  `${BASE}/honey/completo-semfundo.webp`,
  'ML-HONEY-PNG':  `${BASE}/honey/pingente-semfundo.webp`,
  'ML-CAPU-SG':    `${BASE}/cappuccino/garrafa-semfundo.webp`,
  'ML-CAPU-CMP':   `${BASE}/cappuccino/completo-semfundo.webp`,
  'ML-CAPU-PNG':   `${BASE}/cappuccino/pingente-semfundo.webp`,
  'ML-BLEND-SG':   `${BASE}/blended/garrafa-semfundo.webp`,
  'ML-BLEND-CMP':  `${BASE}/blended/completo-semfundo.webp`,
  'ML-BLEND-PNG':  `${BASE}/blended/pingente-semfundo.webp`,
}

/** Returns the image URL for a product SKU, or undefined if no image exists */
export function getProductImage(sku: string): string | undefined {
  return PRODUCT_IMAGE[sku]
}
