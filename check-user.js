const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "admin@clickprops.in" },
      select: { id: true, email: true, name: true, password: true, status: true }
    });

    if (!user) {
      console.log("❌ User not found in database");
      return;
    }

    console.log("✅ User found:");
    console.log("  Email:", user.email);
    console.log("  Name:", user.name);
    console.log("  Status:", user.status);
    console.log("  Has password:", !!user.password);

    if (user.password) {
      const isMatch = await bcrypt.compare("ClickProps@2026", user.password);
      console.log("  Password match:", isMatch ? "✅ YES" : "❌ NO");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
