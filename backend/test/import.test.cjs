require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { ManagementController } = require('../dist/src/academic');
const { BadRequestException } = require('@nestjs/common');
function db() { const inserted=[];return {inserted,filiere:{create:({data})=>{inserted.push(data);return Promise.resolve(data)}},$transaction:async tasks=>Promise.all(tasks)} }
test('import CSV : contrôle des colonnes et transaction',async()=>{
 const d=db(), c=new ManagementController(d);
 const out=await c.import('filieres',{originalname:'filieres.csv',buffer:Buffer.from('code,name\nINFO,Informatique\nDROIT,Droit')});
 assert.equal(out.imported,2);assert.deepEqual(d.inserted[0],{code:'INFO',name:'Informatique'});
 await assert.rejects(c.import('filieres',{originalname:'filieres.csv',buffer:Buffer.from('code,name\n,Nom')}),BadRequestException);
});
test('import XLSX : lecture des fichiers Excel et rejet des formules',async()=>{
 const wb=new ExcelJS.Workbook(), sheet=wb.addWorksheet('Données');sheet.addRow(['code','name']);sheet.addRow(['SCI','Sciences']);
 const bytes=Buffer.from(await wb.xlsx.writeBuffer());const d=db();const result=await new ManagementController(d).import('filieres',{originalname:'data.xlsx',buffer:bytes});assert.equal(result.imported,1);assert.equal(d.inserted[0].name,'Sciences');
 sheet.getCell('B2').value={formula:'1+1',result:2};const bad=Buffer.from(await wb.xlsx.writeBuffer());
 await assert.rejects(new ManagementController(db()).import('filieres',{originalname:'data.xlsx',buffer:bad}),BadRequestException);
});
