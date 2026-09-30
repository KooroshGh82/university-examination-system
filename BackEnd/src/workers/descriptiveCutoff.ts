import {prisma} from '../db/prisma.js';
import {descriptiveService} from '../modules/descriptive/descriptive.service.js';
import {privateStore} from '../storage/privateStore.js';
let running=false;
export async function runDescriptiveMaintenance(){
  if(running)return;running=true;
  try{
    const due=await prisma.$queryRaw<{id:string}[]>`
      SELECT a.id FROM exam_attempts a JOIN exams e ON e.id=a.exam_id
      WHERE a.status='IN_PROGRESS' AND e.type='DESCRIPTIVE' AND a.deadline_at<=clock_timestamp()
      ORDER BY a.deadline_at LIMIT 100`;
    for(const a of due){try{await descriptiveService.markAbsentDue(a.id);}catch(e){console.error('Descriptive cutoff failed',a.id,e);}}
    // After an absent attempt, unsubmitted draft objects have no academic submission to retain.
    const abandoned=await prisma.storedFile.findMany({where:{kind:'STUDENT_ANSWER',attempt:{status:'ABSENT'}},take:100});
    for(const f of abandoned){
      try{if(f.storageKey)await privateStore.remove(f.storageKey);await prisma.storedFile.delete({where:{id:f.id}});}
      catch(e){console.error('Abandoned answer cleanup failed',f.id,e);}
    }
    const expired=await prisma.$queryRaw<{id:string;storage_key:string}[]>`
      SELECT id,storage_key FROM stored_files
      WHERE kind='STUDENT_ANSWER' AND purge_after<=clock_timestamp() AND purged_at IS NULL AND storage_key IS NOT NULL
      ORDER BY purge_after LIMIT 100`;
    for(const f of expired){
      try{await privateStore.remove(f.storage_key);await prisma.storedFile.updateMany({where:{id:f.id,storageKey:f.storage_key,purgedAt:null},data:{storageKey:null,purgedAt:new Date()}});}
      catch(e){console.error('Answer retention purge failed',f.id,e);}
    }
  }finally{running=false;}
}
export function startDescriptiveWorker(){
  const timer=setInterval(()=>void runDescriptiveMaintenance().catch(e=>console.error('Descriptive maintenance failed',e)),10000);
  timer.unref();return ()=>clearInterval(timer);
}
