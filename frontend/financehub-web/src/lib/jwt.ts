function base64UrlToBytes(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

export function decodeJwtPayload(token: string | null): Record<string, unknown> {
  if (!token) {
    return {}
  }

  const [, payload] = token.split('.')
  if (!payload) {
    return {}
  }

  try {
    const bytes = base64UrlToBytes(payload)
    const json = new TextDecoder().decode(bytes)
    const decoded = JSON.parse(json)
    return typeof decoded === 'object' && decoded !== null ? decoded : {}
  } catch {
    return {}
  }
}
