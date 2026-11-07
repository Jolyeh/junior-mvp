require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { AppModule } = require('../dist/src/app.module');
const { PrismaService } = require('../dist/src/prisma.service');
const { ErrorFilter } = require('../dist/src/error.filter');
let app, url, hash, currentUser, docsFilter;
before(async()=>{
 process.env.JWT_SECRET='test-secret-which-is-long-enough-to-sign-jwts';
 hash=await bcrypt.hash('mot-de-passe-test',4);
 currentUser={id:'u1',email:'etudiant@example.org',role:'STUDENT',isActive:true,tokenVersion:0,passwordHash:hash,student:{id:'s1',isEligible:true,filiereId:'f1'}};
 const db={user:{findUnique:async()=>currentUser,findUniqueOrThrow:async()=>currentUser},student:{findUnique:async()=>null},document:{findMany:async args=>{docsFilter=args.where;return [];},findUnique:async()=>({filiereId:'f2'})},filiere:{findMany:async()=>[]},niveau:{findMany:async()=>[]},matiere:{findMany:async()=>[]},$connect:async()=>{},$disconnect:async()=>{}};
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(PrismaService).useValue(db).compile();
 app=module.createNestApplication();app.setGlobalPrefix('api');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));app.useGlobalFilters(new ErrorFilter());await app.listen(0,'127.0.0.1');url=await app.getUrl();
});
after(async()=>{await app?.close()});
test('parcours HTTP : validation, authentification et isolation',async()=>{
 const post=(path,body,token)=>fetch(url+'/api'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
 let r=await post('/auth/register',{email:'etudiant@example.org',matricule:'123',password:'court'});assert.equal(r.status,400);assert.match(JSON.stringify(await r.json()),/10 caractères/);
 r=await post('/auth/login',{email:'etudiant@example.org',password:'mot-de-passe-test'});assert.equal(r.status,201);const {accessToken}=await r.json();assert.ok(accessToken);
 r=await fetch(url+'/api/documents',{headers:{Authorization:'Bearer '+accessToken}});assert.equal(r.status,200);assert.equal(docsFilter.filiereId,'f1');
 r=await fetch(url+'/api/documents/doc/file',{headers:{Authorization:'Bearer '+accessToken}});assert.equal(r.status,403);
 r=await fetch(url+'/api/management/students',{headers:{Authorization:'Bearer '+accessToken}});assert.equal(r.status,403);
 currentUser.tokenVersion++;r=await fetch(url+'/api/auth/me',{headers:{Authorization:'Bearer '+accessToken}});assert.equal(r.status,401);
});
