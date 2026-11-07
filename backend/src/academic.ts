import { BadRequestException, Body, Controller, Delete, Get, Module, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { validateXlsxArchive } from './validate-xlsx';
import { AuthModule } from './auth';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard, ManagerGuard } from './security';
const types = ['filieres','niveaux','matieres','students'] as const;
@Controller('academic') @UseGuards(JwtAuthGuard)
class AcademicController {
 constructor(private db: PrismaService) {}
 @Get(':type') list(@Param('type') type: string) { const map: Record<string, any> = { filieres: this.db.filiere, niveaux: this.db.niveau, matieres: this.db.matiere }; if (!map[type]) throw new BadRequestException('Type de catégorie invalide.'); return map[type].findMany({ orderBy: { name: 'asc' } }); }
}
@Controller('management') @UseGuards(JwtAuthGuard, ManagerGuard)
export class ManagementController {
 constructor(private db: PrismaService) {}
 private model(type: string): any { const map: Record<string, any> = { filieres: this.db.filiere, niveaux: this.db.niveau, matieres: this.db.matiere, students: this.db.student }; if (!types.includes(type as any)) throw new BadRequestException('Type invalide.'); return map[type]; }
 private fields(type: string) { return type === 'students' ? ['matricule','firstName','lastName','filiereId','niveauId','isEligible'] : type === 'niveaux' ? ['code','name','sortOrder'] : ['code','name']; }
 private clean(type: string, row: any) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new BadRequestException('Les données fournies sont invalides.');
  const fields = this.fields(type), result: any = {};
  for (const key of fields) if (row[key] !== undefined && row[key] !== '') result[key] = typeof row[key] === 'string' ? row[key].trim() : row[key];
  const labels: Record<string,string> = {matricule:'matricule',firstName:'prénom',lastName:'nom',filiereId:'filière',niveauId:'niveau',code:'code',name:'nom'};
  const required = type === 'students' ? ['matricule','firstName','lastName','filiereId','niveauId'] : ['code','name'];
  for (const key of required) { const max = ['code','matricule'].includes(key) ? 100 : ['firstName','lastName'].includes(key) ? 150 : 255; if (typeof result[key] !== 'string' || !result[key] || result[key].length > max) throw new BadRequestException(`Le champ « ${labels[key]} » est obligatoire et doit contenir au maximum ${max} caractères.`); }
  if (result.sortOrder !== undefined) { result.sortOrder = Number(result.sortOrder); if (!Number.isInteger(result.sortOrder) || result.sortOrder < 0 || result.sortOrder > 2147483647) throw new BadRequestException('L’ordre doit être un nombre entier positif.'); }
  if (result.isEligible !== undefined) { if (![true,false,'true','false','1','0',1,0].includes(result.isEligible)) throw new BadRequestException('Le statut doit être true ou false.'); result.isEligible = [true,'true','1',1].includes(result.isEligible); }
  return result;
 }
 @Get(':type') list(@Param('type') type: string) { return this.model(type).findMany({ orderBy: { createdAt: 'desc' } }); }
 @Post(':type') create(@Param('type') type: string, @Body() body: Record<string, unknown>) { return this.model(type).create({ data: this.clean(type, body) }); }
 @Patch(':type/:id') update(@Param('type') type: string, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.model(type).update({ where: { id }, data: this.clean(type, body) }); }
 @Delete(':type/:id') delete(@Param('type') type: string, @Param('id') id: string) { return this.model(type).delete({ where: { id } }); }
 @Post(':type/import') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } })) async import(@Param('type') type: string, @UploadedFile() file: Express.Multer.File) {
  const model = this.model(type); if (!file || !/\.(csv|xlsx)$/i.test(file.originalname)) throw new BadRequestException('Choisissez un fichier CSV ou XLSX de 5 Mo maximum.');
  let rows: any[] = [];
  if (/\.csv$/i.test(file.originalname)) {
   const parsed = Papa.parse<Record<string,string>>(file.buffer.toString('utf8'), { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.trim() });
   if (parsed.errors.length) throw new BadRequestException(`CSV invalide : vérifiez la ligne ${(parsed.errors[0].row ?? 0) + 2} et les colonnes.`);
   rows = parsed.data;
  } else {
   try {
    await validateXlsxArchive(file.buffer);
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(file.buffer as any); const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount > 5001 || sheet.columnCount > 50) throw new BadRequestException('La feuille doit contenir au maximum 5000 lignes et 50 colonnes.');
    const headers:string[] = []; sheet.getRow(1).eachCell((cell, col) => { headers[col] = cell.text.trim(); });
    sheet.eachRow((row, number) => { if (number === 1) return; const item:Record<string,string> = {}; row.eachCell((cell, col) => { if (cell.type === ExcelJS.ValueType.Formula || cell.type === ExcelJS.ValueType.Merge) throw new BadRequestException(`Les formules et cellules fusionnées ne sont pas acceptées (ligne ${number}).`); if(headers[col]) item[headers[col]]=cell.text; }); if(Object.keys(item).length) rows.push(item); });
   } catch(e) { if(e instanceof BadRequestException) throw e; throw new BadRequestException('Le fichier Excel est illisible ou invalide.'); }
  }
  if (!rows.length || rows.length > 5000) throw new BadRequestException('Le fichier doit contenir entre 1 et 5000 lignes.');
  const cleaned = rows.map((r,i) => { try { return this.clean(type,r); } catch(e) { if(e instanceof BadRequestException) throw new BadRequestException(`Ligne ${i+2} : ${e.message}`); throw e; } });
  await this.db.$transaction(cleaned.map(data => model.create({ data }))); return { imported: rows.length };
 }
 @Get(':type/export') async export(@Param('type') type: string, @Query('format') format: string, @Res() res: Response) {
  if (!['csv','xlsx'].includes(format)) throw new BadRequestException('Format invalide.');
  const rows = await this.model(type).findMany(); const fields = this.fields(type);
  const safe = rows.map((row: any) => Object.fromEntries(fields.map(key => { const v = row[key]; return [key, typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? "'" + v : v]; })));
  res.setHeader('Content-Disposition', `attachment; filename="${type}.${format}"`);
  if(format === 'csv') { res.type('text/csv'); res.send('\ufeff'+Papa.unparse({fields,data:safe.map((r:any)=>fields.map(k=>r[k]))})); return; }
  const workbook = new ExcelJS.Workbook(); const sheet=workbook.addWorksheet('Données'); sheet.columns=fields.map(key=>({header:key,key,width:22})); sheet.addRows(safe);
  res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
 }
}
@Module({ imports: [AuthModule], controllers: [AcademicController, ManagementController], providers: [PrismaService, JwtAuthGuard, ManagerGuard] }) export class AcademicModule {}
