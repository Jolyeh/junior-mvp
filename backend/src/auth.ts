import { BadRequestException, Body, Controller, ConflictException, Injectable, Logger, Module, Post, Get, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from './prisma.service';
import { CurrentUser, JwtAuthGuard } from './security';

const passwordRules = { message: 'Le mot de passe doit contenir au moins 10 caractères.' };
class RegisterDto { @IsString() @MinLength(1, { message: 'Renseignez votre matricule.' }) @MaxLength(100) matricule: string; @IsEmail({}, { message: 'Renseignez une adresse e-mail valide.' }) @MaxLength(320) email: string; @IsString() @MinLength(10, passwordRules) @MaxLength(72) password: string; }
class LoginDto { @IsEmail({}, { message: 'Renseignez une adresse e-mail valide.' }) @MaxLength(320) email: string; @IsString() @MinLength(1, { message: 'Renseignez votre mot de passe.' }) @MaxLength(72) password: string; }
class EmailDto { @IsEmail({}, { message: 'Renseignez une adresse e-mail valide.' }) @MaxLength(320) email: string; }
class ResetDto { @IsString() @MinLength(1) @MaxLength(128) token: string; @IsString() @MinLength(10, passwordRules) @MaxLength(72) password: string; }
class ChangePasswordDto { @IsString() @MinLength(1) @MaxLength(72) currentPassword: string; @IsString() @MinLength(10, passwordRules) @MaxLength(72) newPassword: string; }
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
function validatePassword(password: string) { if (Buffer.byteLength(password, 'utf8') > 72) throw new BadRequestException('Le mot de passe ne doit pas dépasser 72 octets.'); }
const studentInclude = { filiere: true, niveau: true } as const;
@Injectable()
export class AuthService {
 private logger = new Logger(AuthService.name);
 constructor(private db: PrismaService, private jwt: JwtService) {}
 private publicUser(user: any) { return { id: user.id, email: user.email, role: user.role, student: user.student }; }
 private async token(user: any) { return { accessToken: await this.jwt.signAsync({ sub: user.id, version: user.tokenVersion }), user: this.publicUser(user) }; }
 async register(dto: RegisterDto) {
  validatePassword(dto.password);
  const student = await this.db.student.findUnique({ where: { matricule: dto.matricule.trim() }, include: { user: true } });
  if (!student?.isEligible || student.user) throw new ConflictException('Ce matricule est inconnu, désactivé ou déjà utilisé. Contactez votre établissement.');
  const passwordHash = await bcrypt.hash(dto.password, 12);
  try { const user = await this.db.user.create({ data: { email: dto.email.trim().toLowerCase(), passwordHash, studentId: student.id }, include: { student: { include: studentInclude } } }); return this.token(user); }
  catch (e: any) { if (e.code === 'P2002') throw new ConflictException('Cette adresse e-mail ou ce matricule est déjà associé à un compte.'); throw e; }
 }
 async login(dto: LoginDto) {
  validatePassword(dto.password);
  const user = await this.db.user.findUnique({ where: { email: dto.email.trim().toLowerCase() }, include: { student: { include: studentInclude } } });
  if (!user || !user.isActive || (user.role === 'STUDENT' && (!user.student || !user.student.isEligible)) || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('E-mail ou mot de passe incorrect, ou compte désactivé.');
  return this.token(user);
 }
 async me(user: any) { const fresh = await this.db.user.findUniqueOrThrow({ where: { id: user.id }, include: { student: { include: studentInclude } } }); return this.publicUser(fresh); }
 async changePassword(user: any, dto: ChangePasswordDto) {
  validatePassword(dto.newPassword); validatePassword(dto.currentPassword);
  if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) throw new BadRequestException('Le mot de passe actuel est incorrect.');
  const hash = await bcrypt.hash(dto.newPassword, 12);
  await this.db.$transaction([this.db.user.update({ where: { id: user.id }, data: { passwordHash: hash, tokenVersion: { increment: 1 } } }), this.db.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } })]);
  return { message: 'Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe.' };
 }
 async forgot(dto: EmailDto) {
  // Ne pas révéler si une adresse possède un compte.
  const generic = { message: 'Si un compte existe pour cette adresse, un lien de réinitialisation lui sera envoyé.' };
  const user = await this.db.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
  if (!user?.isActive) return generic;
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM || !process.env.FRONTEND_URL) { this.logger.warn('Réinitialisation indisponible : configurez SMTP_HOST, SMTP_FROM et FRONTEND_URL.'); return generic; }
  let frontend: URL;
  try { frontend = new URL(process.env.FRONTEND_URL); if (!['http:', 'https:'].includes(frontend.protocol)) throw new Error('Protocole invalide'); }
  catch { this.logger.warn('Réinitialisation indisponible : FRONTEND_URL doit être une URL HTTP ou HTTPS valide.'); return generic; }
  const raw = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await this.db.$transaction([this.db.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }), this.db.passwordReset.create({ data: { userId: user.id, tokenHash: digest(raw), expiresAt } })]);
  const link = new URL('/reset-password', frontend); link.searchParams.set('token', raw);
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD ?? '' } : undefined });
  try { await transport.sendMail({ from: process.env.SMTP_FROM, to: user.email, subject: 'Réinitialisation de votre mot de passe ESM BÉNIN', text: `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien : ${link.toString()}\n\nCe lien est valable 30 minutes et utilisable une seule fois. Si vous n’avez pas fait cette demande, ignorez cet e-mail.` }); }
  catch { this.logger.error('Échec de l’envoi du courriel de réinitialisation. Vérifiez la configuration SMTP.'); }
  return generic;
 }
 async reset(dto: ResetDto) {
  validatePassword(dto.password);
  const hash = await bcrypt.hash(dto.password, 12); const now = new Date();
  await this.db.$transaction(async tx => {
   const record = await tx.passwordReset.findUnique({ where: { tokenHash: digest(dto.token) } });
   if (!record || record.usedAt || record.expiresAt <= now) throw new BadRequestException('Ce lien est invalide, expiré ou a déjà été utilisé. Demandez un nouveau lien.');
   const used = await tx.passwordReset.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
   if (used.count !== 1) throw new BadRequestException('Ce lien a déjà été utilisé.');
   await tx.user.update({ where: { id: record.userId }, data: { passwordHash: hash, tokenVersion: { increment: 1 } } });
   await tx.passwordReset.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: now } });
  });
  return { message: 'Votre mot de passe a été réinitialisé. Vous pouvez vous connecter.' };
 }
}
@Controller('auth')
class AuthController {
 constructor(private auth: AuthService) {}
 @Post('register') @UseGuards(ThrottlerGuard) @Throttle({ default: { limit: 5, ttl: 60000 } }) register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
 @Post('login') @UseGuards(ThrottlerGuard) @Throttle({ default: { limit: 8, ttl: 60000 } }) login(@Body() dto: LoginDto) { return this.auth.login(dto); }
 @Post('forgot-password') @UseGuards(ThrottlerGuard) @Throttle({ default: { limit: 3, ttl: 60000 } }) forgot(@Body() dto: EmailDto) { return this.auth.forgot(dto); }
 @Post('reset-password') @UseGuards(ThrottlerGuard) @Throttle({ default: { limit: 5, ttl: 60000 } }) reset(@Body() dto: ResetDto) { return this.auth.reset(dto); }
 @Get('me') @UseGuards(JwtAuthGuard) me(@CurrentUser() user: any) { return this.auth.me(user); }
 @Post('change-password') @UseGuards(JwtAuthGuard, ThrottlerGuard) @Throttle({ default: { limit: 5, ttl: 60000 } }) change(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) { return this.auth.changePassword(user, dto); }
}
@Module({ imports: [JwtModule.registerAsync({ useFactory: () => { if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'remplacer-par-une-cle-longue-et-aleatoire') throw new Error('JWT_SECRET doit être une clé aléatoire d’au moins 32 caractères, différente de l’exemple'); return { secret: process.env.JWT_SECRET, signOptions: { expiresIn: '8h' } }; } })], controllers: [AuthController], providers: [AuthService, JwtAuthGuard], exports: [JwtModule] })
export class AuthModule {}
