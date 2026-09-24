import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../../logger/logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: LoggerService,
    private readonly nodeEnv?: string,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res.message as string) || message;
        errors = res.message instanceof Array ? res.message : undefined;
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      // In production: hide internal error details
      if (this.nodeEnv === 'production') {
        this.logger.error(exception.message, exception.stack, 'HttpExceptionFilter');
      } else {
        message = exception.message;
        this.logger.error(exception.message, exception.stack, 'HttpExceptionFilter');
      }
    }

    const responseBody: Record<string, unknown> = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (errors) {
      responseBody.errors = errors;
    }

    // Log 5xx errors as errors, 4xx as warnings
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} → ${status}: ${message}`, undefined, 'HttpException');
    } else if (status >= 400) {
      this.logger.warn(`${request.method} ${request.url} → ${status}: ${message}`, 'HttpException');
    }

    response.status(status).json(responseBody);
  }
}
