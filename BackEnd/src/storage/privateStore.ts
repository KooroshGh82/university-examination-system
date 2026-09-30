import crypto from 'node:crypto';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { env } from '../config/env.js';
import { AppError } from '../errors.js';

const root=path.resolve(env.STORAGE_DIR);
if(!path.isAbsolute(env.STORAGE_DIR))throw new Error('STORAGE_DIR must be an absolute path');
const filePath=(key:string)=>{
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key))throw new AppError(500,'STORAGE_KEY','Invalid stored file key');
  return path.join(root,key);
};
const signature=(bytes:Buffer):'application/pdf'|'image/jpeg'|'image/png'|null=>{
  if(bytes.subarray(0,5).toString('ascii')==='%PDF-')return 'application/pdf';
  if(bytes.length>=5&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff&&bytes.at(-2)===0xff&&bytes.at(-1)===0xd9)return 'image/jpeg';
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
  return null;
};
export const inspectFile=(input:{buffer:Buffer;mimetype:string;originalname:string},question:boolean)=>{
  const mime=signature(input.buffer);
  const ext=path.extname(input.originalname).toLowerCase();
  const allowed:{[key:string]:string[]}={'application/pdf':['.pdf'],'image/jpeg':['.jpg','.jpeg'],'image/png':['.png']};
  if(!mime||!allowed[mime]?.includes(ext)||input.mimetype.toLowerCase()!==mime||(question&&mime!=='application/pdf'))
    throw new AppError(415,'UNSUPPORTED_MEDIA','File content, MIME type and extension must match an allowed format');
  if(input.buffer.length<1||input.buffer.length>5*1024*1024)throw new AppError(413,'PAYLOAD_TOO_LARGE','File must be 1 byte to 5 MiB');
  // Store display metadata only; never use the caller's name as a filesystem path.
  const originalName=path.basename(input.originalname.replace(/\\/g,'/')).replace(/[\x00-\x1f\x7f]/g,'').slice(0,255)||`upload${ext}`;
  return {mimeType:mime,originalName,sizeBytes:input.buffer.length,sha256:crypto.createHash('sha256').update(input.buffer).digest('hex')};
};
export const privateStore={
  async write(buffer:Buffer){
    await fs.mkdir(root,{recursive:true,mode:0o700});
    const key=crypto.randomUUID();
    await fs.writeFile(filePath(key),buffer,{flag:'wx',mode:0o600});
    return key;
  },
  async read(key:string){try{return await fs.readFile(filePath(key));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')throw new AppError(410,'FILE_UNAVAILABLE','File bytes are no longer available');throw e;}},
  async remove(key:string){try{await fs.unlink(filePath(key));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
};
