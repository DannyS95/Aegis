import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import {
  ConversationsService,
  ConversationListResponse,
  ConversationResponse,
  type MessageListResponse,
  type MessageResponse,
} from './conversations.service';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import { CurrentUser } from '../users/nest/current-user.decorator';
import type { AuthenticatedUser } from '../security/guards/jwt-auth.guard';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ListConversationsQueryDto } from './dto/list-conversations.dto';
import { AddParticipantsDto } from './dto/add-participants.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages.dto';
import { MissingUserContextException } from '../common/exceptions/missing-user-context.exception';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateConversationDto,
  ): Promise<ConversationResponse> {
    if (!user?.id) {
      throw new MissingUserContextException();
    }

    return this.conversationsService.createConversation(user.id, body);
  }

  @Get()
  listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListConversationsQueryDto,
  ): Promise<ConversationListResponse> {
    if (!user?.id) {
      throw new MissingUserContextException();
    }

    return this.conversationsService.listConversations(user.id, {
      cursor: query.cursor,
      take: query.take,
    });
  }

  @Get(':id')
  getConversation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConversationResponse> {
    if (!user?.id) {
      throw new MissingUserContextException();
    }

    return this.conversationsService.getConversationById(id, user.id);
  }

  @Post(':id/participants')
  addParticipants(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AddParticipantsDto,
  ): Promise<ConversationResponse> {
    if (!user?.id) {
      throw new MissingUserContextException();
    }

    return this.conversationsService.addParticipants(
      id,
      user.id,
      body.participantIds,
    );
  }

  @Delete(':id/participants/:participantId')
  removeParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConversationResponse> {
    if (!user?.id) {
      throw new MissingUserContextException();
    }

    return this.conversationsService.removeParticipant(
      id,
      user.id,
      participantId,
    );
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateMessageDto,
  ): Promise<MessageResponse> {
    if (!user?.id) {
      throw new MissingUserContextException();
    }

    return this.conversationsService.sendMessage(id, user.id, body);
  }

  @Get(':id/messages')
  listMessages(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMessagesQueryDto,
  ): Promise<MessageListResponse> {
    if (!user?.id) {
      throw new MissingUserContextException();
    }

    return this.conversationsService.listMessages(id, user.id, query);
  }
}
