require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { AuthService } = require('../dist/src/auth');
const { JwtAuthGuard, ManagerGuard } = require('../dist/src/security');
const { DocumentsController } = require('../dist/src/documents');
const { UnauthorizedException, ForbiddenException, BadRequestException, ConflictException } = require('@nestjs/common');
const ctx = user => ({switchToHttp:()=>({getRequest:()=>user})});
const jwt = { signAsync: async x => JSON.stringify(x) };

test('inscription refuse un matricule non préautorisé', async () => {
 const auth = new AuthService({student:{findUnique:async()=>null}},jwt);
 await assert.rejects(auth.register({matricule:'inconnu',email:'test@example.org',password:'1234567890'}),ConflictException);
});
test('inscription lie un seul matricule et crée un jeton versionné', async () => {
 let saved; const db={student:{findUnique:async()=>({id:'s1',isEligible:true,user:null})},user:{create:async({data})=>{saved=data;return {...data,id:'u1',role:'STUDENT',tokenVersion:0,student:{id:'s1'}}}}};
 const result=await new AuthService(db,jwt).register({matricule:'123',email:'TEST@example.org',password:'1234567890'});
 assert.equal(saved.studentId,'s1'); assert.equal(saved.email,'test@example.org'); assert.notEqual(saved.passwordHash,'1234567890'); assert.deepEqual(JSON.parse(result.accessToken),{sub:'u1',version:0}); assert.equal(result.user.passwordHash,undefined);
});
test('la connexion refuse les comptes désactivés et les mots de passe trop longs en octets', async () => {
 const auth=new AuthService({user:{findUnique:async()=>({isActive:false})}},jwt);
 await assert.rejects(auth.login({email:'a@b.fr',password:'123'}),UnauthorizedException);
 await assert.rejects(auth.login({email:'a@b.fr',password:'é'.repeat(40)}),BadRequestException);
});
test('le garde rejette les jetons révoqués et les étudiants désactivés', async () => {
 let user={id:'u1',isActive:true,role:'STUDENT',tokenVersion:2,student:{isEligible:true}};
 const guard=new JwtAuthGuard({verifyAsync:async()=>({sub:'u1',version:1})},{user:{findUnique:async()=>user}});
 await assert.rejects(guard.canActivate(ctx({headers:{authorization:'Bearer token'}})),UnauthorizedException);
 const guard2=new JwtAuthGuard({verifyAsync:async()=>({sub:'u1',version:2})},{user:{findUnique:async()=>({...user,student:{isEligible:false}})}});
 await assert.rejects(guard2.canActivate(ctx({headers:{authorization:'Bearer token'}})),UnauthorizedException);
});
test('les étudiants ne peuvent pas utiliser les routes de gestion', () => {
 const guard=new ManagerGuard(); assert.throws(()=>guard.canActivate(ctx({user:{role:'STUDENT'}})),ForbiddenException);
 assert.equal(guard.canActivate(ctx({user:{role:'MANAGER'}})),true);
});
test('le catalogue est filtré par filière côté serveur', async () => {
 let args; const controller=new DocumentsController({document:{findMany:async a=>{args=a;return []}}});
 await controller.list({role:'STUDENT',student:{filiereId:'f1'}},'n1','m1','titre');
 assert.equal(args.where.filiereId,'f1');assert.equal(args.where.niveauId,'n1');assert.equal(args.where.matiereId,'m1');
});
test('un étudiant ne peut pas consulter le fichier d’une autre filière', async () => {
 const controller=new DocumentsController({document:{findUnique:async()=>({filiereId:'other'})}});
 await assert.rejects(controller.file('doc',{role:'STUDENT',student:{filiereId:'f1'}},'0',{}),ForbiddenException);
});
test('le changement de mot de passe vérifie le mot de passe actuel', async () => {
 const auth=new AuthService({},jwt); const hash=await bcrypt.hash('ancien secret',4);
 await assert.rejects(auth.changePassword({passwordHash:hash},{currentPassword:'incorrect',newPassword:'nouveau secret'}),BadRequestException);
});
test('un lien de réinitialisation absent est refusé', async () => {
 const tx={passwordReset:{findUnique:async()=>null}}; const db={$transaction:fn=>fn(tx)};
 await assert.rejects(new AuthService(db,jwt).reset({token:'invalid',password:'nouveau secret'}),BadRequestException);
});
test('un lien valide est à usage unique et révoque les sessions', async () => {
 let record={id:'r1',userId:'u1',usedAt:null,expiresAt:new Date(Date.now()+60000)}, version=0;
 const tx={ passwordReset:{findUnique:async()=>record,updateMany:async({where,data})=>{if(where.id){if(record.usedAt)return {count:0};record.usedAt=data.usedAt;return {count:1};}return {count:0};}},user:{update:async()=>{version++}} };
 const auth=new AuthService({$transaction:fn=>fn(tx)},jwt);
 await auth.reset({token:'test',password:'nouveau secret'});assert.equal(version,1);assert.ok(record.usedAt);
 await assert.rejects(auth.reset({token:'test',password:'nouveau secret'}),BadRequestException);
});
