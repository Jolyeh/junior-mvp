import { Body, Controller, ConflictException, Injectable, Module, Post, UnauthorizedException } from '@nestjs/common';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma.service';
class RegisterDto { @IsString() @MinLength(1) @MaxLength(100) matricule: string; @IsEmail() @MaxLength(320) email: string; @IsString() @MinLength(10) @MaxLength(72) password: string; }
class LoginDto { @IsEmail() @MaxLength(320) email: string; @IsString() @MaxLength(72) password: string; }
@Injectable()
export class AuthService {
 constructor(private db: PrismaService, private jwt: JwtService) {}
 private async token(user: any) { return { accessToken: await this.jwt.signAsync({ sub: user.id }), user: { id: user.id, email: user.email, role: user.role, student: user.student } }; }
 async register(dto: RegisterDto) {
  const student = await this.db.student.findUnique({ where: { matricule: dto.matricule.trim() }, include: { user: true } });
  if (!student?.isEligible || student.user) throw new ConflictException('Matricule non autorisé ou déjà utilisé');
  const passwordHash = await bcrypt.hash(dto.password, 12);
  try { const user = await this.db.user.create({ data: { email: dto.email.trim().toLowerCase(), passwordHash, studentId: student.id }, include: { student: true } }); return this.token(user); }
  catch { throw new ConflictException('Compte ou matricule déjà utilisé'); }
 }
 async login(dto: LoginDto) {
  const user = await this.db.user.findUnique({ where: { email: dto.email.trim().toLowerCase() }, include: { student: true } });
  if (!user || !user.isActive || (user.role === 'STUDENT' && (!user.student || !user.student.isEligible)) || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Identifiants invalides');
  return this.token(user);
 }
}
@Controller('auth')
class AuthController { constructor(private auth: AuthService) {} @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); } @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); } }
@Module({ imports: [JwtModule.registerAsync({ useFactory: () => { if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET doit contenir au moins 32 caractères'); return { secret: process.env.JWT_SECRET, signOptions: { expiresIn: '8h' } }; } })], controllers: [AuthController], providers: [AuthService, PrismaService], exports: [JwtModule] })
export class AuthModule {}
