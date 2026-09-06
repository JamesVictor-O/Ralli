import { assert, assertEquals } from 'jsr:@std/assert@1'
import { ed25519 } from 'npm:@noble/curves@1.9.7/ed25519'
import { sha256 } from 'npm:@noble/hashes@1.8.0/sha2'
import { addressFromPublicKey, isValidNimiqAddress, verifyNimiqProof } from './nimiq.ts'

const PUBLIC_KEY = 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'
const EMPTY_MESSAGE_SIGNATURE = 'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b'
const EXPECTED_ADDRESS = 'NQ17F14SQC29D05X3TTN5TY0SDP02URU6HJE'
const PRIVATE_KEY = '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60'

function fromHex(value: string) {
  return Uint8Array.from(value.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)))
}

Deno.test('derives the same address as Nimiq Core', () => {
  assertEquals(addressFromPublicKey(fromHex(PUBLIC_KEY)), EXPECTED_ADDRESS)
  assert(isValidNimiqAddress('NQ17 F14S QC29 D05X 3TTN 5TY0 SDP0 2URU 6HJE'))
})

Deno.test('verifies the Nimiq Ed25519 signature and address together', () => {
  assert(verifyNimiqProof('', EXPECTED_ADDRESS, PUBLIC_KEY, EMPTY_MESSAGE_SIGNATURE))
  assert(!verifyNimiqProof('tampered', EXPECTED_ADDRESS, PUBLIC_KEY, EMPTY_MESSAGE_SIGNATURE))
})

Deno.test('verifies Hub-prefixed signed messages', () => {
  const message = 'Verify this Ralli wallet'
  const messageBytes = new TextEncoder().encode(message)
  const payload = new Uint8Array([
    ...new TextEncoder().encode('\u0016Nimiq Signed Message:\n'),
    ...new TextEncoder().encode(String(messageBytes.length)),
    ...messageBytes,
  ])
  const signature = ed25519.sign(sha256(payload), fromHex(PRIVATE_KEY))
  const signatureHex = Array.from(signature, (byte) => byte.toString(16).padStart(2, '0')).join('')
  assert(verifyNimiqProof(message, EXPECTED_ADDRESS, PUBLIC_KEY, signatureHex, 'hub'))
  assert(!verifyNimiqProof(`${message}!`, EXPECTED_ADDRESS, PUBLIC_KEY, signatureHex, 'hub'))
})
