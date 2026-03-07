

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@avelon.host'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const name = process.env.ADMIN_NAME || 'Administrator'

  console.log('Creating admin user...')
  console.log(`Email: ${email}`)

  const existing = await prisma.user.findUnique({ where: { email } })
  
  if (existing) {
    console.log('Admin user already exists!')
    
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' },
      })
      console.log('Updated role to ADMIN')
    }
    
    return
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  
  const admin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'ADMIN',
      balance: 0,
    },
  })

  console.log('Admin created successfully!')
  console.log(`ID: ${admin.id}`)
  console.log(`Email: ${admin.email}`)
  console.log(`Password: ${password}`)
  console.log('')
  console.log('⚠️  Change the password after first login!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
