/**
 * Maps product SKU → image URL
 * Uses Vite static imports — guaranteed to work on any base path (GH Pages, local, etc.)
 */

import honeyGarrafa  from '@/assets/products/honey/garrafa-semfundo.webp'
import honeyCmp      from '@/assets/products/honey/completo-semfundo.webp'
import honeyPng      from '@/assets/products/honey/pingente-semfundo.webp'
import capuGarrafa   from '@/assets/products/cappuccino/garrafa-semfundo.webp'
import capuCmp       from '@/assets/products/cappuccino/completo-semfundo.webp'
import capuPng       from '@/assets/products/cappuccino/pingente-semfundo.webp'
import blendGarrafa  from '@/assets/products/blended/garrafa-semfundo.webp'
import blendCmp      from '@/assets/products/blended/completo-semfundo.webp'
import blendPng      from '@/assets/products/blended/pingente-semfundo.webp'

const IMAGES: Record<string, string> = {
  'ML-HONEY-SG':  honeyGarrafa,
  'ML-HONEY-CMP': honeyCmp,
  'ML-HONEY-PNG': honeyPng,
  'ML-CAPU-SG':   capuGarrafa,
  'ML-CAPU-CMP':  capuCmp,
  'ML-CAPU-PNG':  capuPng,
  'ML-BLEND-SG':  blendGarrafa,
  'ML-BLEND-CMP': blendCmp,
  'ML-BLEND-PNG': blendPng,
}

export function getProductImage(sku: string): string | undefined {
  return IMAGES[sku]
}
