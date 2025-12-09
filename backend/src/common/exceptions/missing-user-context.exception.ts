import { BadRequestException } from '@nestjs/common';

export class MissingUserContextException extends BadRequestException {
  constructor() {
    super('Authenticated user context is required.');
  }
}
