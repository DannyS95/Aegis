import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationNotFoundException } from '../common/exceptions/conversation-not-found.exception';
import { NotConversationParticipantException } from '../common/exceptions/not-conversation-participant.exception';

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
        update: jest.fn(),
      },
      message: {
        create: jest.fn(),
        findMany: jest.fn(),
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
          message: {
            create: prisma.message.create,
          },
          conversation: {
            update: prisma.conversation.update,
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
    it('requires at least two participants', async () => {
      await expect(
        service.createConversation(creatorId, { participants: [] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects direct conversations that include more than two participants', async () => {
      await expect(
        service.createConversation(creatorId, {
          participants: [otherUserId, 'user-3'],
          isGroup: false,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('promotes the creator to owner for inferred group conversations', async () => {
      usersService.findManyByIds.mockResolvedValue([
        { id: creatorId },
        { id: otherUserId },
        { id: 'user-3' },
      ]);
      prisma.conversation.findFirst.mockResolvedValue(null);

      const conversationRecord = {
        id: 'conversation-group',
        title: 'Team',
        isGroup: true,
        lastMessageId: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        participants: [
          { ...sampleParticipant(creatorId), role: 'owner' },
          sampleParticipant(otherUserId),
          sampleParticipant('user-3'),
        ],
      };

      prisma.conversation.create.mockResolvedValue(conversationRecord);

      const response = await service.createConversation(creatorId, {
        participants: [otherUserId, 'user-3'],
        title: '  Team ',
      });

      expect(prisma.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isGroup: true,
            title: 'Team',
            participants: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ userId: creatorId, role: 'owner' }),
              ]),
            }),
          }),
        }),
      );
      expect(response.isGroup).toBe(true);
      expect(response.participants.find((p) => p.user.id === creatorId)?.role).toBe('owner');
    });

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
      prisma.conversation.update.mockResolvedValue(conversationRecord);

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

  describe('listConversations', () => {
    it('returns the denormalised lastMessageId for each conversation', async () => {
      const record = {
        id: 'conversation-1',
        title: null,
        isGroup: false,
        lastMessageId: 'message-9',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        participants: [sampleParticipant(creatorId), sampleParticipant(otherUserId)],
      };

      prisma.conversation.findMany.mockResolvedValue([record]);

      const result = await service.listConversations(creatorId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].lastMessageId).toBe('message-9');
    });
  });

  describe('getConversationById', () => {
    it('throws NotFound when conversation does not exist', async () => {
      prisma.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.getConversationById('missing', creatorId),
      ).rejects.toBeInstanceOf(ConversationNotFoundException);
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
      prisma.conversation.update.mockResolvedValue(refreshedConversation);

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
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conversation-1' },
        data: expect.objectContaining({ updatedAt: expect.any(Date) }),
      });
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
      prisma.conversation.update.mockResolvedValue(groupConversation);

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
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conversation-1' },
        data: expect.objectContaining({ updatedAt: expect.any(Date) }),
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
      prisma.conversation.update.mockResolvedValue(groupConversation);

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
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conversation-1' },
        data: expect.objectContaining({ updatedAt: expect.any(Date) }),
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

  describe('sendMessage', () => {
    const conversationId = 'conversation-1';
    const messageRecord = {
      id: 'msg-1',
      content: 'hello',
      senderId: creatorId,
      conversationId,
      createdAt: new Date(),
      readAt: null,
    };

    it('rejects when conversation is missing', async () => {
      prisma.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage(conversationId, creatorId, { content: 'hello' }),
      ).rejects.toBeInstanceOf(ConversationNotFoundException);
    });

    it('rejects when user is not a participant', async () => {
      prisma.conversation.findUnique.mockResolvedValue({
        id: conversationId,
        participants: [],
      });

      await expect(
        service.sendMessage(conversationId, creatorId, { content: 'hello' }),
      ).rejects.toBeInstanceOf(NotConversationParticipantException);
    });

    it('creates a message and updates lastMessageId', async () => {
      prisma.conversation.findUnique.mockResolvedValue({
        id: conversationId,
        participants: [{ userId: creatorId }],
      });
      prisma.message.create.mockResolvedValue(messageRecord);
      prisma.conversation.update.mockResolvedValue(undefined);

      const result = await service.sendMessage(conversationId, creatorId, { content: ' hello ' });

      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'hello',
            senderId: creatorId,
            conversationId,
          }),
        }),
      );
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: conversationId },
        data: { lastMessageId: messageRecord.id },
      });
      expect(result).toEqual(messageRecord);
    });
  });

  describe('listMessages', () => {
    const conversationId = 'conversation-1';
    const messageRecord = {
      id: 'msg-1',
      content: 'hello',
      senderId: creatorId,
      conversationId,
      createdAt: new Date(),
      readAt: null,
    };

    it('throws when conversation is missing', async () => {
      prisma.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.listMessages(conversationId, creatorId, {}),
      ).rejects.toBeInstanceOf(ConversationNotFoundException);
    });

    it('throws when user is not a participant', async () => {
      prisma.conversation.findUnique.mockResolvedValue({
        id: conversationId,
        participants: [],
      });

      await expect(
        service.listMessages(conversationId, creatorId, {}),
      ).rejects.toBeInstanceOf(NotConversationParticipantException);
    });

    it('paginates messages in descending order', async () => {
      prisma.conversation.findUnique.mockResolvedValue({
        id: conversationId,
        participants: [{ userId: creatorId }],
      });
      prisma.message.findMany.mockResolvedValue([messageRecord]);

      const result = await service.listMessages(conversationId, creatorId, { take: 10 });

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId },
          orderBy: { createdAt: 'desc' },
          take: 11,
        }),
      );
      expect(result).toEqual({ items: [messageRecord], nextCursor: null });
    });
  });
});
