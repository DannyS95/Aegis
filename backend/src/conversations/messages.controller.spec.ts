import { MissingUserContextException } from '../common/exceptions/missing-user-context.exception';
import type { AuthenticatedUser } from '../security/guards/jwt-auth.guard';
import type { ToggleReactionDto } from './dto/toggle-reaction.dto';
import { MessagesController } from './messages.controller';
import { ConversationsService } from './conversations.service';

describe('MessagesController', () => {
  let controller: MessagesController;
  let service: jest.Mocked<ConversationsService>;
  const user = { id: 'user-123' } as AuthenticatedUser;

  beforeEach(() => {
    service = {
      toggleReaction: jest.fn(),
    } as unknown as jest.Mocked<ConversationsService>;

    controller = new MessagesController(service);
  });

  it('throws when user context is missing', () => {
    const body: ToggleReactionDto = { emoji: '👍' };

    expect(() =>
      controller.toggleReaction(
        'message-1',
        undefined as unknown as AuthenticatedUser,
        body,
      ),
    ).toThrow(MissingUserContextException);
  });

  it('delegates reaction toggles to the service', async () => {
    const body: ToggleReactionDto = { emoji: '👍' };
    const response = {
      action: 'added' as const,
      messageId: 'message-1',
      emoji: '👍',
      reactions: [
        {
          emoji: '👍',
          count: 1,
          reactedByCurrentUser: true,
        },
      ],
    };
    service.toggleReaction.mockResolvedValue(response);

    const result = await controller.toggleReaction('message-1', user, body);

    expect(service.toggleReaction).toHaveBeenCalledWith(
      'message-1',
      user.id,
      body.emoji,
    );
    expect(result).toBe(response);
  });
});
