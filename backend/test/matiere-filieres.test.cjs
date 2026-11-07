require('reflect-metadata');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {BadRequestException}=require('@nestjs/common');
const {AcademicController,ManagementController}=require('../dist/src/academic');
const {DocumentsController}=require('../dist/src/documents');

test('une matière est créée avec plusieurs filières et exige au moins une association',async()=>{
 let query;const db={matiere:{create:async args=>(query=args)}};const controller=new ManagementController(db);
 await controller.create('matieres',{code:'MATH',name:'Mathématiques',filiereIds:['f1','f2','f1']});
 assert.deepEqual(query.data,{code:'MATH',name:'Mathématiques',filieres:{connect:[{id:'f1'},{id:'f2'}]}});
 assert.throws(()=>controller.create('matieres',{code:'MATH',name:'Mathématiques',filiereIds:[]}),BadRequestException);
});
test('modifier les filières associées à une matière met à jour la relation',async()=>{
 let saved;const db={matiere:{update:async args=>{saved=args}}};
 await new ManagementController(db).update('matieres','m1',{code:'M',name:'Matière',filiereIds:['f2']});
 assert.deepEqual(saved.data.filieres,{set:[{id:'f2'}]});
});
test('les matières visibles par un étudiant correspondent à sa filière',async()=>{
 let query;const db={matiere:{findMany:async q=>(query=q,[])}};await new AcademicController(db).list('matieres',{role:'STUDENT',student:{filiereId:'f1'}});
 assert.deepEqual(query.where,{filieres:{some:{id:'f1'}}});
});
test('un document ne peut pas utiliser une matière sans filière',async()=>{
 const db={matiere:{findFirst:async()=>null}};
 await assert.rejects(new DocumentsController(db,{}).intent({id:'admin'},{title:'T',matiereId:'m1',niveauId:'n1',originalName:'test.pdf',sizeBytes:8}),BadRequestException);
});
test('import CSV matières accepte plusieurs filières séparées par une barre verticale',async()=>{
 const saved=[];const db={matiere:{create:({data})=>{saved.push(data);return Promise.resolve(data)}},$transaction:async t=>Promise.all(t)};
 await new ManagementController(db).import('matieres',{originalname:'m.csv',buffer:Buffer.from('code,name,filiereIds\nMATH,Mathématiques,f1|f2')});
 assert.deepEqual(saved[0].filieres.connect,[{id:'f1'},{id:'f2'}]);
});

test('une filière associée à des matières ne peut pas être supprimée silencieusement',async()=>{
 let deleted=false;const db={matiere:{count:async()=>2},filiere:{delete:async()=>{deleted=true}}};
 await assert.rejects(new ManagementController(db).delete('filieres','f1'),BadRequestException);assert.equal(deleted,false);
});
