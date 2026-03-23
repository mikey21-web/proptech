const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    // Get/create organization
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: "Sri Sai Builders",
          email: "admin@clickprops.in",
          phone: "+919876543210",
        },
      });
    }

    // Create/update admin user
    const hashedPassword = await bcrypt.hash("ClickProps@2026", 10);
    await prisma.user.upsert({
      where: { email: "admin@clickprops.in" },
      create: {
        email: "admin@clickprops.in",
        name: "Admin",
        password: hashedPassword,
        status: "active",
        orgId: org.id,
      },
      update: { password: hashedPassword },
    });

    // Get/create super_admin role
    let role = await prisma.role.findUnique({
      where: { orgId_name: { orgId: org.id, name: "super_admin" } }
    }).catch(() => null);

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: "super_admin",
          orgId: org.id,
        },
      });
    }

    const user = await prisma.user.findUnique({ where: { email: "admin@clickprops.in" } });

    // Assign role
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      create: { userId: user.id, roleId: role.id },
      update: {},
    });

    console.log("\n✅ Admin account ready!");
    console.log("Email: admin@clickprops.in");
    console.log("Password: ClickProps@2026");

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
