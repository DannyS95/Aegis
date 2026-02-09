import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { MessagesController } from './messages.controller';
import { ConversationTitleService } from './conversation-title.service';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule],
  controllers: [ConversationsController, MessagesController],
  providers: [ConversationsService, ConversationTitleService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
