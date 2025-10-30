import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(async () => {
    prisma.user.findUnique = jest.fn();
    prisma.user.findMany = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('delegates findById to prisma', async () => {
    const expected = { id: 'user-123', email: 'user@example.com' };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(expected);

    await expect(service.findById('user-123')).resolves.toEqual(expected);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
    });
  });

  it('delegates findManyByIds to prisma and preserves order', async () => {
    const ids = ['user-1', 'user-2'];
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    await service.findManyByIds(ids);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ids,
        },
      },
    });
  });

  it('returns empty array when findManyByIds receives no ids', async () => {
    await expect(service.findManyByIds([])).resolves.toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('lists all users with a fixed projection', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    await service.listAll();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  });
});
