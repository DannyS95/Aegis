import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { DEFAULT_CONVERSATION_TITLES } from './constants/default-conversation-titles';

@Injectable()
export class ConversationTitleService {
  resolveTitle(title?: string | null): string {
    const normalizedTitle = this.normalise(title);
    if (normalizedTitle) {
      return normalizedTitle;
    }

    return this.generateDefaultTitle();
  }

  private generateDefaultTitle(): string {
    const index = randomInt(DEFAULT_CONVERSATION_TITLES.length);
    return DEFAULT_CONVERSATION_TITLES[index];
  }

  private normalise(title?: string | null): string | null {
    if (!title) {
      return null;
    }

    const normalizedTitle = title.trim();
    return normalizedTitle.length ? normalizedTitle : null;
  }
}

