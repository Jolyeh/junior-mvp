require('reflect-metadata');
const { test }=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');const nodemailer=require('nodemailer');const {AuthService}=require('../dist/src/auth');
test('le courriel contient un lien éphémère et la base ne stocke que son hash',async()=>{
 const original=nodemailer.createTransport;let mail,record,version=0;
 nodemailer.createTransport=()=>({sendMail:async m=>{mail=m;}});
 Object.assign(process.env,{SMTP_HOST:'smtp.test',SMTP_FROM:'campus@example.org',FRONTEND_URL:'https://campus.example.org'});
 const db={user:{findUnique:async()=>({id:'u1',email:'a@example.org',isActive:true})},passwordReset:{updateMany:()=>Promise.resolve({count:0}),create:({data})=>{record={...data,id:'r1',usedAt:null};return Promise.resolve(record);}},$transaction:async input=>{if(Array.isArray(input))return Promise.all(input);return input({passwordReset:{findUnique:async({where})=>where.tokenHash===record.tokenHash?record:null,updateMany:async({where,data})=>{if(where.id){record.usedAt=data.usedAt;return {count:1}}return {count:0}}},user:{update:async()=>{version++}}})}};
 try { const auth=new AuthService(db,{});const result=await auth.forgot({email:'a@example.org'});assert.match(result.message,/Si un compte existe/);const match=mail.text.match(/token=([a-f0-9]{64})/);assert.ok(match);const raw=match[1];assert.equal(record.tokenHash,crypto.createHash('sha256').update(raw).digest('hex'));assert.notEqual(record.tokenHash,raw);assert.match(mail.text,/https:\/\/campus\.example\.org\/reset-password/);await auth.reset({token:raw,password:'mot de passe nouveau'});assert.equal(version,1);assert.ok(record.usedAt); }
 finally{nodemailer.createTransport=original;delete process.env.SMTP_HOST;delete process.env.SMTP_FROM;delete process.env.FRONTEND_URL;}
});
