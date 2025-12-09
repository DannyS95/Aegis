import { ForbiddenException } from '@nestjs/common';

export class NotConversationParticipantException extends ForbiddenException {
  constructor() {
    super('You are not a participant of this conversation.');
  }
}
