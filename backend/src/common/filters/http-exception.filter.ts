import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

type ValidationErrorResponse = {
  message: string[];
  error: string;
  statusCode: number;
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception.getResponse();

    const { message, error } = this.extractErrorPayload(exceptionResponse);

    response.status(status).json({
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private extractErrorPayload(
    responseBody: unknown,
  ): { message: string | string[]; error: string } {
    if (
      responseBody &&
      typeof responseBody === 'object' &&
      'message' in responseBody &&
      'error' in responseBody
    ) {
      const { message, error } = responseBody as ValidationErrorResponse;
      return {
        message: Array.isArray(message) ? message : [String(message)],
        error: error ?? 'Bad Request',
      };
    }

    if (typeof responseBody === 'string') {
      return { message: [responseBody], error: 'Error' };
    }

    return { message: ['Unexpected error'], error: 'Error' };
  }
}
