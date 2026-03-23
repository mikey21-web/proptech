/**
 * PII Encryption/Decryption using AES-256-GCM
 * Encrypts sensitive fields like PAN, Aadhaar, bank account numbers
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const ALGORITHM_VERSION = '1'

interface EncryptedData {
  iv: string
  authTag: string
  ciphertext: string
  version: string
}

function getEncryptionKey(): Buffer {
  const keyEnv = process.env.PII_ENCRYPTION_KEY

  if (!keyEnv) {
    console.warn(
      '⚠️  PII_ENCRYPTION_KEY not set. Using default key (NOT for production)'
    )
    // Default key for development only
    return Buffer.from('dev-key-32-bytes-minimum-required!', 'utf-8')
  }

  // Expect base64 encoded 32-byte key
  const key = Buffer.from(keyEnv, 'base64')
  if (key.length !== 32) {
    throw new Error('PII_ENCRYPTION_KEY must be 32 bytes (base64 encoded)')
  }

  return key
}

export function encryptPII(plaintext: string | null): string | null {
  if (!plaintext) return null

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  const data: EncryptedData = {
    version: ALGORITHM_VERSION,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted,
  }

  return JSON.stringify(data)
}

export function decryptPII(encrypted: string | null): string | null {
  if (!encrypted) return null

  try {
    const key = getEncryptionKey()
    const data: EncryptedData = JSON.parse(encrypted)

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(data.iv, 'hex')
    )

    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'))

    let decrypted = decipher.update(data.ciphertext, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Decryption failed:', error)
    return null
  }
}

/**
 * Prisma middleware for automatic encryption/decryption
 */
export function piiEncryptionMiddleware() {
  return async (params: any, next: any) => {
    const result = await next(params)

    // Auto-encrypt on create/update
    if (['create', 'update', 'upsert'].includes(params.action)) {
      if (params.args?.data) {
        const data = params.args.data
        if (data.panNumber) data.panNumber = encryptPII(data.panNumber)
        if (data.aadhaarNumber)
          data.aadhaarNumber = encryptPII(data.aadhaarNumber)
        if (data.bankAccount) data.bankAccount = encryptPII(data.bankAccount)
      }
    }

    // Auto-decrypt on read
    if (['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
      const decrypt = (obj: any) => {
        if (!obj) return obj
        if (obj.panNumber && typeof obj.panNumber === 'string')
          obj.panNumber = decryptPII(obj.panNumber)
        if (obj.aadhaarNumber && typeof obj.aadhaarNumber === 'string')
          obj.aadhaarNumber = decryptPII(obj.aadhaarNumber)
        if (obj.bankAccount && typeof obj.bankAccount === 'string')
          obj.bankAccount = decryptPII(obj.bankAccount)
        return obj
      }

      if (Array.isArray(result)) {
        return result.map(decrypt)
      }
      return decrypt(result)
    }

    return result
  }
}

/**
 * Generate encryption key for .env
 * Run: node -e "require('./lib/encryption').generateKey()"
 */
export function generateKey(): void {
  const key = crypto.randomBytes(32)
  console.log('PII_ENCRYPTION_KEY=' + key.toString('base64'))
}
