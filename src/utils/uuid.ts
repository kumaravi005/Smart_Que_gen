/**
 * UUID utility for PostgreSQL UUID column compatibility and deterministic mapping.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Checks if a string is a valid RFC 4122 UUID.
 */
export function isValidUuid(str?: string | null): boolean {
  if (!str) return false
  return UUID_REGEX.test(str.trim())
}

/**
 * Fast, deterministic 128-bit hash formatted as an RFC 4122 v4-compatible UUID.
 * Produces identical output for identical inputs across all browsers and platforms.
 */
export function deterministicUuid(namespace: string, input: string): string {
  if (isValidUuid(input)) {
    return input.toLowerCase()
  }

  const combined = `${namespace}:${input}`

  // 4 independent 32-bit FNV-1a variations to generate 128 bits
  let h1 = 0x811c9dc5
  let h2 = 0x811c9dc5 ^ 0x55555555
  let h3 = 0x811c9dc5 ^ 0x33333333
  let h4 = 0x811c9dc5 ^ 0x0f0f0f0f

  for (let i = 0; i < combined.length; i++) {
    const code = combined.charCodeAt(i)
    h1 = Math.imul(h1 ^ code, 0x01000193)
    h2 = Math.imul(h2 ^ (code + i), 0x01000193)
    h3 = Math.imul(h3 ^ (code * (i + 1)), 0x01000193)
    h4 = Math.imul(h4 ^ (code + 0x5a), 0x01000193)
  }

  // Format as 32 hex chars
  const hex = (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h3 >>> 0).toString(16).padStart(8, '0') +
    (h4 >>> 0).toString(16).padStart(8, '0')
  ).toLowerCase()

  // Set version 4 and variant 8/9/a/b
  const part1 = hex.slice(0, 8)
  const part2 = hex.slice(8, 12)
  const part3 = '4' + hex.slice(13, 16)
  const variantNibble = ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16)
  const part4 = variantNibble + hex.slice(17, 20)
  const part5 = hex.slice(20, 32)

  return `${part1}-${part2}-${part3}-${part4}-${part5}`
}

/**
 * Generates a fresh random UUID (standard crypto.randomUUID).
 */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return deterministicUuid('rnd', `${Date.now()}_${Math.random()}_${Math.random()}`)
}
