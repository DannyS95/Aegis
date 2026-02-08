import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ConversationsService,
  type ToggleReactionResponse,
} from './conversations.service';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import { CurrentUser } from '../users/nest/current-user.decorator';
import type { AuthenticatedUser } from '../security/guards/jwt-auth.guard';
import { MissingUserContextException } from '../common/exceptions/missing-user-context.exception';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post(':messageId/reactions')
  toggleReaction(
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ToggleReactionDto,
  ): Promise<ToggleReactionResponse> {
    if (!user?.id) {
      throw new MissingUserContextException();
    }

    return this.conversationsService.toggleReaction(
      messageId,
      user.id,
      body.emoji,
    );
  }
}
