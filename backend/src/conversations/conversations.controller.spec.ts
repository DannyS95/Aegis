import { BadRequestException } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import {
  ConversationsService,
  type ConversationListResponse,
  type ConversationResponse,
} from './conversations.service';
import type { AuthenticatedUser } from '../security/guards/jwt-auth.guard';
import type { CreateConversationDto } from './dto/create-conversation.dto';
import type { ListConversationsQueryDto } from './dto/list-conversations.dto';
import type { AddParticipantsDto } from './dto/add-participants.dto';

const sampleConversation = (): ConversationResponse => ({
  id: 'conversation-1',
  title: 'Chat',
  isGroup: false,
  lastMessageId: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  participants: [],
});

const sampleListResponse = (): ConversationListResponse => ({
  items: [sampleConversation()],
  nextCursor: null,
});

describe('ConversationsController', () => {
  let controller: ConversationsController;
  let service: jest.Mocked<ConversationsService>;
  const user = { id: 'user-123' } as AuthenticatedUser;

  beforeEach(() => {
    service = {
      createConversation: jest.fn(),
      listConversations: jest.fn(),
      getConversationById: jest.fn(),
      addParticipants: jest.fn(),
      removeParticipant: jest.fn(),
    } as unknown as jest.Mocked<ConversationsService>;

    controller = new ConversationsController(service);
  });

  describe('createConversation', () => {
    const payload: CreateConversationDto = { participants: ['user-456'] };

    it('throws when no authenticated user is provided', () => {
      expect(() =>
        controller.createConversation(undefined as unknown as AuthenticatedUser, payload),
      ).toThrow(BadRequestException);
    });

    it('delegates to the service with the user id and body', async () => {
      const response = sampleConversation();
      service.createConversation.mockResolvedValue(response);

      const result = await controller.createConversation(user, payload);

      expect(service.createConversation).toHaveBeenCalledWith(user.id, payload);
      expect(result).toBe(response);
    });
  });

  describe('listConversations', () => {
    it('throws when user context is missing', () => {
      expect(() =>
        controller.listConversations(undefined as unknown as AuthenticatedUser, {}),
      ).toThrow(BadRequestException);
    });

    it('validates that take must be numeric', () => {
      expect(() => controller.listConversations(user, { take: 'invalid' })).toThrow(
        BadRequestException,
      );
    });

    it('coerces take to a number before delegating', async () => {
      const response = sampleListResponse();
      service.listConversations.mockResolvedValue(response);

      const query: ListConversationsQueryDto = { take: '10', cursor: 'cursor-1' };
      const result = await controller.listConversations(user, query);

      expect(service.listConversations).toHaveBeenCalledWith(user.id, {
        cursor: 'cursor-1',
        take: 10,
      });
      expect(result).toBe(response);
    });
  });

  describe('getConversation', () => {
    it('throws when user context is missing', () => {
      expect(() =>
        controller.getConversation('conversation-1', undefined as unknown as AuthenticatedUser),
      ).toThrow(BadRequestException);
    });

    it('requests the conversation from the service', async () => {
      const response = sampleConversation();
      service.getConversationById.mockResolvedValue(response);

      const result = await controller.getConversation('conversation-1234', user);

      expect(service.getConversationById).toHaveBeenCalledWith('conversation-1234', user.id);
      expect(result).toBe(response);
    });
  });

  describe('addParticipants', () => {
    const body: AddParticipantsDto = { participantIds: ['user-456'] };

    it('throws when user context is missing', () => {
      expect(() =>
        controller.addParticipants('conversation-1', undefined as unknown as AuthenticatedUser, body),
      ).toThrow(BadRequestException);
    });

    it('passes participant payloads to the service', async () => {
      const response = sampleConversation();
      service.addParticipants.mockResolvedValue(response);

      const result = await controller.addParticipants('conversation-1', user, body);

      expect(service.addParticipants).toHaveBeenCalledWith(
        'conversation-1',
        user.id,
        body.participantIds,
      );
      expect(result).toBe(response);
    });
  });

  describe('removeParticipant', () => {
    it('throws when user context is missing', () => {
      expect(() =>
        controller.removeParticipant(
          'conversation-1',
          'user-456',
          undefined as unknown as AuthenticatedUser,
        ),
      ).toThrow(BadRequestException);
    });

    it('delegates removal to the service', async () => {
      const response = sampleConversation();
      service.removeParticipant.mockResolvedValue(response);

      const result = await controller.removeParticipant('conversation-1', 'user-456', user);

      expect(service.removeParticipant).toHaveBeenCalledWith('conversation-1', user.id, 'user-456');
      expect(result).toBe(response);
    });
  });
});
