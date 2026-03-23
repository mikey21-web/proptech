const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function check() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@clickprops.in' },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        password: true,
        deletedAt: true,
      },
    });

    console.log('User found:', user);

    if (user && user.password) {
      console.log('Password hash length:', user.password.length);
      console.log('Password hash starts with:', user.password.substring(0, 20));
    }

    const roles = await prisma.userRole.findMany({
      where: { userId: user?.id },
      include: { role: true },
    });

    console.log('User roles:', roles);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
