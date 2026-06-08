import { md5 } from '@noble/hashes/legacy.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import * as aesjs from 'aes-js'

const b64ToBytes = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

const bytesToB64 = (bytes: Uint8Array): string => {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

const pkcs7Pad = (data: Uint8Array): Uint8Array => {
  const padLen = 16 - (data.length % 16)
  const padded = new Uint8Array(data.length + padLen)
  padded.set(data)
  padded.fill(padLen, data.length)
  return padded
}

const pkcs7Unpad = (data: Uint8Array): Uint8Array => {
  const padLen = data[data.length - 1]
  if (padLen < 1 || padLen > 16) throw new Error('invalid PKCS7 padding')
  return data.slice(0, data.length - padLen)
}

export const aesEncrypt = (text: string, key: string): string => {
  const keyBytes = b64ToBytes(key)
  const textBytes = pkcs7Pad(new TextEncoder().encode(text))
  const ecb = new aesjs.ModeOfOperation.ecb(keyBytes)
  return bytesToB64(ecb.encrypt(textBytes))
}

export const aesDecrypt = (text: string, key: string): string => {
  const keyBytes = b64ToBytes(key)
  const encBytes = b64ToBytes(text)
  const ecb = new aesjs.ModeOfOperation.ecb(keyBytes)
  const decrypted = pkcs7Unpad(ecb.decrypt(encBytes))
  return new TextDecoder().decode(decrypted)
}

export const rsaEncrypt = async (
  data: string | Uint8Array,
  pemKey: string,
): Promise<string> => {
  const b64 = pemKey
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '')
  const der = b64ToBytes(b64)
  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    der,
    { name: 'RSA-OAEP', hash: 'SHA-1' },
    false,
    ['encrypt'],
  )
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    cryptoKey,
    bytes,
  )
  return bytesToB64(new Uint8Array(encrypted))
}

export const toMD5 = (str: string): string =>
  bytesToHex(md5(new TextEncoder().encode(str)))
