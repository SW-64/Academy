import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class Argon2LocalAuthGuard extends AuthGuard('argon2-local') {}
