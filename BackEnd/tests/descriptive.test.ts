import test from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_URL='postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET='a'.repeat(48);
process.env.REFRESH_PEPPER='b'.repeat(48);
process.env.APP_ORIGIN='http://localhost:5173';
process.env.STORAGE_DIR='/tmp/university-exams-test-private';
const {inspectFile}=await import('../src/storage/privateStore.js');
const {sixMonthsLater}=await import('../src/modules/descriptive/descriptive.service.js');
const pdf=Buffer.from('%PDF-1.7\nvalid data');
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.from('payload')]);
test('accept matching PDF signature, MIME and extension',()=>{
  const m=inspectFile({buffer:pdf,mimetype:'application/pdf',originalname:'exam.pdf'},true);
  assert.equal(m.mimeType,'application/pdf');assert.equal(m.sizeBytes,pdf.length);
});
test('reject spoofed extension or MIME',()=>{
  assert.throws(()=>inspectFile({buffer:pdf,mimetype:'application/pdf',originalname:'exam.jpg'},false));
  assert.throws(()=>inspectFile({buffer:pdf,mimetype:'image/jpeg',originalname:'exam.pdf'},false));
});
test('reject image masquerading as question PDF',()=>{
  assert.throws(()=>inspectFile({buffer:png,mimetype:'image/png',originalname:'exam.png'},true));
});
test('reject larger than 5 MiB',()=>{
  assert.throws(()=>inspectFile({buffer:Buffer.concat([pdf,Buffer.alloc(5*1024*1024)]),mimetype:'application/pdf',originalname:'x.pdf'},false));
});
test('clamp six calendar months at shorter month',()=>{
  assert.equal(sixMonthsLater(new Date('2026-08-31T14:20:00Z')).toISOString(),'2027-02-28T14:20:00.000Z');
});
