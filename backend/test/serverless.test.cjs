require('reflect-metadata');
const {test}=require('node:test');const assert=require('node:assert/strict');const {restoreRoute}=require('../dist/src/serverless');
test('reconstruit la route API après réécriture Vercel sans perdre les filtres',()=>{
 assert.equal(restoreRoute('/api/index?__route=documents%2Fabc-12%2Ffile&download=1'),'/api/documents/abc-12/file?download=1');
 assert.equal(restoreRoute('/api/index?__route=auth%2Flogin'),'/api/auth/login');
 assert.equal(restoreRoute('/api/documents?search=test'),'/api/documents?search=test');
 assert.equal(restoreRoute('/api/index'),null);assert.equal(restoreRoute('/api/index?__route=..%2Fadmin'),null);
});
