require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { AppModule } = require('../dist/src/app.module');
const { PrismaService } = require('../dist/src/prisma.service');
const { ErrorFilter } = require('../dist/src/error.filter');
let app, url, hash, currentUser, docsFilter, createdDocument;
before(async()=>{
 process.env.JWT_SECRET='test-secret-which-is-long-enough-to-sign-jwts';
 hash=await bcrypt.hash('mot-de-passe-test',4);
 currentUser={id:'u1',email:'etudiant@example.org',role:'STUDENT',isActive:true,tokenVersion:0,passwordHash:hash,student:{id:'s1',isEligible:true,filiereId:'f1'}};
 const db={user:{findUnique:async()=>currentUser,findUniqueOrThrow:async()=>currentUser},student:{findUnique:async()=>null},document:{findMany:async args=>{docsFilter=args.where;return [];},findUnique:async()=>({matiere:{filieres:[{id:'f2'}]}}),create:async({data})=>{createdDocument=data;return {id:'d1'}}},filiere:{findMany:async()=>[]},niveau:{findMany:async()=>[]},matiere:{findMany:async()=>[],findFirst:async()=>({id:'m1'})},$connect:async()=>{},$disconnect:async()=>{}};
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(PrismaService).useValue(db).compile();
 app=module.createNestApplication();app.setGlobalPrefix('api');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));app.useGlobalFilters(new ErrorFilter());await app.listen(0,'127.0.0.1');url=await app.getUrl();
});
after(async()=>{await app?.close()});
test('parcours HTTP : validation, authentification et isolation',async()=>{
 const post=(path,body,token)=>fetch(url+'/api'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
 let r=await post('/auth/register',{email:'etudiant@example.org',matricule:'123',password:'court'});assert.equal(r.status,400);assert.match(JSON.stringify(await r.json()),/10 caractères/);
 r=await post('/auth/login',{email:'etudiant@example.org',password:'mot-de-passe-test'});assert.equal(r.status,201);const {accessToken}=await r.json();assert.ok(accessToken);
 r=await fetch(url+'/api/documents',{headers:{Authorization:'Bearer '+accessToken}});assert.equal(r.status,200);assert.deepEqual(docsFilter.matiere,{filieres:{some:{id:'f1'}}});
 r=await fetch(url+'/api/documents/doc/file',{headers:{Authorization:'Bearer '+accessToken}});assert.equal(r.status,403);
 r=await fetch(url+'/api/management/students',{headers:{Authorization:'Bearer '+accessToken}});assert.equal(r.status,403);
 currentUser.tokenVersion++;r=await fetch(url+'/api/auth/me',{headers:{Authorization:'Bearer '+accessToken}});assert.equal(r.status,401);
});


test('HTTP : seul un gestionnaire ajoute un PDF avec matière et niveau',async()=>{
 const login=async()=>{const r=await fetch(url+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:currentUser.email,password:'mot-de-passe-test'})});return (await r.json()).accessToken};
 const form=(extra=false)=>{const f=new FormData();f.set('title','Cours');f.set('matiereId','m1');f.set('niveauId','n1');if(extra)f.set('filiereId','f1');f.set('file',new Blob(['%PDF-test'],{type:'application/pdf'}),'cours.pdf');return f};
 currentUser.role='STUDENT';const student=await login();let r=await fetch(url+'/api/documents',{method:'POST',headers:{Authorization:'Bearer '+student},body:form()});assert.equal(r.status,403);
 currentUser.role='MANAGER';const manager=await login();const sansNiveau=form();sansNiveau.delete('niveauId');r=await fetch(url+'/api/documents',{method:'POST',headers:{Authorization:'Bearer '+manager},body:sansNiveau});assert.equal(r.status,400);r=await fetch(url+'/api/documents',{method:'POST',headers:{Authorization:'Bearer '+manager},body:form(true)});assert.equal(r.status,400);
 try {r=await fetch(url+'/api/documents',{method:'POST',headers:{Authorization:'Bearer '+manager},body:form()});assert.equal(r.status,201);assert.equal(createdDocument.matiereId,'m1');assert.ok(!('filiereId' in createdDocument));assert.equal(createdDocument.niveauId,'n1');}
 finally {if(createdDocument)await require('node:fs/promises').unlink(require('node:path').join(process.cwd(),'uploads',createdDocument.storageKey));}
});
