import test from 'node:test';
import assert from 'node:assert/strict';
import argon2 from 'argon2';
process.env.DATABASE_URL='postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET='a'.repeat(48);
process.env.REFRESH_PEPPER='b'.repeat(48);
process.env.APP_ORIGIN='http://localhost:5173';
const {authService,hashPassword}=await import('../src/modules/auth/auth.service.js');
const {usersService}=await import('../src/modules/users/users.service.js');
const {usersRepository}=await import('../src/modules/users/users.repository.js');
const {prisma}=await import('../src/db/prisma.js');
const {requireRole}=await import('../src/middleware/authenticate.js');
const user={id:'test-user',universityId:'001',fullName:'Test User',role:'STUDENT' as const,email:null,isActive:true,createdAt:new Date(),passwordHash:await hashPassword('123456')};
test('provisioning hashes 123456 and accepts only name and university ID',async()=>{
 const original=usersRepository.createProvisioned;
 try{
  usersRepository.createProvisioned=async input=>{assert.equal(input.universityId,'001');assert.equal(input.fullName,'Test User');assert.ok(await argon2.verify(input.passwordHash,'123456'));return {...user,...input}};
  for(const role of ['STUDENT','PROFESSOR'] as const){const result=await usersService.provision(role,{fullName:' Test User ',universityId:' 001 '});assert.equal(result.role,role);assert.ok(!('passwordHash' in result))}
  await assert.rejects(usersService.provision('STUDENT',{fullName:'Test',universityId:'002',initialPassword:'custom'}));
 }finally{usersRepository.createProvisioned=original}
});
test('password change verifies old password, hashes new password and revokes other sessions atomically',async()=>{
 const original=prisma.$transaction;let called=false;
 try{
  prisma.$transaction=(async (callback:any)=>callback({user:{updateMany:async (args:any)=>{called=true;assert.equal(args.where.passwordHash,user.passwordHash);assert.ok(await argon2.verify(args.data.passwordHash,'new-password'));return {count:1}}},authSession:{updateMany:async (args:any)=>{assert.equal(args.where.userId,user.id);assert.deepEqual(args.where.id,{not:'current-session'});return {count:1}}}})) as typeof prisma.$transaction;
  await assert.rejects(authService.changePassword(user,'current-session','wrong','new-password'));assert.equal(called,false);
  await authService.changePassword(user,'current-session','123456','new-password');assert.equal(called,true);
 }finally{prisma.$transaction=original}
});
test('only admin passes the account provisioning role guard',()=>{
 for(const role of ['STUDENT','PROFESSOR','ADMIN'] as const){let error:any;requireRole('ADMIN')({auth:{user:{...user,role}}} as any,{} as any,(e?:any)=>{error=e});assert.equal(error?.status,role==='ADMIN'?undefined:403)}
});

test('account validation rejects numbers in names and nonnumeric codes for both roles before database writes',async()=>{
 const original=usersRepository.createProvisioned;let writes=0;
 try{
  usersRepository.createProvisioned=async input=>{writes++;return {...user,...input}};
  for(const role of ['STUDENT','PROFESSOR'] as const){
   for(const fullName of ['Ali123','علی۱۲۳','علی١٢٣','123','💡','   '])await assert.rejects(usersService.provision(role,{fullName,universityId:'001'}));
   for(const universityId of ['abc','12a','12-34','12 34','+123','1.2',''])await assert.rejects(usersService.provision(role,{fullName:'علی رضایی',universityId}));
  }
  assert.equal(writes,0);
  for(const universityId of ['۰۰۱','٠٠١','001']){const result=await usersService.provision('STUDENT',{fullName:'علی رضایی',universityId});assert.equal(result.universityId,'001')}
 }finally{usersRepository.createProvisioned=original}
});
