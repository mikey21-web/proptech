const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkRole() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "admin@clickprops.in" },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    });

    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log("✅ User:", user.email);
    console.log("   Roles assigned:", user.userRoles.length);
    user.userRoles.forEach(ur => {
      console.log(`   - ${ur.role.name} (id: ${ur.role.id})`);
    });

    if (user.userRoles.length === 0) {
      console.log("\n⚠️  No roles assigned! User will get 'customer' role by default.");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRole();
