import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // HTTPException일 경우 원래 status/response를 그대로 사용
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const originalResponse = exception.getResponse();

      console.error({
        status,
        path: request.url,
        error: originalResponse,
      });

      return response.status(status).json({
        ...(typeof originalResponse === 'string'
          ? { message: originalResponse }
          : originalResponse),
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // 그 외 예외 (예: TypeError, QueryFailedError 등)
    console.error({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      path: request.url,
      error: exception,
    });

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
