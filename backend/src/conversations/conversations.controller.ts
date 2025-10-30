import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConversationsService, ConversationListResponse, ConversationResponse } from './conversations.service';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import { CurrentUser } from '../users/nest/current-user.decorator';
import type { AuthenticatedUser } from '../security/guards/jwt-auth.guard';
import type { CreateConversationDto } from './dto/create-conversation.dto';
import type { ListConversationsQueryDto } from './dto/list-conversations.dto';

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
      throw new BadRequestException('Authenticated user is required.');
    }

    return this.conversationsService.createConversation(user.id, body);
  }

  @Get()
  listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListConversationsQueryDto,
  ): Promise<ConversationListResponse> {
    if (!user?.id) {
      throw new BadRequestException('Authenticated user is required.');
    }

    const take = query.take !== undefined ? Number(query.take) : undefined;

    if (query.take !== undefined && Number.isNaN(take)) {
      throw new BadRequestException('Query parameter "take" must be a number.');
    }

    return this.conversationsService.listConversations(user.id, {
      cursor: query.cursor,
      take,
    });
  }

  @Get(':id')
  getConversation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConversationResponse> {
    if (!user?.id) {
      throw new BadRequestException('Authenticated user is required.');
    }

    return this.conversationsService.getConversationById(id, user.id);
  }
}
