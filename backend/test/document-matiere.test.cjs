require('reflect-metadata');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {BadRequestException,ForbiddenException}=require('@nestjs/common');
const {DocumentsController}=require('../dist/src/documents');
const dto={title:'Cours',matiereId:'m1',niveauId:'n1',originalName:'cours.pdf',sizeBytes:8};
test('envoi direct : autorisation privée pour une matière et un niveau valides',async()=>{
 let saved, signedKey;const db={matiere:{findFirst:async()=>({id:'m1'})},niveau:{findUnique:async()=>({id:'n1'})},uploadTicket:{create:async({data})=>(saved=data,{id:'t1'})}};
 const storage={signedUpload:key=>(signedKey=key,{url:'https://api.cloudinary.com/test',fields:{type:'authenticated'}})};
 const result=await new DocumentsController(db,storage).intent({id:'u1'},dto);
 assert.equal(result.ticketId,'t1');assert.match(signedKey,/^esm-benin\/.+\.pdf$/);assert.equal(saved.storageKey,signedKey);assert.equal(saved.niveauId,'n1');assert.equal(saved.matiereId,'m1');assert.equal(saved.uploadedById,'u1');assert.ok(!('filiereId' in saved));
});
test('finalisation vérifie le document privé et consomme le ticket une seule fois',async()=>{
 let consumed=false,saved;const ticket={...dto,id:'t1',storageKey:'esm-benin/a.pdf',uploadedById:'u1',sizeBytes:8n,expiresAt:new Date(Date.now()+60000),consumedAt:null};
 const tx={matiere:{findFirst:async()=>({id:'m1'})},uploadTicket:{updateMany:async()=>{if(consumed)return {count:0};consumed=true;return {count:1}}},document:{create:async({data})=>(saved=data,{id:'d1'})}};
 const db={uploadTicket:{findUnique:async()=>ticket},$transaction:async fn=>fn(tx)};let verified=0;const storage={validate:async(key,size)=>{verified++;assert.equal(key,ticket.storageKey);assert.equal(size,8)}};const c=new DocumentsController(db,storage);
 await assert.rejects(c.finish({id:'other'},{ticketId:'t1'}),BadRequestException);assert.equal(verified,0);
 assert.deepEqual(await c.finish({id:'u1'},{ticketId:'t1'}),{id:'d1'});assert.equal(saved.matiereId,'m1');assert.equal(saved.niveauId,'n1');
 await assert.rejects(c.finish({id:'u1'},{ticketId:'t1'}),BadRequestException);
});
test('liste : accès par matière pour chaque filière associée, filtrage facultatif par niveau',async()=>{
 let query;const db={document:{findMany:async q=>(query=q,[{id:'d1',matiereId:'m1',matiere:{id:'m1'},filiereId:'old',niveauId:'old',storageKey:'secret',sizeBytes:5n}])}};const controller=new DocumentsController(db,{});
 for(const filiereId of ['f1','f2']) {const docs=await controller.list({role:'STUDENT',student:{filiereId}},'n1','m1');assert.deepEqual(query.where.matiere,{filieres:{some:{id:filiereId}}});assert.equal(query.where.matiereId,'m1');assert.equal(query.where.niveauId,'n1');assert.equal(docs[0].storageKey,undefined);assert.equal(docs[0].filiereId,undefined);}
 await controller.list({role:'STUDENT',student:{filiereId:'f1',niveauId:'n2'}});assert.equal(query.where.niveauId,undefined);await controller.list({role:'MANAGER'},'n1','m1');assert.equal(query.where.matiere,undefined);
});
test('liens privés réservés aux filières associées, refusés aux autres et après retrait',async()=>{
 let associations=[{id:'f1'},{id:'f2'}],query;const storage={downloadUrl:(key,download)=>`https://api.cloudinary.com/download?file=${key}&download=${download}`};
 const controller=new DocumentsController({document:{findUnique:async q=>(query=q,{storageKey:'secret.pdf',matiere:{filieres:associations}})}},storage);
 for(const [id,download] of [['f1','0'],['f2','1']]) {const result=await controller.file('d1',{role:'STUDENT',student:{filiereId:id,niveauId:'niveau-different'}},download);assert.match(result.url,/api.cloudinary.com/);}
 assert.ok(query.include.matiere.select.filieres);await assert.rejects(controller.file('d1',{role:'STUDENT',student:{filiereId:'f3'}},'0'),ForbiddenException);
 associations=[{id:'f2'}];await assert.rejects(controller.file('d1',{role:'STUDENT',student:{filiereId:'f1'}},'1'),ForbiddenException);assert.ok((await controller.file('d1',{role:'ADMIN'},'0')).url);
});
