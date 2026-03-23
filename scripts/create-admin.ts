import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create organization
  const org = await prisma.organization.upsert({
    where: { domain: 'clickprops.com' },
    update: {},
    create: {
      name: 'Sri Sai Builders',
      domain: 'clickprops.com'
    },
  })

  // Create admin user
  const password = await bcrypt.hash('ChangeMe123!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@clickprops.com' },
    update: {},
    create: {
      email: 'admin@clickprops.com',
      name: 'Admin User',
      password,
      orgId: org.id,
      status: 'active',
    },
  })

  // Create admin role
  const role = await prisma.role.upsert({
    where: { orgId_name: { orgId: org.id, name: 'admin' } },
    update: {},
    create: {
      name: 'admin',
      orgId: org.id,
      isSystem: true
    },
  })

  // Assign role to admin user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: role.id } },
    update: {},
    create: { userId: admin.id, roleId: role.id },
  })

  console.log('✅ Admin user created:', admin.email)
  console.log('📧 Email: admin@clickprops.com')
  console.log('🔐 Password: ChangeMe123!')
  console.log('⚠️  Change password on first login')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
