import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedUsers = [
  {
    username: 'alice',
    email: 'alice@example.com',
    avatarUrl: 'https://avatars.dicebear.com/api/initials/alice.svg',
    role: 'user',
  },
  {
    username: 'bob',
    email: 'bob@example.com',
    avatarUrl: 'https://avatars.dicebear.com/api/initials/bob.svg',
    role: 'user',
  },
  {
    username: 'charlie',
    email: 'charlie@example.com',
    avatarUrl: 'https://avatars.dicebear.com/api/initials/charlie.svg',
    role: 'user',
  },
  {
    username: 'admin',
    email: 'admin@example.com',
    avatarUrl: 'https://avatars.dicebear.com/api/initials/admin.svg',
    role: 'admin',
  },
];

async function main(): Promise<void> {
  await Promise.all(
    seedUsers.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          username: user.username,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
        create: user,
      }),
    ),
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console -- seed script should log errors
    console.error('Failed to seed users', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
