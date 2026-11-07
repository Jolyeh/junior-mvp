import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private db: PrismaService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
    if (!token) throw new UnauthorizedException();
    let payload: any;
    try { payload = await this.jwt.verifyAsync(token); } catch { throw new UnauthorizedException(); }
    const user = await this.db.user.findUnique({ where: { id: payload.sub }, include: { student: true } });
    if (!user || payload.version !== user.tokenVersion || !user.isActive || (user.role === 'STUDENT' && (!user.student || !user.student.isEligible))) throw new UnauthorizedException();
    req.user = user; return true;
  }
}
@Injectable()
export class ManagerGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) { if (!['MANAGER','ADMIN'].includes(ctx.switchToHttp().getRequest().user?.role)) throw new ForbiddenException(); return true; }
}
export const CurrentUser = createParamDecorator((_data, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user);
