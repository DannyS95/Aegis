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
      participant: {
        createMany: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) =>
        callback({
          participant: {
            delete: prisma.participant.delete,
            update: prisma.participant.update,
          },
        }),
      ),
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

  describe('addParticipants', () => {
    const groupConversation = {
      id: 'conversation-1',
      title: 'Squad',
      isGroup: true,
      lastMessageId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: [
        { ...sampleParticipant(creatorId), role: 'owner' },
        sampleParticipant(otherUserId),
      ],
    };

    it('adds new members when requested by an owner', async () => {
      const refreshedConversation = {
        ...groupConversation,
        participants: [
          ...groupConversation.participants,
          sampleParticipant('user-3'),
        ],
      };

      prisma.conversation.findUnique
        .mockResolvedValueOnce(groupConversation)
        .mockResolvedValueOnce(refreshedConversation);

      usersService.findManyByIds.mockResolvedValue([{ id: 'user-3' }]);
      prisma.participant.createMany.mockResolvedValue({ count: 1 });

      const result = await service.addParticipants('conversation-1', creatorId, [
        'user-3',
      ]);

      expect(prisma.participant.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ userId: 'user-3', conversationId: 'conversation-1', role: 'member' }],
        }),
      );
      expect(result.participants).toHaveLength(3);
    });

    it('rejects non-owners attempting to add', async () => {
      prisma.conversation.findUnique.mockResolvedValue(groupConversation);

      await expect(
        service.addParticipants('conversation-1', otherUserId, ['user-3']),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('removeParticipant', () => {
    const groupConversation = {
      id: 'conversation-1',
      title: 'Squad',
      isGroup: true,
      lastMessageId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: [
        { ...sampleParticipant(creatorId), role: 'owner' },
        { ...sampleParticipant(otherUserId), joinedAt: new Date('2024-02-01T00:00:00.000Z') },
        { ...sampleParticipant('user-3'), joinedAt: new Date('2024-03-01T00:00:00.000Z') },
      ],
    };

    it('removes a participant when requested by an owner', async () => {
      prisma.conversation.findUnique
        .mockResolvedValueOnce(groupConversation)
        .mockResolvedValueOnce({
          ...groupConversation,
          participants: groupConversation.participants.filter(
            (participant) => participant.userId !== 'user-3',
          ),
        });

      prisma.participant.delete.mockResolvedValue(undefined);
      prisma.participant.update.mockResolvedValue(undefined);

      const result = await service.removeParticipant('conversation-1', creatorId, 'user-3');

      expect(prisma.participant.delete).toHaveBeenCalledWith({
        where: {
          conversationId_userId: {
            conversationId: 'conversation-1',
            userId: 'user-3',
          },
        },
      });
      expect(result.participants).toHaveLength(2);
    });

    it('promotes the oldest member when the owner leaves', async () => {
      const withoutOwner = {
        ...groupConversation,
        participants: groupConversation.participants.filter(
          (participant) => participant.userId !== creatorId,
        ),
      };

      prisma.conversation.findUnique
        .mockResolvedValueOnce(groupConversation)
        .mockResolvedValueOnce({
          ...withoutOwner,
          participants: withoutOwner.participants.map((participant, index) =>
            index === 0 ? { ...participant, role: 'owner' } : participant,
          ),
        });

      prisma.participant.delete.mockResolvedValue(undefined);
      prisma.participant.update.mockResolvedValue(undefined);

      const result = await service.removeParticipant('conversation-1', creatorId, creatorId);

      expect(prisma.participant.update).toHaveBeenCalledWith({
        where: {
          conversationId_userId: {
            conversationId: 'conversation-1',
            userId: otherUserId,
          },
        },
        data: { role: 'owner' },
      });
      expect(result.participants.find((p) => p.user.id === otherUserId)?.role).toBe('owner');
    });

    it('prevents members from removing others', async () => {
      prisma.conversation.findUnique.mockResolvedValue(groupConversation);

      await expect(
        service.removeParticipant('conversation-1', otherUserId, 'user-3'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
