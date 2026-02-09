import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ConversationNotFoundException } from '../common/exceptions/conversation-not-found.exception';
import { NotConversationParticipantException } from '../common/exceptions/not-conversation-participant.exception';
import { ConversationTitleService } from './conversation-title.service';

interface ListConversationsQuery {
  cursor?: string;
  take?: number;
}

interface ListMessagesQuery {
  cursor?: string;
  take?: number;
}

interface ConversationParticipantResponse {
  user: {
    id: string;
    username: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  role: string;
  joinedAt: Date;
  lastReadAt: Date | null;
  muted: boolean;
  banned: boolean;
}

export interface MessageReactionResponse {
  emoji: string;
  count: number;
  reactedByCurrentUser: boolean;
}

export interface ConversationResponse {
  id: string;
  title: string | null;
  isGroup: boolean;
  lastMessageId: string | null;
  lastMessagePreview?: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants: ConversationParticipantResponse[];
}

export interface ConversationListResponse {
  items: ConversationResponse[];
  nextCursor: string | null;
}

export interface MessageResponse {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  createdAt: Date;
  readAt: Date | null;
  reactions: MessageReactionResponse[];
}

export interface MessageListResponse {
  items: MessageResponse[];
  nextCursor: string | null;
}

export interface ToggleReactionResponse {
  action: 'added' | 'removed';
  messageId: string;
  emoji: string;
  reactions: MessageReactionResponse[];
}

const participantUserSelect = {
  id: true,
  username: true,
  email: true,
  avatarUrl: true,
} as const;

const conversationInclude = {
  participants: {
    include: {
      user: {
        select: participantUserSelect,
      },
    },
    orderBy: {
      joinedAt: 'asc',
    },
  },
} as const;

const messageSelect = {
  id: true,
  content: true,
  senderId: true,
  conversationId: true,
  createdAt: true,
  readAt: true,
} as const;

const messageWithReactionsSelect = {
  ...messageSelect,
  reactions: {
    select: {
      emoji: true,
      userId: true,
    },
  },
} as const;

type MessageRow = {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  createdAt: Date;
  readAt: Date | null;
};

type ReactionRow = {
  emoji: string;
  userId: string;
};

interface ConversationWithParticipants {
  id: string;
  title: string | null;
  isGroup: boolean;
  lastMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants: Array<{
    userId: string;
    conversationId: string;
    role: string;
    joinedAt: Date;
    lastReadAt: Date | null;
    muted: boolean;
    banned: boolean;
    user: {
      id: string;
      username: string | null;
      email: string | null;
      avatarUrl: string | null;
    };
  }>;
}

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly conversationTitleService: ConversationTitleService,
  ) {}

  async createConversation(
    creatorId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationResponse> {
    const participantIds = this.normaliseParticipantIds(
      dto.participants,
      creatorId,
    );

    if (participantIds.length < 2) {
      throw new BadRequestException(
        'A conversation requires at least two participants.',
      );
    }

    const isGroupConversation = dto.isGroup ?? participantIds.length > 2;

    if (!isGroupConversation && participantIds.length !== 2) {
      throw new BadRequestException(
        'A direct conversation must include exactly two participants.',
      );
    }

    await this.assertUsersExist(participantIds);

    if (!isGroupConversation) {
      await this.assertDirectConversationIsUnique(participantIds);
    }

    const conversationRecord = await this.prisma.conversation.create({
      data: {
        title: this.conversationTitleService.resolveTitle(dto.title),
        isGroup: isGroupConversation,
        participants: {
          create: participantIds.map((userId) => ({
            userId,
            role:
              isGroupConversation && userId === creatorId ? 'owner' : 'member',
          })),
        },
      },
      include: conversationInclude,
    });

    return this.mapConversation(conversationRecord);
  }

  async listConversations(
    userId: string,
    query: ListConversationsQuery = {},
  ): Promise<ConversationListResponse> {
    const take = this.resolveTake(query.take);

    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: take + 1,
      skip: query.cursor ? 1 : 0,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      include: conversationInclude,
    });

    const hasMore = conversations.length > take;
    const paginatedConversations = hasMore
      ? conversations.slice(0, take)
      : conversations;
    const lastMessagePreviewByConversationId =
      await this.buildLastMessagePreviewMap(paginatedConversations);

    return {
      items: paginatedConversations.map((conversation) =>
        this.mapConversation(
          conversation,
          lastMessagePreviewByConversationId.get(conversation.id) ?? null,
        ),
      ),
      nextCursor: hasMore ? conversations[take].id : null,
    };
  }

  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<ConversationResponse> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });

    if (!conversation) {
      throw new ConversationNotFoundException();
    }

    const isParticipant = conversation.participants.some(
      (participant) => participant.userId === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException(
        'You do not have access to this conversation.',
      );
    }

    const lastMessagePreviewByConversationId =
      await this.buildLastMessagePreviewMap([conversation]);

    return this.mapConversation(
      conversation,
      lastMessagePreviewByConversationId.get(conversation.id) ?? null,
    );
  }

  async addParticipants(
    conversationId: string,
    requesterId: string,
    participantIds: string[] | undefined,
  ): Promise<ConversationResponse> {
    const uniqueIds = this.extractParticipantIds(participantIds);
    if (!uniqueIds.length) {
      throw new BadRequestException('Provide at least one participant to add.');
    }

    const { conversation } = await this.loadGroupConversationForAction(
      conversationId,
      requesterId,
      'Cannot add participants to a direct conversation.',
      {
        requireOwner: true,
        ownerErrorMessage: 'Only owners can add participants.',
      },
    );

    const existingIds = new Set(
      conversation.participants.map((participant) => participant.userId),
    );

    const candidates = uniqueIds.filter((id) => !existingIds.has(id));

    if (!candidates.length) {
      throw new ConflictException(
        'All supplied participants already belong to the conversation.',
      );
    }

    await this.assertUsersExist(candidates);

    await this.prisma.participant.createMany({
      data: candidates.map((userId) => ({
        userId,
        conversationId,
        role: 'member',
      })),
      skipDuplicates: true,
    });

    await this.touchConversation(conversationId);

    const refreshed = await this.fetchConversationOrThrow(conversationId);
    return this.mapConversation(refreshed);
  }

  async removeParticipant(
    conversationId: string,
    requesterId: string,
    participantId: string,
  ): Promise<ConversationResponse> {
    const { conversation, requester } =
      await this.loadGroupConversationForAction(
        conversationId,
        requesterId,
        'Cannot remove participants from a direct conversation.',
      );

    const target = conversation.participants.find(
      (participant) => participant.userId === participantId,
    );

    if (!target) {
      throw new NotFoundException('Participant not found.');
    }

    const removingSelf = participantId === requesterId;

    if (!removingSelf && requester.role !== 'owner') {
      throw new ForbiddenException(
        'Only owners can remove other participants.',
      );
    }

    const promoteUserId =
      target.role === 'owner'
        ? this.resolveNextOwner(conversation.participants, participantId)
        : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.participant.delete({
        where: {
          conversationId_userId: {
            conversationId,
            userId: participantId,
          },
        },
      });

      if (promoteUserId) {
        await tx.participant.update({
          where: {
            conversationId_userId: {
              conversationId,
              userId: promoteUserId,
            },
          },
          data: {
            role: 'owner',
          },
        });
      }
    });

    await this.touchConversation(conversationId);

    const refreshed = await this.fetchConversationOrThrow(conversationId);
    return this.mapConversation(refreshed);
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: { content: string },
  ): Promise<MessageResponse> {
    const membership = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        participants: {
          where: { userId: senderId },
          select: { userId: true },
        },
      },
    });

    if (!membership) {
      throw new ConversationNotFoundException();
    }

    if (!membership.participants.length) {
      throw new NotConversationParticipantException();
    }

    const normalizedContent = dto.content.trim();

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          content: normalizedContent,
          senderId,
          conversationId,
        },
        select: messageSelect,
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageId: created.id },
      });

      return created;
    });

    return {
      ...message,
      reactions: [],
    };
  }

  async listMessages(
    conversationId: string,
    userId: string,
    query: ListMessagesQuery = {},
  ): Promise<MessageListResponse> {
    const limit = this.resolveMessageTake(query.take);

    const membership = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        participants: {
          where: { userId },
          select: { userId: true },
        },
      },
    });

    if (!membership) {
      throw new ConversationNotFoundException();
    }

    if (!membership.participants.length) {
      throw new NotConversationParticipantException();
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      skip: query.cursor ? 1 : 0,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      select: messageWithReactionsSelect,
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    return {
      items: items.map((message) => this.mapMessage(message, userId)),
      nextCursor: hasMore ? messages[limit].id : null,
    };
  }

  async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<ToggleReactionResponse> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        conversation: {
          select: {
            participants: {
              where: { userId },
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    if (!message.conversation.participants.length) {
      throw new NotConversationParticipantException();
    }

    const normalisedEmoji = this.normaliseEmoji(emoji);
    let action: ToggleReactionResponse['action'] = 'added';

    try {
      await this.prisma.messageReaction.create({
        data: {
          messageId,
          userId,
          emoji: normalisedEmoji,
        },
      });
    } catch (error) {
      if (!this.isUniqueConstraintViolation(error)) {
        throw error;
      }

      await this.prisma.messageReaction.deleteMany({
        where: {
          messageId,
          userId,
          emoji: normalisedEmoji,
        },
      });

      action = 'removed';
    }

    const reactions = await this.prisma.messageReaction.findMany({
      where: { messageId },
      select: {
        emoji: true,
        userId: true,
      },
    });

    return {
      action,
      messageId,
      emoji: normalisedEmoji,
      reactions: this.mapReactions(reactions, userId),
    };
  }

  private async assertDirectConversationIsUnique(participantIds: string[]) {
    const existing = await this.prisma.conversation.findFirst({
      where: {
        isGroup: false,
        participants: {
          every: {
            userId: {
              in: participantIds,
            },
          },
        },
        AND: participantIds.map((userId) => ({
          participants: {
            some: { userId },
          },
        })),
      },
      include: {
        participants: true,
      },
    });

    if (existing && existing.participants.length === participantIds.length) {
      throw new ConflictException(
        'A direct conversation between these users already exists.',
      );
    }
  }

  private mapConversation(
    conversation: ConversationWithParticipants,
    lastMessagePreview: string | null = null,
  ): ConversationResponse {
    return {
      id: conversation.id,
      title: conversation.title ?? null,
      isGroup: conversation.isGroup,
      lastMessageId: conversation.lastMessageId ?? null,
      lastMessagePreview,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      participants: conversation.participants.map((participant) => ({
        user: {
          id: participant.user.id,
          username: participant.user.username,
          email: participant.user.email,
          avatarUrl: participant.user.avatarUrl,
        },
        role: participant.role,
        joinedAt: participant.joinedAt,
        lastReadAt: participant.lastReadAt ?? null,
        muted: participant.muted,
        banned: participant.banned,
      })),
    };
  }

  private mapMessage(
    message: MessageRow & { reactions: ReactionRow[] },
    currentUserId: string,
  ): MessageResponse {
    return {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      conversationId: message.conversationId,
      createdAt: message.createdAt,
      readAt: message.readAt,
      reactions: this.mapReactions(message.reactions, currentUserId),
    };
  }

  private mapReactions(
    reactions: ReactionRow[],
    currentUserId: string,
  ): MessageReactionResponse[] {
    const grouped = new Map<
      string,
      { count: number; reactedByCurrentUser: boolean }
    >();

    for (const reaction of reactions) {
      const current = grouped.get(reaction.emoji);
      if (current) {
        current.count += 1;
        if (reaction.userId === currentUserId) {
          current.reactedByCurrentUser = true;
        }
        continue;
      }

      grouped.set(reaction.emoji, {
        count: 1,
        reactedByCurrentUser: reaction.userId === currentUserId,
      });
    }

    return Array.from(grouped.entries())
      .map(([emoji, value]) => ({
        emoji,
        count: value.count,
        reactedByCurrentUser: value.reactedByCurrentUser,
      }))
      .sort((a, b) => a.emoji.localeCompare(b.emoji));
  }

  private normaliseParticipantIds(
    participants: string[] | undefined,
    creatorId: string,
  ): string[] {
    const unique = new Set<string>();

    if (Array.isArray(participants)) {
      participants.forEach((candidate) => {
        if (typeof candidate === 'string') {
          const normalizedId = candidate.trim();
          if (normalizedId) {
            unique.add(normalizedId);
          }
        }
      });
    }

    unique.add(creatorId);

    const ordered = Array.from(unique);
    const creatorIndex = ordered.indexOf(creatorId);
    if (creatorIndex > 0) {
      ordered.splice(creatorIndex, 1);
    }
    if (creatorIndex !== 0) {
      ordered.unshift(creatorId);
    }

    return ordered;
  }

  private resolveTake(candidate?: number): number {
    const defaultTake = 20;

    if (candidate === undefined || Number.isNaN(candidate)) {
      return defaultTake;
    }

    return Math.min(Math.max(candidate, 1), 50);
  }

  private extractParticipantIds(participants?: string[]): string[] {
    if (!Array.isArray(participants)) {
      return [];
    }

    const unique = new Set<string>();

    participants.forEach((candidate) => {
      if (typeof candidate === 'string') {
        const normalized = candidate.trim();
        if (normalized) {
          unique.add(normalized);
        }
      }
    });

    return Array.from(unique);
  }

  private async buildLastMessagePreviewMap(
    conversations: ConversationWithParticipants[],
  ): Promise<Map<string, string | null>> {
    const messageIds = Array.from(
      new Set(
        conversations
          .map((conversation) => conversation.lastMessageId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const previewByConversationId = new Map<string, string | null>();

    if (!messageIds.length) {
      return previewByConversationId;
    }

    const messages = await this.prisma.message.findMany({
      where: {
        id: {
          in: messageIds,
        },
      },
      select: {
        id: true,
        content: true,
      },
    });

    const messageById = new Map(messages.map((message) => [message.id, message]));

    conversations.forEach((conversation) => {
      const lastMessageId = conversation.lastMessageId;
      if (!lastMessageId) {
        previewByConversationId.set(conversation.id, null);
        return;
      }

      const content = messageById.get(lastMessageId)?.content ?? null;
      previewByConversationId.set(
        conversation.id,
        content ? content.replace(/\s+/g, ' ').trim() : null,
      );
    });

    return previewByConversationId;
  }

  private async assertUsersExist(userIds: string[]) {
    if (!userIds.length) {
      return;
    }

    const users = await this.usersService.findManyByIds(userIds);
    if (users.length !== userIds.length) {
      throw new NotFoundException(
        'One or more participants could not be found.',
      );
    }
  }

  private async fetchConversationOrThrow(
    conversationId: string,
  ): Promise<ConversationWithParticipants> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });

    if (!conversation) {
      throw new ConversationNotFoundException();
    }

    return conversation;
  }

  private async loadGroupConversationForAction(
    conversationId: string,
    requesterId: string,
    directConversationError: string,
    options: { requireOwner?: boolean; ownerErrorMessage?: string } = {},
  ): Promise<{
    conversation: ConversationWithParticipants;
    requester: ConversationWithParticipants['participants'][number];
  }> {
    const conversation = await this.fetchConversationOrThrow(conversationId);

    if (!conversation.isGroup) {
      throw new BadRequestException(directConversationError);
    }

    const requester = conversation.participants.find(
      (participant) => participant.userId === requesterId,
    );

    if (!requester) {
      throw new ForbiddenException(
        'You do not have access to this conversation.',
      );
    }

    if (options.requireOwner && requester.role !== 'owner') {
      throw new ForbiddenException(
        options.ownerErrorMessage ?? 'Only owners can perform this action.',
      );
    }

    return { conversation, requester };
  }

  private resolveNextOwner(
    participants: ConversationWithParticipants['participants'],
    departingUserId: string,
  ): string | null {
    const remaining = participants.filter(
      (participant) => participant.userId !== departingUserId,
    );

    const remainingOwner = remaining.some(
      (participant) => participant.role === 'owner',
    );

    if (remainingOwner || remaining.length === 0) {
      return null;
    }

    const nextOwner = remaining.reduce((acc, participant) =>
      participant.joinedAt < acc.joinedAt ? participant : acc,
    );

    return nextOwner.userId;
  }

  private async touchConversation(conversationId: string): Promise<void> {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  private resolveMessageTake(candidate?: number): number {
    const defaultTake = 20;

    if (candidate === undefined || Number.isNaN(candidate)) {
      return defaultTake;
    }

    return Math.min(Math.max(candidate, 1), 100);
  }

  private normaliseEmoji(emoji: string): string {
    const value = emoji?.trim();

    if (!value) {
      throw new BadRequestException('Emoji is required.');
    }

    if (value.length > 32) {
      throw new BadRequestException('Emoji must be at most 32 characters.');
    }

    return value;
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }
}
