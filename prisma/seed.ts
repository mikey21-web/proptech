/**
 * ClickProps CRM — Production Seed Data
 * Sri Sai Builders: 6 projects, 34 agents, 55 bookings (~₹14.85 Cr), 110+ leads, 105 customers
 *
 * Creates real records across all models matching schema.prisma exactly:
 * Organization, User, Role, Permission, UserRole, RolePermission, LeadSource,
 * LeadStatus, Agent, AgentTeam, CommissionStructure, CommissionRule, Project,
 * Plot, Flat, Amenity, Customer, Lead, Communication, Activity, Booking,
 * Installment, Payment, Transaction, Refund, Commission, Configuration,
 * BookingStatus, ProjectStatus, PaymentMode, LoanStatus
 */

import {
  PrismaClient,
  LeadStatusEnum,
  LeadPriority,
  BookingStatusEnum,
  PlotStatus,
  FlatStatus,
  PaymentModeEnum,
  PaymentStatus,
  InstallmentStatus,
  TransactionType,
  CommissionStatus,
  CommissionType,
  ProjectType,
  ProjectStatusEnum,
  CommunicationType,
  CommunicationDirection,
  ActivityType,
  RefundStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPhone(): string {
  const p = ["98", "97", "96", "95", "94", "93", "91", "90", "88", "87"];
  return `+91${pickRandom(p)}${String(randomInt(10000000, 99999999))}`;
}

function randomPAN(): string {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const c = (i: number) => a[i];
  return `${c(randomInt(0, 25))}${c(randomInt(0, 25))}${c(randomInt(0, 25))}P${c(randomInt(0, 25))}${randomInt(1000, 9999)}${c(randomInt(0, 25))}`;
}

function randomAadhaar(): string {
  return `${randomInt(1000, 9999)} ${randomInt(1000, 9999)} ${randomInt(1000, 9999)}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Expand permission specs like "lead.*" or "*" into [resource, action] pairs */
function expandPerms(
  specs: string[],
  resources: string[],
  actions: string[]
): Array<[string, string]> {
  const result: Array<[string, string]> = [];
  for (const spec of specs) {
    if (spec === "*") {
      for (const r of resources) for (const a of actions) result.push([r, a]);
    } else if (spec.endsWith(".*")) {
      const r = spec.slice(0, -2);
      for (const a of actions) result.push([r, a]);
    } else {
      const parts = spec.split(".");
      result.push([parts[0], parts[1]]);
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA POOLS
// ═══════════════════════════════════════════════════════════════════════════

const HASHED_PASSWORD =
  "$2a$12$LJ3dFmKvHPr2H.Zuqe6Wk.QnHFfMXjLqXlKjGJvYh1sZ6h2GFOYq"; // Admin@123

const FIRST_NAMES = [
  "Rajesh", "Suresh", "Priya", "Anitha", "Kumar", "Lakshmi", "Venkatesh",
  "Deepa", "Srinivas", "Meena", "Ramesh", "Kavitha", "Ganesh", "Divya",
  "Manoj", "Sumathi", "Arun", "Pavithra", "Karthik", "Sangeetha",
  "Vijay", "Revathi", "Prasad", "Nithya", "Mohan", "Janani", "Ravi",
  "Pooja", "Senthil", "Harini", "Dinesh", "Swathi", "Balaji", "Gayathri",
  "Ashok", "Bhavani", "Naveen", "Saranya", "Prakash", "Thenmozhi",
  "Selvam", "Malathi", "Murali", "Chithra", "Gopal", "Usha", "Anand",
  "Vasanthi", "Shankar", "Padma", "Hari", "Saraswathi", "Bala", "Gomathi",
  "Vignesh", "Kalpana", "Surya", "Indira", "Sathish", "Yamuna",
  "Arjun", "Radha", "Mahesh", "Suganya", "Kishore", "Vanitha",
  "Raghav", "Shanthi", "Prabhu", "Vani", "Kamal", "Amudha",
  "Dhinesh", "Ambika", "Jayakumar", "Renuka", "Sivakumar", "Mythili",
  "Ranjith", "Geetha", "Saravanan", "Hema", "Murugan", "Bharathi",
  "Kannan", "Jothika", "Ramkumar", "Meenakshi", "Mani", "Lalitha",
  "Vel", "Nirmala", "Sundaram", "Chitra", "Subramani", "Durga",
  "Palani", "Revathy", "Elango", "Selvi", "Ilango", "Thara",
];

const LAST_NAMES = [
  "Krishnan", "Raman", "Subramanian", "Natarajan", "Sundaram",
  "Pillai", "Iyer", "Iyengar", "Murugan", "Shanmugam",
  "Rajendran", "Govindan", "Balasubramanian", "Thirunavukarasu",
  "Chelladurai", "Palaniappan", "Arumugam", "Manickam",
  "Ramasamy", "Varadhan", "Nagarajan", "Kathiresan",
  "Selvaraj", "Dhandapani", "Chinnasamy", "Ganapathy",
  "Velusamy", "Kandasamy", "Periyasamy", "Thangavel",
  "Devaraj", "Mahalingam", "Karunanidhi", "Senthilkumar",
  "Baskaran", "Annamalai", "Muthusamy", "Duraisamy",
];

const CITIES = [
  "Chennai", "Coimbatore", "Madurai", "Trichy", "Salem",
  "Erode", "Tirunelveli", "Vellore", "Thanjavur", "Dindigul",
];

const AREAS = [
  "Anna Nagar", "T. Nagar", "Adyar", "Velachery", "Porur",
  "Tambaram", "Chromepet", "Perambur", "Avadi", "Ambattur",
  "KK Nagar", "Vadapalani", "Nungambakkam", "Mylapore", "Guindy",
  "Sholinganallur", "OMR", "ECR", "Pallavaram", "Medavakkam",
];

const LEAD_SOURCE_NAMES = [
  "Walk-in", "Website", "Agent Referral", "Broker",
  "WhatsApp", "Facebook", "Google Ads", "Newspaper",
];

const FACINGS = [
  "North", "South", "East", "West",
  "North-East", "North-West", "South-East", "South-West",
];

const EMAIL_DOMAINS = ["gmail.com", "yahoo.co.in", "hotmail.com", "outlook.com"];

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT DEFINITIONS (matching Blindersoe live data)
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectDef {
  name: string;
  location: string;
  city: string;
  totalUnits: number;
  bookedPercent: number;
  priceRange: [number, number]; // lakhs
  bedrooms: number;
  bathrooms: number;
  areaRange: [number, number]; // sq ft
  unitType: "plot" | "flat" | "villa";
  projectType: ProjectType;
  projectStatus: ProjectStatusEnum;
}

const PROJECTS: ProjectDef[] = [
  {
    name: "Archer Homes 3D",
    location: "Porur, Chennai",
    city: "Chennai",
    totalUnits: 280,
    bookedPercent: 83,
    priceRange: [25, 55],
    bedrooms: 2,
    bathrooms: 2,
    areaRange: [850, 1400],
    unitType: "flat",
    projectType: ProjectType.apartment,
    projectStatus: ProjectStatusEnum.under_construction,
  },
  {
    name: "Diana Apartments",
    location: "Anna Nagar, Chennai",
    city: "Chennai",
    totalUnits: 200,
    bookedPercent: 31,
    priceRange: [35, 75],
    bedrooms: 3,
    bathrooms: 2,
    areaRange: [1100, 1800],
    unitType: "flat",
    projectType: ProjectType.apartment,
    projectStatus: ProjectStatusEnum.under_construction,
  },
  {
    name: "Green Garden",
    location: "Tambaram, Chennai",
    city: "Chennai",
    totalUnits: 500,
    bookedPercent: 9,
    priceRange: [8, 20],
    bedrooms: 0,
    bathrooms: 0,
    areaRange: [600, 2400],
    unitType: "plot",
    projectType: ProjectType.plot,
    projectStatus: ProjectStatusEnum.ready_to_move,
  },
  {
    name: "Royal Homes",
    location: "Velachery, Chennai",
    city: "Chennai",
    totalUnits: 180,
    bookedPercent: 45,
    priceRange: [30, 60],
    bedrooms: 2,
    bathrooms: 2,
    areaRange: [900, 1500],
    unitType: "flat",
    projectType: ProjectType.apartment,
    projectStatus: ProjectStatusEnum.under_construction,
  },
  {
    name: "Mullai Nagar",
    location: "Chromepet, Chennai",
    city: "Chennai",
    totalUnits: 240,
    bookedPercent: 25,
    priceRange: [10, 25],
    bedrooms: 0,
    bathrooms: 0,
    areaRange: [800, 2000],
    unitType: "plot",
    projectType: ProjectType.plot,
    projectStatus: ProjectStatusEnum.ready_to_move,
  },
  {
    name: "Srinidhi Homes",
    location: "Medavakkam, Chennai",
    city: "Chennai",
    totalUnits: 200,
    bookedPercent: 35,
    priceRange: [28, 50],
    bedrooms: 3,
    bathrooms: 2,
    areaRange: [1000, 1600],
    unitType: "villa",
    projectType: ProjectType.villa,
    projectStatus: ProjectStatusEnum.under_construction,
  },
];

const TARGET_REVENUE = 14_85_00_000; // ₹14.85 Crore

// ═══════════════════════════════════════════════════════════════════════════
// RBAC CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const RESOURCES = [
  "lead", "booking", "customer", "project", "plot", "flat",
  "payment", "installment", "commission", "loan", "agent",
  "user", "role", "configuration", "audit", "webhook", "report",
];
const ACTIONS = ["create", "read", "update", "delete"];

const ROLE_PERM_SPECS: Record<string, string[]> = {
  super_admin: ["*"],
  admin: ["*"],
  sales_manager: [
    "lead.*", "customer.*",
    "booking.create", "booking.read", "booking.update",
    "project.read", "payment.read", "commission.read",
    "report.read", "agent.read",
  ],
  agent: [
    "lead.create", "lead.read", "lead.update",
    "customer.read", "project.read", "booking.read",
  ],
  backoffice: [
    "payment.*", "booking.*", "customer.*", "installment.*",
    "commission.read", "report.read",
  ],
  customer: ["booking.read", "payment.read"],
};

// ═══════════════════════════════════════════════════════════════════════════
// CLEAN DATABASE (TRUNCATE CASCADE)
// ═══════════════════════════════════════════════════════════════════════════

async function cleanDatabase() {
  console.log("  Truncating all tables...");
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  for (const { tablename } of tables) {
    if (tablename === "_prisma_migrations") continue;
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "public"."${tablename}" CASCADE`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED: Organization
// ═══════════════════════════════════════════════════════════════════════════

async function seedOrganization() {
  return prisma.organization.create({
    data: {
      name: "Sri Sai Builders",
      domain: "srisaibuilders.com",
      email: "info@srisaibuilders.com",
      phone: "+91-44-28150000",
      address: "123, Mount Road, Chennai - 600001",
      gstNumber: "33AACCS5055K1Z0",
      reraNumber: "TN/01/2024/0001",
      website: "https://srisaibuilders.com",
      settings: {
        currency: "INR",
        timezone: "Asia/Kolkata",
        dateFormat: "DD/MM/YYYY",
      },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED: Roles & Permissions
// ═══════════════════════════════════════════════════════════════════════════

async function seedRolesAndPermissions(orgId: string) {
  const roleNames = [
    "super_admin", "admin", "sales_manager", "agent", "backoffice", "customer",
  ];
  const roleDesc: Record<string, string> = {
    super_admin: "Full system access",
    admin: "Organization administrator",
    sales_manager: "Sales team manager",
    agent: "Field sales agent",
    backoffice: "Back-office operations",
    customer: "Customer portal access",
  };

  const roles: Record<string, { id: string }> = {};
  for (const name of roleNames) {
    roles[name] = await prisma.role.create({
      data: {
        name,
        description: roleDesc[name],
        isSystem: true,
        orgId,
      },
    });
  }

  // Create all CRUD permissions
  const permData = RESOURCES.flatMap((r) =>
    ACTIONS.map((a) => ({ resource: r, action: a, description: `${a} ${r}` }))
  );
  await prisma.permission.createMany({ data: permData, skipDuplicates: true });
  const allPerms = await prisma.permission.findMany();
  const permMap = new Map(
    allPerms.map((p) => [`${p.resource}.${p.action}`, p.id])
  );

  // Assign permissions to each role
  const rpData: Array<{ roleId: string; permissionId: string }> = [];
  for (const [roleName, specs] of Object.entries(ROLE_PERM_SPECS)) {
    const expanded = expandPerms(specs, RESOURCES, ACTIONS);
    for (const [r, a] of expanded) {
      const pid = permMap.get(`${r}.${a}`);
      if (pid) rpData.push({ roleId: roles[roleName].id, permissionId: pid });
    }
  }
  await prisma.rolePermission.createMany({ data: rpData, skipDuplicates: true });

  return roles;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED: Admin User
// ═══════════════════════════════════════════════════════════════════════════

async function seedAdminUser(orgId: string, superAdminRoleId: string) {
  const admin = await prisma.user.create({
    data: {
      name: "Sri Sai Admin",
      email: "admin@clickprops.in",
      password: HASHED_PASSWORD,
      orgId,
      createdAt: new Date("2024-06-01"),
    },
  });
  await prisma.userRole.create({
    data: { userId: admin.id, roleId: superAdminRoleId },
  });
  return admin;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED: Lead Sources
// ═══════════════════════════════════════════════════════════════════════════

async function seedLeadSources(orgId: string) {
  await prisma.leadSource.createMany({
    data: LEAD_SOURCE_NAMES.map((name) => ({ name, orgId })),
    skipDuplicates: true,
  });
  return prisma.leadSource.findMany({ where: { orgId } });
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED: Commission Structure
// ═══════════════════════════════════════════════════════════════════════════

async function seedCommissionStructure(orgId: string) {
  return prisma.commissionStructure.create({
    data: {
      name: "Default Commission Plan",
      type: CommissionType.tiered,
      isDefault: true,
      isActive: true,
      orgId,
      rules: {
        create: [
          { minAmount: 0, maxAmount: 2000000, percentage: 0.5, description: "Up to ₹20L" },
          { minAmount: 2000000, maxAmount: 5000000, percentage: 0.75, description: "₹20L–50L" },
          { minAmount: 5000000, percentage: 1.0, description: "Above ₹50L" },
        ],
      },
    },
    include: { rules: true },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED: Agents & Teams
// ═══════════════════════════════════════════════════════════════════════════

interface AgentInfo {
  userId: string;
  agentId: string;
  name: string;
  roleName: string;
}

async function seedAgents(orgId: string, roles: Record<string, { id: string }>) {
  const agents: AgentInfo[] = [];
  const now = new Date();
  let agentNum = 1;

  async function makeAgent(
    name: string,
    email: string,
    roleName: string,
    joinDate: Date
  ): Promise<AgentInfo> {
    const user = await prisma.user.create({
      data: { name, email, password: HASHED_PASSWORD, orgId, createdAt: joinDate, updatedAt: now },
    });
    const agent = await prisma.agent.create({
      data: {
        agentCode: `SSB-${String(agentNum++).padStart(4, "0")}`,
        userId: user.id,
        orgId,
        isActive: true,
      },
    });
    await prisma.userRole.create({
      data: { userId: user.id, roleId: roles[roleName].id },
    });
    return { userId: user.id, agentId: agent.id, name, roleName };
  }

  // 1 Senior Manager
  agents.push(
    await makeAgent("Rajesh Krishnan", "rajesh.k@clickprops.in", "sales_manager", new Date("2024-02-01"))
  );

  // 4 Team Leads
  const tlDefs = [
    { name: "Suresh Raman", email: "suresh.ram@clickprops.in" },
    { name: "Anitha Natarajan", email: "anitha.nat@clickprops.in" },
    { name: "Venkatesh Pillai", email: "venkatesh.pil@clickprops.in" },
    { name: "Deepa Subramanian", email: "deepa.sub@clickprops.in" },
  ];
  const teamLeads: AgentInfo[] = [];
  for (const tl of tlDefs) {
    const a = await makeAgent(
      tl.name, tl.email, "sales_manager",
      randomDate(new Date("2024-03-01"), new Date("2024-06-01"))
    );
    agents.push(a);
    teamLeads.push(a);
  }

  // Create 4 teams
  const teams = [];
  for (let i = 0; i < 4; i++) {
    const team = await prisma.agentTeam.create({
      data: {
        name: `Team ${teamLeads[i].name.split(" ")[0]}`,
        description: `Sales team led by ${teamLeads[i].name}`,
        leaderId: teamLeads[i].agentId,
      },
    });
    await prisma.agent.update({
      where: { id: teamLeads[i].agentId },
      data: { teamId: team.id },
    });
    teams.push(team);
  }

  // 29 Field Agents (8 + 7 + 7 + 7)
  const teamSizes = [8, 7, 7, 7];
  let nameIdx = 0;
  for (let t = 0; t < 4; t++) {
    for (let i = 0; i < teamSizes[t]; i++) {
      const first = FIRST_NAMES[nameIdx % FIRST_NAMES.length];
      const last = LAST_NAMES[nameIdx % LAST_NAMES.length];
      const email = `${first.toLowerCase()}.${last.toLowerCase().slice(0, 4)}${nameIdx}@clickprops.in`;
      nameIdx++;

      const a = await makeAgent(
        `${first} ${last}`, email, "agent",
        randomDate(new Date("2024-04-01"), new Date("2024-10-01"))
      );
      agents.push(a);
      await prisma.agent.update({
        where: { id: a.agentId },
        data: { teamId: teams[t].id },
      });
    }
  }

  return { agents, teams };
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED: Projects & Inventory
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectRecord {
  id: string;
  def: ProjectDef;
}

async function seedProjects(orgId: string): Promise<ProjectRecord[]> {
  const records: ProjectRecord[] = [];

  for (const def of PROJECTS) {
    const project = await prisma.project.create({
      data: {
        name: def.name,
        slug: slugify(def.name),
        description: `${
          def.unitType === "plot" ? "Premium plots" : def.unitType === "villa" ? "Luxury villas" : "Modern apartments"
        } at ${def.location}. ${def.totalUnits} units. Project by Sri Sai Builders.`,
        type: def.projectType,
        status: def.projectStatus,
        address: def.location,
        city: def.city,
        state: "Tamil Nadu",
        totalArea: (def.areaRange[0] + def.areaRange[1]) / 2,
        totalUnits: def.totalUnits,
        orgId,
      },
    });
    records.push({ id: project.id, def });

    // Create units
    if (def.unitType === "flat") {
      await createFlats(project.id, def);
    } else {
      await createPlots(project.id, def);
    }

    // Add amenities for non-plot projects
    if (def.unitType !== "plot") {
      const amenityNames = [
        "Swimming Pool", "Gym", "Children's Play Area", "Clubhouse",
        "24/7 Security", "Power Backup", "Car Parking", "Landscaped Garden",
      ];
      await prisma.amenity.createMany({
        data: amenityNames.map((name) => ({ name, projectId: project.id })),
        skipDuplicates: true,
      });
    }
  }

  return records;
}

async function createFlats(projectId: string, def: ProjectDef) {
  const perFloor = 8;
  const data = [];
  for (let i = 0; i < def.totalUnits; i++) {
    const floor = Math.floor(i / perFloor) + 1;
    const unit = (i % perFloor) + 1;
    const area = randomInt(def.areaRange[0], def.areaRange[1]);
    const ppsf = randomInt(
      Math.round((def.priceRange[0] * 100000) / def.areaRange[1]),
      Math.round((def.priceRange[1] * 100000) / def.areaRange[0])
    );
    data.push({
      flatNumber: `${floor}${String(unit).padStart(2, "0")}`,
      floor,
      bedrooms: def.bedrooms,
      bathrooms: def.bathrooms,
      area,
      superArea: Math.round(area * 1.25),
      facing: pickRandom(FACINGS),
      price: area * ppsf,
      pricePerSqft: ppsf,
      status: FlatStatus.available,
      projectId,
    });
  }
  await prisma.flat.createMany({ data });
}

async function createPlots(projectId: string, def: ProjectDef) {
  const data = [];
  for (let i = 0; i < def.totalUnits; i++) {
    const area = randomInt(def.areaRange[0], def.areaRange[1]);
    const ppsf = randomInt(
      Math.round((def.priceRange[0] * 100000) / def.areaRange[1]),
      Math.round((def.priceRange[1] * 100000) / def.areaRange[0])
    );
    const w = Math.round(Math.sqrt(area * 0.75));
    const d = Math.round(area / w);
    data.push({
      plotNumber: `P-${String(i + 1).padStart(3, "0")}`,
      area,
      dimensions: `${w}x${d}`,
      facing: pickRandom(FACINGS),
      price: area * ppsf,
      pricePerSqft: ppsf,
      status: PlotStatus.available,
      projectId,
    });
  }
  await prisma.plot.createMany({ data });
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED: Customers (Customer model, NOT User)
// ═══════════════════════════════════════════════════════════════════════════

async function seedCustomers(count: number, orgId: string) {
  const customers: Array<{ id: string; name: string; phone: string; email: string | null }> = [];

  for (let i = 0; i < count; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[i % LAST_NAMES.length];
    const city = pickRandom(CITIES);
    const email = `${first.toLowerCase()}.${last.toLowerCase().slice(0, 4)}${i}@${pickRandom(EMAIL_DOMAINS)}`;

    const cust = await prisma.customer.create({
      data: {
        name: `${first} ${last}`,
        email,
        phone: randomPhone(),
        address: `${randomInt(1, 200)}, ${pickRandom(AREAS)}, ${city}, Tamil Nadu - ${randomInt(600001, 643999)}`,
        city,
        state: "Tamil Nadu",
        pincode: String(randomInt(600001, 643999)),
        panNumber: randomPAN(),
        aadhaarNumber: randomAadhaar(),
        occupation: pickRandom([
          "Business", "IT Professional", "Doctor", "Government",
          "Teacher", "Engineer", "Accountant", "Lawyer",
        ]),
        orgId,
        createdAt: randomDate(new Date("2024-06-01"), new Date("2025-12-01")),
      },
    });
    customers.push({ id: cust.id, name: cust.name, phone: cust.phone, email: cust.email });
  }

  return customers;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED: Pipeline Leads (non-booking)
// ═══════════════════════════════════════════════════════════════════════════

async function seedLeads(
  count: number,
  orgId: string,
  agents: AgentInfo[],
  projects: ProjectRecord[],
  leadSources: Array<{ id: string; name: string }>
) {
  const fieldAgents = agents.filter((a) => a.roleName === "agent");
  const now = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 18);

  // Weighted status pool
  const statusPool: LeadStatusEnum[] = [
    ...Array<LeadStatusEnum>(15).fill(LeadStatusEnum.new),
    ...Array<LeadStatusEnum>(20).fill(LeadStatusEnum.contacted),
    ...Array<LeadStatusEnum>(15).fill(LeadStatusEnum.qualified),
    ...Array<LeadStatusEnum>(10).fill(LeadStatusEnum.negotiation),
    ...Array<LeadStatusEnum>(15).fill(LeadStatusEnum.site_visit),
    ...Array<LeadStatusEnum>(10).fill(LeadStatusEnum.proposal_sent),
    ...Array<LeadStatusEnum>(10).fill(LeadStatusEnum.lost),
    ...Array<LeadStatusEnum>(5).fill(LeadStatusEnum.junk),
  ];

  for (let i = 0; i < count; i++) {
    const first = FIRST_NAMES[randomInt(0, FIRST_NAMES.length - 1)];
    const last = LAST_NAMES[randomInt(0, LAST_NAMES.length - 1)];
    const project = pickRandom(projects);
    const agent = pickRandom(fieldAgents);
    const source = pickRandom(leadSources);
    const status = pickRandom(statusPool);
    const leadDate = randomDate(start, now);

    const lead = await prisma.lead.create({
      data: {
        name: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase().slice(0, 3)}${randomInt(1, 9999)}@${pickRandom(EMAIL_DOMAINS)}`,
        phone: randomPhone(),
        status,
        priority: pickRandom([LeadPriority.low, LeadPriority.medium, LeadPriority.high, LeadPriority.urgent]),
        budget: randomInt(project.def.priceRange[0], project.def.priceRange[1]) * 100000,
        source: source.name,
        notes: `Interested in ${project.def.name}. Requirement: ${
          project.def.unitType === "plot"
            ? `${randomInt(600, 2400)} sq ft plot`
            : `${project.def.bedrooms} BHK ${project.def.unitType}`
        }`,
        orgId,
        assignedToId: agent.userId,
        createdById: agent.userId,
        leadSourceId: source.id,
        projectId: project.id,
        createdAt: leadDate,
      },
    });

    // 2-4 communications per lead
    const commCount = randomInt(2, 4);
    for (let c = 0; c < commCount; c++) {
      const commDate = new Date(leadDate.getTime() + c * randomInt(1, 7) * 86400000);
      await prisma.communication.create({
        data: {
          type: pickRandom([
            CommunicationType.call, CommunicationType.email,
            CommunicationType.whatsapp, CommunicationType.meeting,
          ]),
          direction: pickRandom([CommunicationDirection.inbound, CommunicationDirection.outbound]),
          subject: `Follow-up with ${first} ${last}`,
          body: `Discussed ${project.def.name} project details and pricing.`,
          leadId: lead.id,
          userId: agent.userId,
          createdAt: commDate,
        },
      });
    }

    // 1 activity per lead
    await prisma.activity.create({
      data: {
        type: ActivityType.note,
        title: `Lead created from ${source.name}`,
        description: `New lead ${first} ${last} interested in ${project.def.name}`,
        leadId: lead.id,
        userId: agent.userId,
        createdAt: leadDate,
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED: Bookings (55 → ~₹14.85 Crore)
// ═══════════════════════════════════════════════════════════════════════════

async function seedBookings(
  count: number,
  orgId: string,
  agents: AgentInfo[],
  projects: ProjectRecord[],
  customers: Array<{ id: string; name: string; phone: string; email: string | null }>
) {
  const fieldAgents = agents.filter((a) => a.roleName === "agent");
  const now = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 18);

  // Pre-compute amounts to hit target revenue
  const base = TARGET_REVENUE / count;
  const amounts: number[] = [];
  let sum = 0;
  for (let i = 0; i < count - 1; i++) {
    const amt = Math.round(base * (0.2 + Math.random() * 1.8));
    amounts.push(amt);
    sum += amt;
  }
  amounts.push(TARGET_REVENUE - sum);

  // Shuffle
  for (let i = amounts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [amounts[i], amounts[j]] = [amounts[j], amounts[i]];
  }

  // Status distribution for 55 bookings
  const statusPool: BookingStatusEnum[] = [
    ...Array<BookingStatusEnum>(5).fill(BookingStatusEnum.pending),
    ...Array<BookingStatusEnum>(12).fill(BookingStatusEnum.confirmed),
    ...Array<BookingStatusEnum>(10).fill(BookingStatusEnum.agreement_signed),
    ...Array<BookingStatusEnum>(10).fill(BookingStatusEnum.registration_done),
    ...Array<BookingStatusEnum>(13).fill(BookingStatusEnum.possession_given),
    ...Array<BookingStatusEnum>(3).fill(BookingStatusEnum.cancelled),
    ...Array<BookingStatusEnum>(2).fill(BookingStatusEnum.refunded),
  ];

  const PAID_STATUSES: BookingStatusEnum[] = [
    BookingStatusEnum.agreement_signed,
    BookingStatusEnum.registration_done,
    BookingStatusEnum.possession_given,
  ];

  let totalRevenue = 0;

  for (let i = 0; i < count; i++) {
    const project = pickRandom(projects);
    const customer = customers[i % customers.length];
    const agent = pickRandom(fieldAgents);
    const status = statusPool[i % statusPool.length];
    const bookingDate = randomDate(start, now);
    const amount = amounts[i];
    const discount = Math.round(amount * randomInt(0, 5) / 100);
    const netAmount = amount - discount;
    const gst = Math.round(netAmount * 0.05);

    // Find an available unit
    let plotId: string | null = null;
    let flatId: string | null = null;

    if (project.def.unitType === "flat") {
      const flat = await prisma.flat.findFirst({
        where: { projectId: project.id, status: FlatStatus.available },
      });
      if (flat) {
        flatId = flat.id;
        const unitSt =
          status === BookingStatusEnum.cancelled || status === BookingStatusEnum.refunded
            ? FlatStatus.available
            : ([BookingStatusEnum.registration_done, BookingStatusEnum.possession_given] as string[]).includes(status)
            ? FlatStatus.sold
            : FlatStatus.booked;
        await prisma.flat.update({ where: { id: flat.id }, data: { status: unitSt } });
      }
    } else {
      const plot = await prisma.plot.findFirst({
        where: { projectId: project.id, status: PlotStatus.available },
      });
      if (plot) {
        plotId = plot.id;
        const unitSt =
          status === BookingStatusEnum.cancelled || status === BookingStatusEnum.refunded
            ? PlotStatus.available
            : ([BookingStatusEnum.registration_done, BookingStatusEnum.possession_given] as string[]).includes(status)
            ? PlotStatus.sold
            : PlotStatus.booked;
        await prisma.plot.update({ where: { id: plot.id }, data: { status: unitSt } });
      }
    }

    // Calculate paid amount
    const advanceAmt = Math.round(netAmount * 0.2);
    const midAmt = Math.round(netAmount * 0.3);
    const finalAmt = netAmount - advanceAmt - midAmt;

    let paidAmount = 0;
    if (status !== BookingStatusEnum.pending) paidAmount += advanceAmt;
    if (PAID_STATUSES.includes(status)) paidAmount += midAmt;
    if (status === BookingStatusEnum.possession_given) paidAmount += finalAmt;
    if (status === BookingStatusEnum.cancelled || status === BookingStatusEnum.refunded) {
      paidAmount = advanceAmt;
    }

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: `BK-${String(i + 1).padStart(4, "0")}`,
        status,
        bookingDate,
        totalAmount: amount,
        discountAmount: discount,
        netAmount,
        paidAmount,
        balanceAmount: netAmount - paidAmount,
        gstAmount: gst,
        orgId,
        customerId: customer.id,
        projectId: project.id,
        plotId,
        flatId,
        agentId: agent.agentId,
        createdById: agent.userId,
      },
    });

    // ── Installments ───────────────────────────────────────────────────
    const instDefs = [
      {
        no: 1,
        amount: advanceAmt,
        dueDate: bookingDate,
        status:
          status !== BookingStatusEnum.pending
            ? InstallmentStatus.paid
            : InstallmentStatus.due,
      },
      {
        no: 2,
        amount: midAmt,
        dueDate: new Date(bookingDate.getTime() + 90 * 86400000),
        status: PAID_STATUSES.includes(status)
          ? InstallmentStatus.paid
          : status === BookingStatusEnum.cancelled || status === BookingStatusEnum.refunded
          ? InstallmentStatus.cancelled
          : InstallmentStatus.upcoming,
      },
      {
        no: 3,
        amount: finalAmt,
        dueDate: new Date(bookingDate.getTime() + 270 * 86400000),
        status:
          status === BookingStatusEnum.possession_given
            ? InstallmentStatus.paid
            : status === BookingStatusEnum.cancelled || status === BookingStatusEnum.refunded
            ? InstallmentStatus.cancelled
            : InstallmentStatus.upcoming,
      },
    ];

    for (const inst of instDefs) {
      await prisma.installment.create({
        data: {
          installmentNo: inst.no,
          amount: inst.amount,
          dueDate: inst.dueDate,
          paidAmount: inst.status === InstallmentStatus.paid ? inst.amount : 0,
          status: inst.status,
          paidDate:
            inst.status === InstallmentStatus.paid
              ? new Date(inst.dueDate.getTime() + randomInt(0, 14) * 86400000)
              : null,
          bookingId: booking.id,
        },
      });
    }

    // ── Payments + Transactions for paid installments ──────────────────
    const payModes = [
      PaymentModeEnum.bank_transfer,
      PaymentModeEnum.upi,
      PaymentModeEnum.cheque,
      PaymentModeEnum.cash,
    ];

    for (const inst of instDefs) {
      if (inst.status === InstallmentStatus.paid) {
        const payDate = new Date(
          inst.dueDate.getTime() + randomInt(0, 14) * 86400000
        );
        const refNo = `REF${randomInt(100000, 999999)}`;

        const payment = await prisma.payment.create({
          data: {
            receiptNumber: `RCP-${String(i + 1).padStart(4, "0")}-${inst.no}`,
            amount: inst.amount,
            mode: pickRandom(payModes),
            status: PaymentStatus.verified,
            paymentDate: payDate,
            referenceNo: refNo,
            bookingId: booking.id,
          },
        });

        await prisma.transaction.create({
          data: {
            type: TransactionType.payment,
            amount: inst.amount,
            description: `Installment ${inst.no} payment`,
            referenceNo: refNo,
            bookingId: booking.id,
            paymentId: payment.id,
          },
        });
      }
    }

    // ── Refund for cancelled/refunded bookings ────────────────────────
    if (
      status === BookingStatusEnum.cancelled ||
      status === BookingStatusEnum.refunded
    ) {
      const refundAmt = Math.round(advanceAmt * 0.9); // 10% forfeiture
      await prisma.refund.create({
        data: {
          amount: refundAmt,
          reason:
            status === BookingStatusEnum.cancelled
              ? "Customer cancelled booking"
              : "Full refund processed",
          status:
            status === BookingStatusEnum.refunded
              ? RefundStatus.completed
              : RefundStatus.processing,
          bookingId: booking.id,
          processedAt:
            status === BookingStatusEnum.refunded ? new Date() : null,
        },
      });

      await prisma.transaction.create({
        data: {
          type: TransactionType.refund,
          amount: -refundAmt,
          description: "Refund for cancelled booking",
          bookingId: booking.id,
        },
      });
    }

    // ── Commission ────────────────────────────────────────────────────
    const commRate = amount < 2000000 ? 0.5 : amount < 5000000 ? 0.75 : 1.0;
    const commAmt = Math.round(netAmount * commRate / 100);
    const commStatus =
      status === BookingStatusEnum.possession_given
        ? CommissionStatus.paid
        : status === BookingStatusEnum.cancelled || status === BookingStatusEnum.refunded
        ? CommissionStatus.cancelled
        : PAID_STATUSES.includes(status)
        ? CommissionStatus.approved
        : CommissionStatus.pending;

    await prisma.commission.create({
      data: {
        amount: commAmt,
        percentage: commRate,
        status: commStatus,
        approvedAt:
          commStatus === CommissionStatus.approved || commStatus === CommissionStatus.paid
            ? new Date()
            : null,
        paidAt: commStatus === CommissionStatus.paid ? new Date() : null,
        agentId: agent.agentId,
        bookingId: booking.id,
      },
    });

    // ── Converted lead for this booking ───────────────────────────────
    await prisma.lead.create({
      data: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        status: LeadStatusEnum.won,
        priority: LeadPriority.high,
        orgId,
        assignedToId: agent.userId,
        createdById: agent.userId,
        projectId: project.id,
        customerId: customer.id,
        createdAt: new Date(
          bookingDate.getTime() - randomInt(7, 60) * 86400000
        ),
      },
    });

    totalRevenue += amount;
  }

  return totalRevenue;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED: Reference / Lookup Data
// ═══════════════════════════════════════════════════════════════════════════

async function seedReferenceData() {
  await prisma.leadStatus.createMany({
    data: [
      { name: "new", color: "#3B82F6", sortOrder: 1 },
      { name: "contacted", color: "#F59E0B", sortOrder: 2 },
      { name: "qualified", color: "#10B981", sortOrder: 3 },
      { name: "negotiation", color: "#8B5CF6", sortOrder: 4 },
      { name: "site_visit", color: "#EC4899", sortOrder: 5 },
      { name: "proposal_sent", color: "#6366F1", sortOrder: 6 },
      { name: "won", color: "#059669", sortOrder: 7, isFinal: true },
      { name: "lost", color: "#EF4444", sortOrder: 8, isFinal: true },
      { name: "junk", color: "#6B7280", sortOrder: 9, isFinal: true },
    ],
    skipDuplicates: true,
  });

  await prisma.bookingStatus.createMany({
    data: [
      { name: "pending", color: "#F59E0B", sortOrder: 1 },
      { name: "confirmed", color: "#3B82F6", sortOrder: 2 },
      { name: "agreement_signed", color: "#8B5CF6", sortOrder: 3 },
      { name: "registration_done", color: "#10B981", sortOrder: 4 },
      { name: "possession_given", color: "#059669", sortOrder: 5 },
      { name: "cancelled", color: "#EF4444", sortOrder: 6 },
      { name: "refunded", color: "#6B7280", sortOrder: 7 },
    ],
    skipDuplicates: true,
  });

  await prisma.projectStatus.createMany({
    data: [
      { name: "upcoming", color: "#F59E0B", sortOrder: 1 },
      { name: "under_construction", color: "#3B82F6", sortOrder: 2 },
      { name: "ready_to_move", color: "#10B981", sortOrder: 3 },
      { name: "completed", color: "#059669", sortOrder: 4 },
      { name: "on_hold", color: "#EF4444", sortOrder: 5 },
      { name: "cancelled", color: "#6B7280", sortOrder: 6 },
    ],
    skipDuplicates: true,
  });

  await prisma.paymentMode.createMany({
    data: [
      { name: "cash", sortOrder: 1 },
      { name: "cheque", sortOrder: 2 },
      { name: "bank_transfer", sortOrder: 3 },
      { name: "upi", sortOrder: 4 },
      { name: "credit_card", sortOrder: 5 },
      { name: "debit_card", sortOrder: 6 },
      { name: "demand_draft", sortOrder: 7 },
      { name: "emi", sortOrder: 8 },
      { name: "loan", sortOrder: 9 },
      { name: "other", sortOrder: 10 },
    ],
    skipDuplicates: true,
  });

  await prisma.loanStatus.createMany({
    data: [
      { name: "applied", color: "#F59E0B", sortOrder: 1 },
      { name: "documents_submitted", color: "#3B82F6", sortOrder: 2 },
      { name: "under_review", color: "#8B5CF6", sortOrder: 3 },
      { name: "sanctioned", color: "#10B981", sortOrder: 4 },
      { name: "disbursed", color: "#059669", sortOrder: 5 },
      { name: "rejected", color: "#EF4444", sortOrder: 6 },
      { name: "closed", color: "#6B7280", sortOrder: 7 },
    ],
    skipDuplicates: true,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED: Configuration (org settings)
// ═══════════════════════════════════════════════════════════════════════════

async function seedConfigurations(orgId: string) {
  await prisma.configuration.createMany({
    data: [
      { key: "org.name", value: "Sri Sai Builders", type: "string", orgId },
      { key: "org.phone", value: "+91-44-28150000", type: "string", orgId },
      { key: "org.email", value: "info@srisaibuilders.com", type: "string", orgId },
      { key: "org.address", value: "123, Mount Road, Chennai - 600001", type: "string", orgId },
      { key: "notifications.email.enabled", value: "true", type: "boolean", orgId },
      { key: "notifications.whatsapp.enabled", value: "true", type: "boolean", orgId },
      { key: "notifications.sms.enabled", value: "false", type: "boolean", orgId },
      { key: "security.session.timeout", value: "480", type: "number", orgId },
      { key: "security.mfa.enabled", value: "false", type: "boolean", orgId },
      { key: "commission.default.rate", value: "1.0", type: "number", orgId },
      { key: "booking.advance.percent", value: "20", type: "number", orgId },
      { key: "appearance.theme", value: "light", type: "string", orgId },
      { key: "appearance.primaryColor", value: "#2563EB", type: "string", orgId },
    ],
    skipDuplicates: true,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║      ClickProps CRM — Seed Data           ║");
  console.log("╚═══════════════════════════════════════════╝\n");

  await cleanDatabase();

  console.log(" 1/11 Organization...");
  const org = await seedOrganization();

  console.log(" 2/11 Roles & permissions...");
  const roles = await seedRolesAndPermissions(org.id);

  console.log(" 3/11 Admin user...");
  await seedAdminUser(org.id, roles.super_admin.id);

  console.log(" 4/11 Lead sources...");
  const leadSources = await seedLeadSources(org.id);

  console.log(" 5/11 Commission structure...");
  await seedCommissionStructure(org.id);

  console.log(" 6/11 Agents & teams (34 agents)...");
  const { agents } = await seedAgents(org.id, roles);

  console.log(" 7/11 Projects & inventory (6 projects, 1600 units)...");
  const projects = await seedProjects(org.id);

  console.log(" 8/11 Customers (105)...");
  const customers = await seedCustomers(105, org.id);

  console.log(" 9/11 Pipeline leads (110)...");
  await seedLeads(110, org.id, agents, projects, leadSources);

  console.log("10/11 Bookings (55 → ~₹14.85 Cr)...");
  const totalRevenue = await seedBookings(55, org.id, agents, projects, customers);

  console.log("11/11 Reference data & configuration...");
  await seedReferenceData();
  await seedConfigurations(org.id);

  const revCr = (totalRevenue / 10000000).toFixed(2);
  const fieldAgents = agents.filter((a) => a.roleName === "agent").length;

  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log("║              SEED COMPLETE                     ║");
  console.log("╠═══════════════════════════════════════════════╣");
  console.log(`║  Organization : Sri Sai Builders               ║`);
  console.log(`║  Projects     : ${projects.length}                              ║`);
  console.log(`║  Inventory    : ${PROJECTS.reduce((s, p) => s + p.totalUnits, 0)} units                     ║`);
  console.log(`║  Agents       : ${agents.length} (1 SM + 4 TL + ${fieldAgents} agents)    ║`);
  console.log(`║  Customers    : ${customers.length}                           ║`);
  console.log(`║  Leads        : 165 (110 pipeline + 55 booking) ║`);
  console.log(`║  Bookings     : 55                              ║`);
  console.log(`║  Revenue      : ₹${revCr} Crore                  ║`);
  console.log("╚═══════════════════════════════════════════════╝\n");
  console.log("Test credentials:");
  console.log("  Admin : admin@clickprops.in / Admin@123");
  console.log("  Agent : rajesh.k@clickprops.in / Admin@123\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
