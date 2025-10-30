import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';

const sampleParticipant = (userId: string) => ({
  userId,
  role: 'member',
  joinedAt: new Date('2024-01-01T00:00:00.000Z'),
  lastReadAt: null,
  muted: false,
  banned: false,
  user: {
    id: userId,
    username: `${userId}-name`,
    email: `${userId}@example.com`,
    avatarUrl: null,
  },
});

describe('ConversationsService', () => {
  const creatorId = 'user-1';
  const otherUserId = 'user-2';
  let prisma: any;
  let usersService: any;
  let service: ConversationsService;

  beforeEach(() => {
    prisma = {
      conversation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    usersService = {
      findManyByIds: jest.fn(),
    };

    service = new ConversationsService(prisma, usersService);
  });

  describe('createConversation', () => {
    it('creates a direct conversation when no duplicate exists', async () => {
      usersService.findManyByIds.mockResolvedValue([
        { id: creatorId },
        { id: otherUserId },
      ]);
      prisma.conversation.findFirst.mockResolvedValue(null);

      const conversationRecord = {
        id: 'conversation-1',
        title: null,
        isGroup: false,
        lastMessageId: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        participants: [sampleParticipant(creatorId), sampleParticipant(otherUserId)],
      };

      prisma.conversation.create.mockResolvedValue(conversationRecord);

      const response = await service.createConversation(creatorId, {
        participants: [otherUserId],
      });

      expect(prisma.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isGroup: false,
          }),
        }),
      );
      expect(response.id).toBe(conversationRecord.id);
      expect(response.participants).toHaveLength(2);
    });

    it('throws a conflict when a duplicate DM exists', async () => {
      usersService.findManyByIds.mockResolvedValue([
        { id: creatorId },
        { id: otherUserId },
      ]);

      prisma.conversation.findFirst.mockResolvedValue({
        participants: [{ userId: creatorId }, { userId: otherUserId }],
      });

      await expect(
        service.createConversation(creatorId, { participants: [otherUserId] }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('getConversationById', () => {
    it('throws NotFound when conversation does not exist', async () => {
      prisma.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.getConversationById('missing', creatorId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws Forbidden when user is not a participant', async () => {
      prisma.conversation.findUnique.mockResolvedValue({
        id: 'conversation-1',
        title: null,
        isGroup: false,
        lastMessageId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [sampleParticipant(otherUserId)],
      });

      await expect(
        service.getConversationById('conversation-1', creatorId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns conversation data when access is allowed', async () => {
      const record = {
        id: 'conversation-1',
        title: 'Project',
        isGroup: true,
        lastMessageId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [sampleParticipant(creatorId), sampleParticipant(otherUserId)],
      };

      prisma.conversation.findUnique.mockResolvedValue(record);

      const result = await service.getConversationById('conversation-1', creatorId);

      expect(result.id).toBe(record.id);
      expect(result.participants).toHaveLength(2);
    });
  });
});
