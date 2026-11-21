import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CertiFlow Database Seeding...');

  // 1. Create Districts
  const districtNorth = await prisma.district.upsert({
    where: { name: 'Hyderabad Central' },
    update: {},
    create: {
      name: 'Hyderabad Central',
      state: 'Pragati State',
    },
  });

  const districtSouth = await prisma.district.upsert({
    where: { name: 'Cyberabad South' },
    update: {},
    create: {
      name: 'Cyberabad South',
      state: 'Pragati State',
    },
  });

  console.log('✅ Districts created');

  // 2. Create Training Centres
  const trainingCentreApex = await prisma.trainingCentre.upsert({
    where: { code: 'TC-HYD-001' },
    update: {},
    create: {
      code: 'TC-HYD-001',
      name: 'Apex Skilling Academy',
      districtId: districtNorth.id,
    },
  });

  console.log('✅ Training Centre created: Apex Skilling Academy (TC-HYD-001)');

  // 3. Common Password Hash for Demo Accounts ("Password123!")
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  // 4. Create Demo Users
  const demoUsers = [
    {
      email: 'anika@certiflow.gov.in',
      name: 'Anika Sharma',
      role: Role.TRAINING_CENTRE,
      trainingCentreId: trainingCentreApex.id,
      districtId: districtNorth.id,
    },
    {
      email: 'dev@certiflow.gov.in',
      name: 'Dev Verma',
      role: Role.DISTRICT_OFFICER,
      districtId: districtNorth.id,
    },
    {
      email: 'meera@certiflow.gov.in',
      name: 'Meera Iyer',
      role: Role.DISTRICT_OFFICER,
      districtId: districtNorth.id,
    },
    {
      email: 'kabir@certiflow.gov.in',
      name: 'Kabir Das',
      role: Role.DISTRICT_OFFICER,
      districtId: districtNorth.id,
    },
    {
      email: 'neha@certiflow.gov.in',
      name: 'Neha Reddy',
      role: Role.QUALITY_TEAM,
      districtId: null,
    },
    {
      email: 'farah@certiflow.gov.in',
      name: 'Farah Khan',
      role: Role.STATE_OFFICE,
      districtId: null,
    },
  ];

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        passwordHash,
        trainingCentreId: u.trainingCentreId || null,
        districtId: u.districtId || null,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
        trainingCentreId: u.trainingCentreId || null,
        districtId: u.districtId || null,
      },
    });
    console.log(`👤 Seeded User: ${user.name} (${user.role}) - ${user.email}`);
  }

  // 5. System Configurations
  const configs = [
    {
      key: 'LARGE_BATCH_THRESHOLD',
      value: '25',
      description: 'Batches exceeding this number of candidates require Quality Review',
    },
    {
      key: 'APPROVAL_SLA_HOURS',
      value: '24',
      description: 'Hours before a pending approval is marked as OVERDUE',
    },
    {
      key: 'WHATSAPP_SIMULATION_MODE',
      value: 'RELIABLE_WITH_RETRY',
      description: 'Simulation strategy: RELIABLE_WITH_RETRY, FORCE_FAIL, or INSTANT_PASS',
    },
  ];

  for (const cfg of configs) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value, description: cfg.description },
      create: { key: cfg.key, value: cfg.value, description: cfg.description },
    });
  }

  console.log('⚙️ System configs seeded');
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
