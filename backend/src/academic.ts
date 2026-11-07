import { BadRequestException, Body, Controller, Delete, Get, Module, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Response } from 'express';
import * as XLSX from 'xlsx';
import { AuthModule } from './auth';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard, ManagerGuard } from './security';
class AcademicDto { @IsString() @MinLength(1) @MaxLength(100) code: string; @IsString() @MinLength(1) @MaxLength(255) name: string; @IsOptional() @IsInt() @Min(0) sortOrder?: number; }
class StudentDto { @IsString() @MinLength(1) @MaxLength(100) matricule: string; @IsString() @MinLength(1) @MaxLength(150) firstName: string; @IsString() @MinLength(1) @MaxLength(150) lastName: string; @IsString() @MinLength(1) filiereId: string; @IsString() @MinLength(1) niveauId: string; @IsOptional() @IsBoolean() isEligible?: boolean; }
const types = ['filieres','niveaux','matieres','students'] as const;
@Controller('academic') @UseGuards(JwtAuthGuard)
class AcademicController {
 constructor(private db: PrismaService) {}
 private model(type: string): any { const map: Record<string, any> = { filieres: this.db.filiere, niveaux: this.db.niveau, matieres: this.db.matiere, students: this.db.student }; if (!types.includes(type as any)) throw new BadRequestException('Type invalide'); return map[type]; }
 @Get(':type') list(@Param('type') type: string) { if (type === 'students') throw new BadRequestException('Utilisez la route de gestion'); return this.model(type).findMany({ orderBy: { name: 'asc' } }); }
}
@Controller('management') @UseGuards(JwtAuthGuard, ManagerGuard)
class ManagementController {
 constructor(private db: PrismaService) {}
 private model(type: string): any { const map: Record<string, any> = { filieres: this.db.filiere, niveaux: this.db.niveau, matieres: this.db.matiere, students: this.db.student }; if (!types.includes(type as any)) throw new BadRequestException('Type invalide'); return map[type]; }
 private clean(type: string, row: any) {
  const fields = type === 'students' ? ['matricule','firstName','lastName','filiereId','niveauId','isEligible'] : type === 'niveaux' ? ['code','name','sortOrder'] : ['code','name'];
  const result: any = {}; for (const key of fields) if (row[key] !== undefined && row[key] !== '') result[key] = row[key];
  const required = type === 'students' ? ['matricule','firstName','lastName','filiereId','niveauId'] : ['code','name'];
  for (const key of required) if (typeof result[key] !== 'string' || !result[key].trim() || result[key].length > (key === 'code' || key === 'matricule' ? 100 : 255)) throw new BadRequestException(`Champ invalide : ${key}`);
  if (result.sortOrder !== undefined) { result.sortOrder = Number(result.sortOrder); if (!Number.isInteger(result.sortOrder) || result.sortOrder < 0) throw new BadRequestException('Ordre invalide'); }
  if (result.isEligible !== undefined) { if (![true,false,'true','false','1','0',1,0].includes(result.isEligible)) throw new BadRequestException('Statut invalide'); result.isEligible = [true,'true','1',1].includes(result.isEligible); }
  return result;
 }
 @Get(':type') list(@Param('type') type: string) { return this.model(type).findMany({ orderBy: { createdAt: 'desc' } }); }
 @Post(':type') create(@Param('type') type: string, @Body() body: Record<string, unknown>) { return this.model(type).create({ data: this.clean(type, body) }); }
 @Patch(':type/:id') update(@Param('type') type: string, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.model(type).update({ where: { id }, data: this.clean(type, body) }); }
 @Delete(':type/:id') delete(@Param('type') type: string, @Param('id') id: string) { return this.model(type).delete({ where: { id } }); }
 @Post(':type/import') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } })) async import(@Param('type') type: string, @UploadedFile() file: Express.Multer.File) {
  const model = this.model(type); if (!file || !/\.(csv|xlsx)$/i.test(file.originalname)) throw new BadRequestException('Fichier CSV ou XLSX requis');
  let rows: any[]; try { const book = XLSX.read(file.buffer, { type: 'buffer', cellDates: false }); rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { raw: false }); } catch { throw new BadRequestException('Fichier illisible'); }
  if (!rows.length || rows.length > 5000) throw new BadRequestException('Le fichier doit contenir entre 1 et 5000 lignes');
  const cleaned = rows.map(r => this.clean(type, r)); await this.db.$transaction(cleaned.map(data => model.create({ data }))); return { imported: rows.length };
 }
 @Get(':type/export') async export(@Param('type') type: string, @Query('format') format: string, @Res() res: Response) {
  if (!['csv','xlsx'].includes(format)) throw new BadRequestException('Format invalide');
  const rows = await this.model(type).findMany(); const fields = type === 'students' ? ['matricule','firstName','lastName','filiereId','niveauId','isEligible'] : type === 'niveaux' ? ['code','name','sortOrder'] : ['code','name'];
  const safe = rows.map((row: any) => Object.fromEntries(fields.map(key => { const v = row[key]; return [key, typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? "'" + v : v]; })));
  const sheet = XLSX.utils.json_to_sheet(safe, { header: fields }); const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Données');
  res.setHeader('Content-Disposition', `attachment; filename="${type}.${format}"`); res.type(format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.send(format === 'csv' ? XLSX.utils.sheet_to_csv(sheet) : XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }));
 }
}
@Module({ imports: [AuthModule], controllers: [AcademicController, ManagementController], providers: [PrismaService, JwtAuthGuard, ManagerGuard] }) export class AcademicModule {}
