import * as zlib from 'zlib'

const streamToBytes = async (
  readable: ReadableStream<Uint8Array>,
): Promise<Uint8Array> => {
  const reader = readable.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((acc, c) => acc + c.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

const gzip = async (data: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    zlib.gzip(data, (err, result) => {
      if (err) reject(err)
      else resolve(btoa(String.fromCharCode(...new Uint8Array(result))))
    })
  })
}

const unGzip = async (data: string): Promise<string> => {
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  return new Promise((resolve, reject) => {
    zlib.gunzip(Buffer.from(bytes), (err, result) => {
      if (err) reject(err)
      else resolve(result.toString('utf-8'))
    })
  })
}

// Note: messages are gzip-compressed only; per-device AES encryption is not yet implemented
// (_keyInfo is reserved for future use)
export const encryptMsg = async (
  _keyInfo: LX.Sync.KeyInfo | null,
  msg: string,
): Promise<string> => {
  return msg.length > 1024 ? `cg_${await gzip(msg)}` : msg
}

export const decryptMsg = async (
  _keyInfo: LX.Sync.KeyInfo | null,
  enMsg: string,
): Promise<string> => {
  return enMsg.substring(0, 3) === 'cg_'
    ? await unGzip(enMsg.replace('cg_', ''))
    : enMsg
}
