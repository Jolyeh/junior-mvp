require('reflect-metadata');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ForbiddenException}=require('@nestjs/common');
const {DocumentsController}=require('../dist/src/documents');
const {mkdir,writeFile,unlink}=require('node:fs/promises');
const {join}=require('node:path');
const {randomUUID}=require('node:crypto');

test('création : le niveau sert au classement et la matière détermine le partage',async()=>{
 let query,created;
 const db={matiere:{findFirst:async q=>(query=q,{id:'m1'})},document:{create:async ({data})=>{created=data;return {id:'d1'}}}};
 const result=await new DocumentsController(db).upload({id:'u1'}, {title:'Cours',matiereId:'m1',filiereId:'f1',niveauId:'n1'}, {buffer:Buffer.from('%PDF-1.4'),originalname:'cours.pdf',size:8});
 try {
  assert.deepEqual(result,{id:'d1'});assert.deepEqual(query.where,{id:'m1',filieres:{some:{}}});
  assert.equal(created.matiereId,'m1');assert.ok(!('filiereId' in created));assert.equal(created.niveauId,'n1');
 } finally {await unlink(join(process.cwd(),'uploads',created.storageKey));}
});
test('liste : accès par matière pour chaque filière associée, sans exposer l’ancienne filière',async()=>{
 let query;const db={document:{findMany:async q=>{query=q;return [{id:'d1',matiereId:'m1',matiere:{id:'m1'},filiereId:'old',niveauId:'old',storageKey:'secret',sizeBytes:5n}]}}};
 const controller=new DocumentsController(db);
 for(const filiereId of ['f1','f2']) {
  const docs=await controller.list({role:'STUDENT',student:{filiereId}},'n1','m1');
  assert.deepEqual(query.where.matiere,{filieres:{some:{id:filiereId}}});assert.equal(query.where.matiereId,'m1');assert.equal(query.where.niveauId,'n1');
  assert.equal(docs[0].sizeBytes,5);assert.equal(docs[0].storageKey,undefined);assert.equal(docs[0].filiereId,undefined);assert.equal(docs[0].niveauId,'old');
 }
 await controller.list({role:'STUDENT',student:{filiereId:'f1',niveauId:'n2'}});assert.equal(query.where.niveauId,undefined);
 await controller.list({role:'MANAGER'},'n1','m1');assert.equal(query.where.matiere,undefined);
});
test('lecture et téléchargement autorisés aux filières associées, refusés aux autres et après retrait',async()=>{
 const key=`test-${randomUUID()}.pdf`;const path=join(process.cwd(),'uploads',key);await mkdir(join(process.cwd(),'uploads'),{recursive:true});await writeFile(path,'%PDF-test');
 let associations=[{id:'f1'},{id:'f2'}];let query;
 const controller=new DocumentsController({document:{findUnique:async q=>(query=q,{storageKey:key,matiere:{filieres:associations}})}});
 const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},send(data){this.data=data}});
 try {
  for(const [id,download] of [['f1','0'],['f2','1']]) {const res=response();await controller.file('d1',{role:'STUDENT',student:{filiereId:id,niveauId:'niveau-different'}},download,res);assert.equal(res.data.toString(),'%PDF-test');assert.match(res.headers['Content-Disposition'],download==='1'?/^attachment/:/^inline/);}
  assert.ok(query.include.matiere.select.filieres);
  await assert.rejects(controller.file('d1',{role:'STUDENT',student:{filiereId:'f3'}},'0',response()),ForbiddenException);
  associations=[{id:'f2'}];await assert.rejects(controller.file('d1',{role:'STUDENT',student:{filiereId:'f1'}},'1',response()),ForbiddenException);
  const res=response();await controller.file('d1',{role:'ADMIN'},'0',res);assert.equal(res.data.toString(),'%PDF-test');
 } finally {await unlink(path)}
});
