import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = req;
    const userAgent = req.headers['user-agent'] || '';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const { statusCode } = res;
          const duration = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${statusCode} ${duration}ms — ${ip} — ${userAgent}`,
            'HTTP',
          );
        },
        error: (err) => {
          const duration = Date.now() - start;
          this.logger.warn(
            `${method} ${url} ERROR ${duration}ms — ${ip} — ${err.message}`,
            'HTTP',
          );
        },
      }),
    );
  }
}
