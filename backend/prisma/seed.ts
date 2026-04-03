import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_SYMPTOMS = [
  { name: 'Headache', category: 'neurological' },
  { name: 'Fatigue', category: 'general' },
  { name: 'Joint Pain', category: 'pain' },
  { name: 'Muscle Pain', category: 'pain' },
  { name: 'Nausea', category: 'digestive' },
  { name: 'Brain Fog', category: 'neurological' },
  { name: 'Dizziness', category: 'neurological' },
  { name: 'Insomnia', category: 'sleep' },
  { name: 'Anxiety', category: 'mental' },
  { name: 'Stomach Pain', category: 'digestive' },
  { name: 'Back Pain', category: 'pain' },
];

const DEFAULT_HABITS = [
  { name: 'Sleep Duration', trackingType: 'DURATION' as const, unit: 'hours' },
  { name: 'Water Intake', trackingType: 'NUMERIC' as const, unit: 'glasses' },
  { name: 'Exercise', trackingType: 'BOOLEAN' as const, unit: null },
  { name: 'Alcohol', trackingType: 'BOOLEAN' as const, unit: null },
  { name: 'Caffeine', trackingType: 'NUMERIC' as const, unit: 'cups' },
];

async function main() {
  console.log('Seeding default symptoms...');
  for (const symptom of DEFAULT_SYMPTOMS) {
    await prisma.symptom.upsert({
      where: { id: `system-symptom-${symptom.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `system-symptom-${symptom.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: symptom.name,
        category: symptom.category,
        userId: null,
      },
    });
  }
  console.log(`✔ Seeded ${DEFAULT_SYMPTOMS.length} symptoms`);

  console.log('Seeding default habits...');
  for (const habit of DEFAULT_HABITS) {
    await prisma.habit.upsert({
      where: { id: `system-habit-${habit.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `system-habit-${habit.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: habit.name,
        trackingType: habit.trackingType,
        unit: habit.unit,
        userId: null,
      },
    });
  }
  console.log(`✔ Seeded ${DEFAULT_HABITS.length} habits`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
