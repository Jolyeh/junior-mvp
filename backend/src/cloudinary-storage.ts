import { Injectable, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

const maxFile = 20 * 1024 * 1024;
@Injectable()
export class CloudinaryStorage {
 private config() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME, api_key = process.env.CLOUDINARY_API_KEY, api_secret = process.env.CLOUDINARY_API_SECRET, preset = process.env.CLOUDINARY_PRESET;
  if (!cloud_name || !api_key || !api_secret || !preset) throw new ServiceUnavailableException('Le stockage des documents n’est pas configuré.');
  cloudinary.config({cloud_name, api_key, api_secret, secure:true});
  return {cloud_name, api_key, api_secret, preset};
 }
 signedUpload(publicId:string) {
  const {cloud_name, api_key, api_secret, preset} = this.config();
  const params = { public_id: publicId, timestamp: Math.floor(Date.now()/1000), type: 'authenticated', overwrite: false, upload_preset: preset };
  return {url:`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud_name)}/raw/upload`, fields:{...params, api_key, signature:cloudinary.utils.api_sign_request(params,api_secret)}};
 }
 downloadUrl(publicId:string, download:boolean) {
  const {cloud_name,api_key,api_secret}=this.config();
  return cloudinary.utils.private_download_url(publicId, 'pdf', {resource_type:'raw',type:'authenticated',attachment:download,expires_at:Math.floor(Date.now()/1000)+60});
 }
 async validate(publicId:string, expectedBytes:number) {
  const {cloud_name,api_key,api_secret}=this.config();
  let asset:any;
  try { asset=await cloudinary.api.resource(publicId,{cloud_name,api_key,api_secret,resource_type:'raw',type:'authenticated'}); }
  catch { throw new BadRequestException('Le fichier privé n’a pas pu être vérifié.'); }
  if(asset.public_id!==publicId || asset.type!=='authenticated' || asset.resource_type!=='raw' || asset.bytes!==expectedBytes || asset.bytes<5 || asset.bytes>maxFile) throw new BadRequestException('Le fichier doit être un PDF privé de 20 Mo maximum.');
  let response:globalThis.Response;
  try { response=await fetch(this.downloadUrl(publicId,false),{headers:{Range:'bytes=0-4'},signal:AbortSignal.timeout(15000)}); }
  catch { throw new ServiceUnavailableException('Impossible de vérifier le document. Réessayez.'); }
  if(!response.ok || !response.body) throw new ServiceUnavailableException('Impossible de vérifier le document. Réessayez.');
  const reader=response.body.getReader();let header=Buffer.alloc(0);
  try { while(header.length<5) {const chunk=await reader.read();if(chunk.done)break;header=Buffer.concat([header,Buffer.from(chunk.value)]).subarray(0,5);} }
  finally {await reader.cancel().catch(()=>{});}
  if(!header.equals(Buffer.from('%PDF-'))) throw new BadRequestException('Le fichier transmis n’est pas un PDF valide.');
 }
 async remove(publicId:string) {
  const {cloud_name,api_key,api_secret}=this.config();
  try {const result=await cloudinary.uploader.destroy(publicId,{resource_type:'raw',type:'authenticated',invalidate:true});if(!['ok','not found'].includes(result.result))throw new Error('destroy failed');}
  catch { throw new ServiceUnavailableException('Le document n’a pas pu être supprimé du stockage. Réessayez.'); }
 }
}
