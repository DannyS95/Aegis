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

interface ListConversationsQuery {
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

export interface ConversationResponse {
  id: string;
  title: string | null;
  isGroup: boolean;
  lastMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants: ConversationParticipantResponse[];
}

export interface ConversationListResponse {
  items: ConversationResponse[];
  nextCursor: string | null;
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

interface ConversationWithParticipants {
  id: string;
  title: string | null;
  isGroup: boolean;
  lastMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants: Array<{
    id: string;
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
  ) {}

  async createConversation(
    creatorId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationResponse> {
    const participantIds = this.normaliseParticipantIds(dto.participants, creatorId);

    if (participantIds.length < 2) {
      throw new BadRequestException('A conversation requires at least two participants.');
    }

    const isGroupConversation = dto.isGroup ?? participantIds.length > 2;

    if (!isGroupConversation && participantIds.length !== 2) {
      throw new BadRequestException(
        'A direct conversation must include exactly two participants.',
      );
    }

    const users = await this.usersService.findManyByIds(participantIds);
    if (users.length !== participantIds.length) {
      throw new NotFoundException('One or more participants could not be found.');
    }

    if (!isGroupConversation) {
      await this.assertDirectConversationIsUnique(participantIds);
    }

    const conversationRecord = await this.prisma.conversation.create({
      data: {
        title: isGroupConversation ? this.normaliseTitle(dto.title) : null,
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

    return {
      items: paginatedConversations.map((conversation) =>
        this.mapConversation(conversation),
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
      throw new NotFoundException('Conversation not found.');
    }

    const isParticipant = conversation.participants.some(
      (participant) => participant.userId === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You do not have access to this conversation.');
    }

    return this.mapConversation(conversation);
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

    if (
      existing &&
      existing.participants.length === participantIds.length
    ) {
      throw new ConflictException(
        'A direct conversation between these users already exists.',
      );
    }
  }

  private mapConversation(
    conversation: ConversationWithParticipants,
  ): ConversationResponse {
    return {
      id: conversation.id,
      title: conversation.title ?? null,
      isGroup: conversation.isGroup,
      lastMessageId: conversation.lastMessageId ?? null,
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

  private normaliseTitle(title?: string | null): string | null {
    if (!title) {
      return null;
    }

    const normalizedTitle = title.trim();
    return normalizedTitle.length ? normalizedTitle : null;
  }

  private resolveTake(candidate?: number): number {
    const defaultTake = 20;

    if (candidate === undefined || Number.isNaN(candidate)) {
      return defaultTake;
    }

    return Math.min(Math.max(candidate, 1), 50);
  }
}
