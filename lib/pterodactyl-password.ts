import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.PTERODACTYL_PASSWORD_KEY || 'default-key-change-in-production-32chars'
const ALGORITHM = 'aes-256-cbc'

export function generatePterodactylPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(16)
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(password, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decryptPassword(encryptedPassword: string): string {
  try {
    const [ivHex, encrypted] = encryptedPassword.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Failed to decrypt password:', error)
    return ''
  }
}

export function isEncryptedPassword(password: string): boolean {
  return password.includes(':') && password.length > 32
}