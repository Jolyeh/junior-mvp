import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Header, Module, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { randomUUID } from 'crypto';
import { AuthModule } from './auth';
import { PrismaService } from './prisma.service';
import { CurrentUser, JwtAuthGuard, ManagerGuard } from './security';
import { CloudinaryStorage } from './cloudinary-storage';

class UploadIntentDto {
 @IsString() @MinLength(1) @MaxLength(255) title: string;
 @IsOptional() @IsString() @MaxLength(5000) description?: string;
 @IsString() @MinLength(1) matiereId: string;
 @IsString() @MinLength(1) niveauId: string;
 @IsString() @MinLength(1) @MaxLength(255) originalName: string;
 @IsInt() @Min(5) @Max(20*1024*1024) sizeBytes: number;
}
class UploadFinishDto { @IsString() @MinLength(1) @MaxLength(128) ticketId: string; }
@Controller('documents') @UseGuards(JwtAuthGuard)
export class DocumentsController {
 constructor(private db: PrismaService, private storage: CloudinaryStorage) {}
 @Get() async list(@CurrentUser() user: any, @Query('niveauId') niveauId?: string, @Query('matiereId') matiereId?: string, @Query('search') search?: string) {
  const docs = await this.db.document.findMany({ where: { ...(user.role === 'STUDENT' ? { matiere: { filieres: { some: { id: user.student.filiereId } } } } : {}), ...(niveauId ? { niveauId } : {}), ...(matiereId ? { matiereId } : {}), ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}) }, include: { matiere: true, niveau: true }, orderBy: { createdAt: 'desc' } });
  return docs.map(({ storageKey, sizeBytes, filiereId, ...doc }) => ({ ...doc, sizeBytes: Number(sizeBytes) }));
 }
 @Post('upload-intent') @UseGuards(ManagerGuard) async intent(@CurrentUser() user:any, @Body() dto:UploadIntentDto) {
  if(!dto.title.trim() || !/\.pdf$/i.test(dto.originalName)) throw new BadRequestException('Renseignez un titre et choisissez un PDF valide.');
  const associated=await this.db.matiere.findFirst({where:{id:dto.matiereId,filieres:{some:{}}},select:{id:true}});
  if(!associated) throw new BadRequestException('Choisissez une matière associée à au moins une filière.');
  if(!await this.db.niveau.findUnique({where:{id:dto.niveauId},select:{id:true}})) throw new BadRequestException('Choisissez un niveau existant.');
  const storageKey=`esm-benin/${randomUUID()}.pdf`;
  const upload=this.storage.signedUpload(storageKey);
  const ticket=await this.db.uploadTicket.create({data:{storageKey,uploadedById:user.id,title:dto.title.trim(),description:dto.description,originalName:dto.originalName,sizeBytes:BigInt(dto.sizeBytes),matiereId:dto.matiereId,niveauId:dto.niveauId,expiresAt:new Date(Date.now()+15*60*1000)}});
  return {ticketId:ticket.id, ...upload};
 }
 @Post('upload-finish') @UseGuards(ManagerGuard) async finish(@CurrentUser() user:any, @Body() dto:UploadFinishDto) {
  const ticket=await this.db.uploadTicket.findUnique({where:{id:dto.ticketId}});
  if(!ticket || ticket.uploadedById!==user.id || ticket.consumedAt || ticket.expiresAt<=new Date()) throw new BadRequestException('Cette autorisation d’envoi est invalide ou expirée.');
  await this.storage.validate(ticket.storageKey,Number(ticket.sizeBytes));
  return this.db.$transaction(async tx=>{
   const subject=await tx.matiere.findFirst({where:{id:ticket.matiereId,filieres:{some:{}}},select:{id:true}});
   if(!subject)throw new BadRequestException('La matière doit être associée à une filière.');
   const used=await tx.uploadTicket.updateMany({where:{id:ticket.id,uploadedById:user.id,consumedAt:null,expiresAt:{gt:new Date()}},data:{consumedAt:new Date()}});
   if(used.count!==1)throw new BadRequestException('Cette autorisation d’envoi a déjà été utilisée ou a expiré.');
   const doc=await tx.document.create({data:{title:ticket.title,description:ticket.description,matiereId:ticket.matiereId,niveauId:ticket.niveauId,storageKey:ticket.storageKey,originalName:ticket.originalName,mimeType:'application/pdf',sizeBytes:ticket.sizeBytes,uploadedById:user.id}});
   return {id:doc.id};
  });
 }
 @Get(':id/file') @Header('Cache-Control','private, no-store') async file(@Param('id') id:string,@CurrentUser() user:any,@Query('download') download:string) {
  const doc=await this.db.document.findUnique({where:{id},include:{matiere:{select:{filieres:{select:{id:true}}}}}});if(!doc)throw new NotFoundException();
  if(user.role==='STUDENT'&&!doc.matiere.filieres.some(f=>f.id===user.student.filiereId))throw new ForbiddenException();
  return {url:this.storage.downloadUrl(doc.storageKey,download==='1')};
 }
 @Delete(':id') @UseGuards(ManagerGuard) async delete(@Param('id') id:string) {
  const doc=await this.db.document.findUnique({where:{id}});if(!doc)throw new NotFoundException();
  await this.storage.remove(doc.storageKey);await this.db.document.delete({where:{id}});return {deleted:true};
 }
}
@Module({imports:[AuthModule],controllers:[DocumentsController],providers:[JwtAuthGuard,ManagerGuard,CloudinaryStorage]}) export class DocumentsModule {}
