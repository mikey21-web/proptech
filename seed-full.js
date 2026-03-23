const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function randomPhone() {
  return `+91${pickRandom(["98","97","96","95","94"])}${String(randomInt(10000000,99999999))}`;
}

const FIRST = ["Rajesh","Suresh","Priya","Anitha","Kumar","Lakshmi","Venkatesh","Deepa","Srinivas","Meena","Ramesh","Kavitha","Ganesh","Divya","Manoj","Sumathi","Arun","Pavithra","Karthik","Sangeetha","Vijay","Revathi","Prasad","Nithya","Mohan","Janani","Ravi","Pooja","Senthil","Harini","Dinesh","Swathi","Balaji","Gayathri"];
const LAST = ["Krishnan","Raman","Subramanian","Natarajan","Sundaram","Pillai","Iyer","Murugan","Shanmugam","Rajendran","Govindan","Chelladurai","Palaniappan","Selvaraj","Dhandapani"];
const CITIES = ["Chennai","Coimbatore","Madurai","Trichy","Salem","Erode","Vellore"];

async function main() {
  console.log("=== ClickProps Full Seed ===\n");

  // Get existing org and admin
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: { name: "Sri Sai Builders", email: "admin@clickprops.in", phone: "+919876543210" }
    });
  }
  const orgId = org.id;
  console.log(`Org: ${org.name} (${orgId})`);

  // Ensure all roles exist
  const roleNames = ["super_admin","admin","sales_manager","backoffice","agent","customer"];
  const roles = {};
  for (const rn of roleNames) {
    let role = await prisma.role.findUnique({ where: { orgId_name: { orgId, name: rn } } }).catch(() => null);
    if (!role) {
      role = await prisma.role.create({ data: { name: rn, orgId, description: rn.replace("_"," ") } });
    }
    roles[rn] = role;
  }
  console.log("Roles ready:", Object.keys(roles).join(", "));

  // Get admin user
  let adminUser = await prisma.user.findUnique({ where: { email: "admin@clickprops.in" } });
  if (!adminUser) {
    const hash = await bcrypt.hash("ClickProps@2026", 10);
    adminUser = await prisma.user.create({
      data: { email: "admin@clickprops.in", name: "Admin User", password: hash, status: "active", orgId }
    });
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: roles.super_admin.id } });
  }
  console.log(`Admin: ${adminUser.email}`);

  // Create lead sources
  const sourceNames = ["Walk-in","Website","Agent Referral","Broker","WhatsApp","Facebook Ads","Google Ads","Newspaper"];
  const sources = [];
  for (const sn of sourceNames) {
    let src = await prisma.leadSource.findFirst({ where: { name: sn, orgId } });
    if (!src) {
      src = await prisma.leadSource.create({ data: { name: sn, orgId } });
    }
    sources.push(src);
  }
  console.log(`Lead sources: ${sources.length}`);

  // Create 6 projects with plots/flats
  const projectDefs = [
    { name: "Archer Homes 3D", city: "Chennai", type: "apartment", units: 280, plots: 0, flats: 40, priceMin: 2500000, priceMax: 5500000, status: "under_construction" },
    { name: "Diana Apartments", city: "Chennai", type: "apartment", units: 200, plots: 0, flats: 35, priceMin: 3500000, priceMax: 7500000, status: "under_construction" },
    { name: "Green Garden", city: "Chennai", type: "plot", units: 500, plots: 50, flats: 0, priceMin: 800000, priceMax: 2000000, status: "ready_to_move" },
    { name: "Royal Homes", city: "Chennai", type: "apartment", units: 180, plots: 0, flats: 30, priceMin: 3000000, priceMax: 6000000, status: "under_construction" },
    { name: "Mullai Nagar", city: "Chennai", type: "plot", units: 240, plots: 40, flats: 0, priceMin: 1000000, priceMax: 2500000, status: "upcoming" },
    { name: "Srinidhi Homes", city: "Chennai", type: "villa", units: 200, plots: 0, flats: 25, priceMin: 2800000, priceMax: 5000000, status: "under_construction" },
  ];

  const projects = [];
  for (const pd of projectDefs) {
    let project = await prisma.project.findFirst({ where: { name: pd.name, orgId } });
    if (!project) {
      project = await prisma.project.create({
        data: {
          name: pd.name,
          slug: pd.name.toLowerCase().replace(/\s+/g, "-"),
          type: pd.type,
          status: pd.status,
          address: `${pd.city}, Tamil Nadu`,
          city: pd.city,
          state: "Tamil Nadu",
          totalUnits: pd.units,
          orgId,
        }
      });
    }

    // Create plots
    const existingPlots = await prisma.plot.count({ where: { projectId: project.id } });
    if (existingPlots === 0) {
      for (let i = 0; i < pd.plots; i++) {
        const status = pickRandom(["available","available","available","booked","sold","reserved"]);
        await prisma.plot.create({
          data: {
            plotNumber: `P-${String(i+1).padStart(3,"0")}`,
            area: randomInt(600, 2400),
            dimensions: `${randomInt(20,60)}x${randomInt(30,80)}`,
            facing: pickRandom(["North","South","East","West","North-East","South-East"]),
            price: randomInt(pd.priceMin, pd.priceMax),
            status,
            projectId: project.id,
          }
        });
      }
    }

    // Create flats
    const existingFlats = await prisma.flat.count({ where: { projectId: project.id } });
    if (existingFlats === 0) {
      for (let i = 0; i < pd.flats; i++) {
        const floor = randomInt(1, 15);
        const status = pickRandom(["available","available","available","booked","sold","reserved"]);
        await prisma.flat.create({
          data: {
            flatNumber: `${floor}${String.fromCharCode(65 + (i % 4))}${String(i+1).padStart(2,"0")}`,
            floor,
            bedrooms: pickRandom([1,2,2,3,3]),
            bathrooms: pickRandom([1,2,2]),
            area: randomInt(600, 1800),
            superArea: randomInt(1000, 2500),
            facing: pickRandom(["North","South","East","West"]),
            price: randomInt(pd.priceMin, pd.priceMax),
            status,
            projectId: project.id,
          }
        });
      }
    }

    projects.push(project);
  }
  console.log(`Projects: ${projects.length}`);

  // Create 34 agent users + Agent records (agents first, teams after)
  const agentUsers = [];
  const existingAgentCount = await prisma.agent.count({ where: { orgId } });
  if (existingAgentCount === 0) {
    const hash = await bcrypt.hash("Agent@123", 10);
    for (let i = 0; i < 34; i++) {
      const first = FIRST[i % FIRST.length];
      const last = LAST[i % LAST.length];
      const name = `${first} ${last}`;
      const email = `${first.toLowerCase()}.${last.toLowerCase().slice(0,4)}${i}@srisaibuilders.com`;
      const role = i === 0 ? "sales_manager" : i < 5 ? "admin" : "agent";

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            password: hash,
            status: "active",
            orgId,
            createdAt: randomDate(new Date("2024-01-01"), new Date("2025-06-01")),
          }
        });
        await prisma.userRole.create({ data: { userId: user.id, roleId: roles[role].id } });
      }

      const agent = await prisma.agent.create({
        data: {
          agentCode: `AGT-${String(i+1).padStart(3,"0")}`,
          reraNumber: `RERA${randomInt(10000,99999)}`,
          panNumber: `${String.fromCharCode(65+randomInt(0,25))}${String.fromCharCode(65+randomInt(0,25))}${String.fromCharCode(65+randomInt(0,25))}P${String.fromCharCode(65+randomInt(0,25))}${randomInt(1000,9999)}${String.fromCharCode(65+randomInt(0,25))}`,
          isActive: Math.random() > 0.1,
          userId: user.id,
          orgId,
        }
      });
      agentUsers.push({ user, agent });
    }

    // Now create agent teams with leaders and assign members
    const teamNames = ["Alpha Team","Beta Team","Gamma Team","Delta Team"];
    for (let t = 0; t < teamNames.length; t++) {
      const leader = agentUsers[t]; // first 4 agents become team leaders
      const team = await prisma.agentTeam.create({
        data: {
          name: teamNames[t],
          leaderId: leader.agent.id,
        }
      });
      // Assign ~8 agents per team
      const startIdx = t * 8 + 4; // skip first 4 (leaders)
      const endIdx = Math.min(startIdx + 8, agentUsers.length);
      for (let m = startIdx; m < endIdx; m++) {
        await prisma.agent.update({
          where: { id: agentUsers[m].agent.id },
          data: { teamId: team.id }
        });
      }
      // Also assign leader to their own team
      await prisma.agent.update({
        where: { id: leader.agent.id },
        data: { teamId: team.id }
      });
    }
  } else {
    // Load existing agents if they exist
    const existingAgents = await prisma.agent.findMany({ where: { orgId }, include: { user: true } });
    for (const agent of existingAgents) {
      agentUsers.push({ user: agent.user, agent });
    }
  }
  console.log(`Agents: ${agentUsers.length}`);

  // Create 80 customers
  const customers = [];
  const existingCustomerCount = await prisma.customer.count({ where: { orgId } });
  if (existingCustomerCount === 0) {
    for (let i = 0; i < 80; i++) {
      const first = FIRST[(i + 10) % FIRST.length];
      const last = LAST[(i + 5) % LAST.length];
      const customer = await prisma.customer.create({
        data: {
          name: `${first} ${last}`,
          email: `${first.toLowerCase()}.${last.toLowerCase().slice(0,3)}${i}@gmail.com`,
          phone: randomPhone(),
          city: pickRandom(CITIES),
          address: `${randomInt(1,200)}, ${pickRandom(CITIES)}, Tamil Nadu`,
          orgId,
          createdAt: randomDate(new Date("2024-06-01"), new Date("2026-01-01")),
        }
      });
      customers.push(customer);
    }
  } else {
    const existingCustomers = await prisma.customer.findMany({ where: { orgId }, take: 80 });
    customers.push(...existingCustomers);
  }
  console.log(`Customers: ${customers.length}`);

  // Create 55 bookings totaling ~14.85 Cr
  const TARGET = 148500000;
  const existingBookingCount = await prisma.booking.count({ where: { orgId } });
  if (existingBookingCount === 0 && agentUsers.length > 0 && customers.length > 0) {
    const NUM = 55;
    const baseAmt = TARGET / NUM;
    const amounts = [];
    let sum = 0;
    for (let i = 0; i < NUM - 1; i++) {
      const amt = Math.round(baseAmt * (0.3 + Math.random() * 1.7));
      amounts.push(amt);
      sum += amt;
    }
    amounts.push(TARGET - sum);

    const allPlots = await prisma.plot.findMany({ where: { status: { in: ["booked","sold"] } }, take: 30 });
    const allFlats = await prisma.flat.findMany({ where: { status: { in: ["booked","sold"] } }, take: 30 });

    for (let i = 0; i < NUM; i++) {
      const customer = customers[i % customers.length];
      const agent = agentUsers[i % agentUsers.length];
      const project = projects[i % projects.length];
      const amt = amounts[i];
      const discount = Math.round(amt * randomInt(0, 5) / 100);
      const net = amt - discount;
      const paid = Math.round(net * pickRandom([0.2, 0.5, 0.8, 1.0]));
      const status = pickRandom(["confirmed","confirmed","confirmed","pending","agreement_signed","registration_done","possession_given"]);
      const bookingDate = randomDate(new Date("2024-06-01"), new Date("2026-03-15"));

      const plotId = allPlots[i % Math.max(allPlots.length, 1)]?.id || null;
      const flatId = !plotId && allFlats.length > 0 ? allFlats[i % allFlats.length]?.id : null;

      const booking = await prisma.booking.create({
        data: {
          bookingNumber: `BK-${String(i+1).padStart(4,"0")}`,
          status,
          bookingDate,
          totalAmount: amt,
          discountAmount: discount,
          netAmount: net,
          paidAmount: paid,
          balanceAmount: net - paid,
          customerId: customer.id,
          projectId: project.id,
          agentId: agent.agent.id,
          createdById: adminUser.id,
          plotId,
          flatId,
          orgId,
        }
      });

      // Create commission for agent
      const commPct = 0.5 + Math.random();
      await prisma.commission.create({
        data: {
          amount: Math.round(net * commPct / 100),
          percentage: parseFloat(commPct.toFixed(2)),
          status: pickRandom(["pending","approved","paid","paid"]),
          agentId: agent.agent.id,
          bookingId: booking.id,
        }
      });
    }
    console.log(`Bookings: ${NUM}`);
  }

  // Create 120 leads
  const existingLeadCount = await prisma.lead.count({ where: { orgId } });
  if (existingLeadCount === 0 && agentUsers.length > 0) {
    const statuses = ["new","new","contacted","contacted","qualified","qualified","negotiation","site_visit","proposal_sent","won","won","lost","junk"];
    const priorities = ["low","medium","medium","high","high","urgent"];

    for (let i = 0; i < 120; i++) {
      const first = FIRST[randomInt(0, FIRST.length-1)];
      const last = LAST[randomInt(0, LAST.length-1)];
      const agent = agentUsers[i % agentUsers.length];
      const project = projects[i % projects.length];

      await prisma.lead.create({
        data: {
          name: `${first} ${last}`,
          email: `${first.toLowerCase()}.${last.toLowerCase().slice(0,3)}${randomInt(1,9999)}@gmail.com`,
          phone: randomPhone(),
          status: pickRandom(statuses),
          priority: pickRandom(priorities),
          budget: randomInt(500000, 10000000),
          leadSourceId: pickRandom(sources).id,
          projectId: project.id,
          assignedToId: agent.user.id,
          createdById: adminUser.id,
          orgId,
          createdAt: randomDate(new Date("2024-06-01"), new Date("2026-03-18")),
        }
      });
    }
    console.log("Leads: 120");
  }

  // Summary
  const counts = await Promise.all([
    prisma.project.count({ where: { orgId } }),
    prisma.agent.count({ where: { orgId } }),
    prisma.customer.count({ where: { orgId } }),
    prisma.booking.count({ where: { orgId } }),
    prisma.lead.count({ where: { orgId } }),
    prisma.plot.count(),
    prisma.flat.count(),
    prisma.commission.count(),
    prisma.booking.aggregate({ where: { orgId }, _sum: { netAmount: true } }),
  ]);

  console.log("\n=== Seed Complete ===");
  console.log(`Projects:    ${counts[0]}`);
  console.log(`Agents:      ${counts[1]}`);
  console.log(`Customers:   ${counts[2]}`);
  console.log(`Bookings:    ${counts[3]}`);
  console.log(`Leads:       ${counts[4]}`);
  console.log(`Plots:       ${counts[5]}`);
  console.log(`Flats:       ${counts[6]}`);
  console.log(`Commissions: ${counts[7]}`);
  console.log(`Revenue:     ₹${(Number(counts[8]._sum.netAmount || 0) / 10000000).toFixed(2)} Cr`);
}

main()
  .catch(e => { console.error("Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
