export interface CreateConversationDto {
  participants?: string[];
  title?: string | null;
  isGroup?: boolean;
}
