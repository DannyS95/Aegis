import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedUsers = [
  {
    username: 'alice',
    email: 'alice@example.com',
    avatarUrl: 'https://avatars.dicebear.com/api/initials/alice.svg',
  },
  {
    username: 'bob',
    email: 'bob@example.com',
    avatarUrl: 'https://avatars.dicebear.com/api/initials/bob.svg',
  },
  {
    username: 'charlie',
    email: 'charlie@example.com',
    avatarUrl: 'https://avatars.dicebear.com/api/initials/charlie.svg',
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
