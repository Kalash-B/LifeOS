// Idempotent seed: shared exercise library. Personal data is never seeded (spec §13).
import { PrismaClient } from '@prisma/client';

const exercises = [
  ['Bench Press', 'Chest', 'Barbell'],
  ['Incline Dumbbell Press', 'Chest', 'Dumbbell'],
  ['Push-up', 'Chest', 'Bodyweight'],
  ['Squat', 'Legs', 'Barbell'],
  ['Romanian Deadlift', 'Legs', 'Barbell'],
  ['Leg Press', 'Legs', 'Machine'],
  ['Lunge', 'Legs', 'Dumbbell'],
  ['Deadlift', 'Back', 'Barbell'],
  ['Pull-up', 'Back', 'Bodyweight'],
  ['Barbell Row', 'Back', 'Barbell'],
  ['Lat Pulldown', 'Back', 'Cable'],
  ['Overhead Press', 'Shoulders', 'Barbell'],
  ['Lateral Raise', 'Shoulders', 'Dumbbell'],
  ['Bicep Curl', 'Arms', 'Dumbbell'],
  ['Tricep Pushdown', 'Arms', 'Cable'],
  ['Plank', 'Core', 'Bodyweight'],
  ['Hanging Leg Raise', 'Core', 'Bodyweight'],
  ['Running', 'Cardio', 'None'],
  ['Cycling', 'Cardio', 'Machine'],
  ['Rowing', 'Cardio', 'Machine'],
];

const prisma = new PrismaClient();
for (const [name, muscleGroup, equipment] of exercises) {
  await prisma.exercise.upsert({ where: { name }, update: {}, create: { name, muscleGroup, equipment } });
}
console.log(`Seeded ${exercises.length} exercises`);
await prisma.$disconnect();
