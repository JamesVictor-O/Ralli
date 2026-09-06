import { ed25519 } from 'npm:@noble/curves@1.9.7/ed25519'
import { blake2b } from 'npm:@noble/hashes@1.8.0/blake2'
import { sha256 } from 'npm:@noble/hashes@1.8.0/sha2'

const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVXY'

export function normalizeNimiqAddress(address: string) {
  return address.replace(/\s/g, '').toUpperCase()
}

function ibanChecksum(value: string) {
  const rearranged = `${value.slice(4)}${value.slice(0, 4)}`
  let remainder = 0
  for (const character of rearranged) {
    const numeric = /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character
    for (const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder
}

export function isValidNimiqAddress(address: string) {
  const normalized = normalizeNimiqAddress(address)
  return /^NQ\d{2}[0-9A-HJ-NP-VXY]{32}$/.test(normalized) && ibanChecksum(normalized) === 1
}

function base32(bytes: Uint8Array) {
  let value = 0n
  for (const byte of bytes) value = (value << 8n) | BigInt(byte)

  let output = ''
  const groups = Math.ceil((bytes.length * 8) / 5)
  for (let index = groups - 1; index >= 0; index -= 1) {
    output += ALPHABET[Number((value >> BigInt(index * 5)) & 31n)]
  }
  return output
}

export function addressFromPublicKey(publicKey: Uint8Array) {
  const rawAddress = blake2b(publicKey, { dkLen: 32 }).slice(0, 20)
  const encoded = base32(rawAddress)
  const checksum = String(98 - ibanChecksum(`NQ00${encoded}`)).padStart(2, '0')
  return `NQ${checksum}${encoded}`
}

function hexToBytes(value: string, expectedBytes: number) {
  const normalized = value.toLowerCase().replace(/^0x/, '')
  if (!new RegExp(`^[0-9a-f]{${expectedBytes * 2}}$`).test(normalized)) throw new Error('INVALID_PROOF')
  return Uint8Array.from(normalized.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)))
}

export function verifyNimiqProof(message: string, claimedAddress: string, publicKeyHex: string, signatureHex: string, mode: 'raw' | 'hub' = 'raw') {
  const publicKey = hexToBytes(publicKeyHex, 32)
  const signature = hexToBytes(signatureHex, 64)
  if (addressFromPublicKey(publicKey) !== normalizeNimiqAddress(claimedAddress)) return false
  if (publicKey.every((byte) => byte === 0)) return false
  const messageBytes = new TextEncoder().encode(message)
  const signedBytes = mode === 'hub'
    ? sha256(new Uint8Array([
        ...new TextEncoder().encode('\u0016Nimiq Signed Message:\n'),
        ...new TextEncoder().encode(String(messageBytes.length)),
        ...messageBytes,
      ]))
    : messageBytes
  return ed25519.verify(signature, signedBytes, publicKey)
}

export function formatNimiqAddress(address: string) {
  return normalizeNimiqAddress(address).match(/.{1,4}/g)?.join(' ') ?? address
}
