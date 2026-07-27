import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

const NUL = String.fromCharCode(0);

function sanitize(value: unknown): unknown {
  if (typeof value === 'string') return value.split(NUL).join('');
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      (value as Record<string, unknown>)[key] = sanitize((value as Record<string, unknown>)[key]);
    }
    return value;
  }
  return value;
}

/**
 * Text pasted from some sources (Word, PDFs, certain rich-text editors) can
 * carry a stray NUL byte (U+0000). Postgres' text/varchar columns reject it
 * outright — `invalid byte sequence for encoding "UTF8": 0x00` — which
 * surfaced as an unhandled 500 on any create/update endpoint fed that input
 * (first seen on Deal.description). An interceptor (not raw Express
 * middleware registered via app.use) is required here: Nest's own body
 * parser only runs once the framework's own request pipeline starts, so
 * app.use() middleware added after NestFactory.create() still saw
 * request.body as undefined. Interceptors run inside that pipeline, after
 * the body is already parsed and before ValidationPipe builds the DTO.
 */
@Injectable()
export class SanitizeBodyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    if (request.body && typeof request.body === 'object') sanitize(request.body);
    return next.handle();
  }
}
