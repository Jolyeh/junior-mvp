import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Module, NotFoundException, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { AuthModule } from './auth';
import { PrismaService } from './prisma.service';
import { CurrentUser, JwtAuthGuard, ManagerGuard } from './security';
class DocumentDto { @IsString() @MinLength(1) @MaxLength(255) title: string; @IsOptional() @IsString() @MaxLength(5000) description?: string; @IsString() @MinLength(1) filiereId: string; @IsString() @MinLength(1) niveauId: string; @IsString() @MinLength(1) matiereId: string; }
const directory = join(process.cwd(), 'uploads');
@Controller('documents') @UseGuards(JwtAuthGuard)
export class DocumentsController {
 constructor(private db: PrismaService) {}
 @Get() async list(@CurrentUser() user: any, @Query('niveauId') niveauId?: string, @Query('matiereId') matiereId?: string, @Query('search') search?: string) {
  const docs = await this.db.document.findMany({ where: { ...(user.role === 'STUDENT' ? { filiereId: user.student.filiereId } : {}), ...(niveauId ? { niveauId } : {}), ...(matiereId ? { matiereId } : {}), ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}) }, include: { filiere: true, niveau: true, matiere: true }, orderBy: { createdAt: 'desc' } });
  return docs.map(({ storageKey, sizeBytes, ...doc }) => ({ ...doc, sizeBytes: Number(sizeBytes) }));
 }
 @Post() @UseGuards(ManagerGuard) @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } })) async upload(@CurrentUser() user: any, @Body() dto: DocumentDto, @UploadedFile() file: Express.Multer.File) {
  if (!file || !file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-')) || !/\.pdf$/i.test(file.originalname)) throw new BadRequestException('Seuls les fichiers PDF sont acceptés (20 Mo maximum)');
  const key = randomUUID() + '.pdf'; await mkdir(directory, { recursive: true }); await writeFile(join(directory, key), file.buffer, { flag: 'wx' });
  try { const doc = await this.db.document.create({ data: { ...dto, storageKey: key, originalName: file.originalname.slice(0,255), mimeType: 'application/pdf', sizeBytes: BigInt(file.size), uploadedById: user.id } }); return { id: doc.id }; }
  catch (e) { await unlink(join(directory, key)).catch(() => {}); throw e; }
 }
 @Get(':id/file') async file(@Param('id') id: string, @CurrentUser() user: any, @Query('download') download: string, @Res() res: Response) {
  const doc = await this.db.document.findUnique({ where: { id } }); if (!doc) throw new NotFoundException();
  if (user.role === 'STUDENT' && user.student.filiereId !== doc.filiereId) throw new ForbiddenException();
  let data: Buffer; try { data = await readFile(join(directory, doc.storageKey)); } catch { throw new NotFoundException('Fichier introuvable'); }
  res.setHeader('Content-Type', 'application/pdf'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Security-Policy', "sandbox"); res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('Content-Disposition', `${download === '1' ? 'attachment' : 'inline'}; filename="document.pdf"`); res.send(data);
 }
 @Delete(':id') @UseGuards(ManagerGuard) async delete(@Param('id') id: string) { const doc = await this.db.document.delete({ where: { id } }); await unlink(join(directory, doc.storageKey)).catch(() => {}); return { deleted: true }; }
}
@Module({ imports: [AuthModule], controllers: [DocumentsController], providers: [PrismaService, JwtAuthGuard, ManagerGuard] }) export class DocumentsModule {}
