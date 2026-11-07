require('reflect-metadata');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {BadRequestException,ServiceUnavailableException}=require('@nestjs/common');
const {v2:cloudinary}=require('cloudinary');
const {CloudinaryStorage}=require('../dist/src/cloudinary-storage');
const env=()=>{process.env.CLOUDINARY_CLOUD_NAME='example';process.env.CLOUDINARY_API_KEY='testkey';process.env.CLOUDINARY_API_SECRET='testsecret';process.env.CLOUDINARY_PRESET='signed-preset'};
test('les autorisations Cloudinary sont signées et les liens de lecture expirent',()=>{
 env();const service=new CloudinaryStorage();const upload=service.signedUpload('esm-benin/test.pdf');assert.equal(upload.fields.type,'authenticated');assert.equal(upload.fields.overwrite,false);assert.equal(upload.fields.upload_preset,'signed-preset');assert.ok(upload.fields.signature);assert.equal(upload.url,'https://api.cloudinary.com/v1_1/example/raw/upload');
 const link=new URL(service.downloadUrl('esm-benin/test.pdf',false));assert.equal(link.hostname,'api.cloudinary.com');assert.equal(link.searchParams.get('type'),'authenticated');assert.ok(link.searchParams.get('signature'));assert.ok(Number(link.searchParams.get('expires_at'))<=Math.floor(Date.now()/1000)+60);assert.equal(link.toString().includes('testsecret'),false);
});
test('validation Cloudinary refuse un fichier public, une taille inattendue et une signature PDF invalide',async()=>{
 env();const s=new CloudinaryStorage(),orig=cloudinary.api.resource,fetchOrig=global.fetch;let asset={public_id:'esm-benin/test.pdf',type:'authenticated',resource_type:'raw',bytes:8};
 cloudinary.api.resource=async()=>asset;
 try {
  global.fetch=async()=>new Response(Buffer.from('%PDF-123'));await s.validate(asset.public_id,8);
  asset={...asset,type:'upload'};await assert.rejects(s.validate(asset.public_id,8),BadRequestException);
  asset={...asset,type:'authenticated',bytes:10};await assert.rejects(s.validate(asset.public_id,8),BadRequestException);
  asset={...asset,bytes:8};global.fetch=async()=>new Response(Buffer.from('not-a-pdf'));await assert.rejects(s.validate(asset.public_id,8),BadRequestException);
  global.fetch=async()=>{throw new Error('offline')};await assert.rejects(s.validate(asset.public_id,8),ServiceUnavailableException);
 } finally {cloudinary.api.resource=orig;global.fetch=fetchOrig}
});
