const { test } = require('node:test');
const assert = require('node:assert/strict');
const { databaseErrorKind, databaseDiagnostic } = require('../dist/src/database-error');
const { ErrorFilter } = require('../dist/src/error.filter');
test('détecte les erreurs PostgreSQL ou Prisma même dans les causes imbriquées', () => {
 assert.equal(databaseErrorKind({code:'P1000'}),'auth');
 assert.equal(databaseErrorKind({code:'P2010',meta:{driverAdapterError:{cause:{originalCode:'28P01'}}}}),'auth');
 assert.equal(databaseErrorKind({message:'Authentication failed against the database server, the provided database credentials for `(not available)` are not valid'}),'auth');
 assert.equal(databaseErrorKind({cause:{code:'ECONNREFUSED'}}),'unreachable');
 assert.equal(databaseErrorKind({code:'P2022'}),'schema');
 assert.equal(databaseErrorKind({code:'P2002'}),null);
 assert.match(databaseDiagnostic('auth'),/DATABASE_URL/);
});
test('renvoie un message public générique sans exposer les secrets', () => {
 let status, body; const response={status(s){status=s;return this},json(b){body=b}};
 new ErrorFilter().catch({code:'P1000',message:'password secret'}, {switchToHttp:()=>({getResponse:()=>response})});
 assert.equal(status,503); assert.doesNotMatch(JSON.stringify(body),/secret|password/);
});
test('vérifie réellement la connexion au démarrage et renvoie un diagnostic sans secrets', async () => {
 const {PrismaService}=require('../dist/src/prisma.service');
 const old=process.env.DATABASE_URL;process.env.DATABASE_URL='postgresql://example:secret@localhost:5432/test';
 try {
  const service=new PrismaService();let disconnected=false;service.$connect=async()=>{};service.$queryRaw=async()=>{throw {code:'P1000',message:'password secret'}};service.$disconnect=async()=>{disconnected=true};
  await assert.rejects(service.onModuleInit(), e=>{assert.match(e.message,/Authentification PostgreSQL refusée/);assert.doesNotMatch(e.message,/secret/);return true});
  assert.ok(disconnected);
 } finally { if(old===undefined)delete process.env.DATABASE_URL; else process.env.DATABASE_URL=old; }
});
