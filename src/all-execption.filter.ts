import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    /**
     * 1) HttpException (BadRequestException, NotFoundException 등)
     * - 이미 서비스/가드/파이프에서 의도한 응답이므로 그대로 내려줌
     */
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const originalResponse = exception.getResponse();

      // 운영에서는 필요 시 logger로 교체 권장 (console.error 남발 방지)
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

    /**
     * 2) TypeORM QueryFailedError (DB 에러)
     * - 대표적으로 UNIQUE 충돌(중복 키)을 여기서 잡아 "사용자 친화 메시지"로 변환
     */
    if (exception instanceof QueryFailedError) {
      const e: any = exception;

      /**
       * 2-1) MySQL / MariaDB 중복 키 에러
       * - code: 'ER_DUP_ENTRY'
       * - status: 실무에서는 보통 409 Conflict를 사용 (팀 컨벤션에 맞추면 됨)
       */
      if (e.code === 'ER_DUP_ENTRY') {
        // sqlMessage 예시: "Duplicate entry '...' for key 'user.loginId'"
        const rawMsg = String(e.sqlMessage || e.message || '');

        // 기본 메시지 (필드 판별 실패 시)
        let message = '이미 존재하는 값입니다.';

        /**
         * ✅ 필드별 메시지 분기
         * - 여기 분기는 "DB의 유니크 인덱스/키 이름"에 따라 달라질 수 있어.
         * - 가장 안정적인 방법: 유니크 인덱스에 명확한 이름을 붙여두고(key명), 그걸로 분기하기.
         */
        if (
          rawMsg.includes('user.loginId') ||
          rawMsg.includes('loginId') ||
          rawMsg.includes('UK_user_loginId') // (예시) 인덱스/제약 이름을 이렇게 붙였다면 더 안정적
        ) {
          message = '이미 사용 중인 아이디입니다.';
        } else if (
          rawMsg.includes('user.phone') ||
          rawMsg.includes('phone') ||
          rawMsg.includes('UK_user_phone') // (예시)
        ) {
          message = '이미 사용 중인 연락처입니다.';
        }

        console.error({
          status: HttpStatus.CONFLICT,
          path: request.url,
          error: { code: e.code, message: rawMsg },
        });

        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }

      /**
       * 2-2) PostgreSQL 중복 키 에러 (추가 대응)
       * - code: '23505' (unique_violation)
       * - detail 안에 어떤 컬럼이 충돌했는지 들어오는 경우가 많음
       */
      if (e.code === '23505') {
        const rawMsg = String(e.detail || e.message || '');

        let message = '이미 존재하는 값입니다.';

        // Postgres는 detail에 "Key (loginId)=(...) already exists." 형태로 들어오는 경우가 흔함
        if (rawMsg.includes('(loginId)') || rawMsg.includes('loginId')) {
          message = '이미 사용 중인 아이디입니다.';
        } else if (rawMsg.includes('(phone)') || rawMsg.includes('phone')) {
          message = '이미 사용 중인 연락처입니다.';
        }

        console.error({
          status: HttpStatus.CONFLICT,
          path: request.url,
          error: { code: e.code, message: rawMsg },
        });

        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }

      /**
       * 2-3) 그 외 QueryFailedError
       * - 운영에서 DB 에러는 내부 구조를 노출하면 위험할 수 있어서
       *   일반 메시지로 내려주고, 서버 로그에만 상세를 남기는 방식이 안전
       */
      console.error({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        path: request.url,
        error: { code: e.code, message: String(e.message || '') },
      });

      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database error',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    /**
     * 3) 그 외 예외 (TypeError 등)
     * - 내부 에러 상세는 사용자에게 노출하지 않는 것이 안전
     */
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
