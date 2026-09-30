import {NextRequest,NextResponse} from 'next/server';
const base=process.env.BACKEND_API_URL;
const ACCESS='exam_access';
// Match the backend APP_ORIGIN when the frontend is served through this proxy.
const backendAppOrigin=process.env.BACKEND_APP_ORIGIN;
const refreshCookie=(r:Response)=>{const h=r.headers.get('set-cookie');if(!h)return null;const match=h.match(/^([^=;,]+)=([^;]*)/);return match?{name:match[1],value:match[2],expires:/Expires=([^;]+)/i.exec(h)?.[1],maxAge:/Max-Age=(\d+)/i.exec(h)?.[1]}:null};
function setRefresh(out:NextResponse,r:Response){const c=refreshCookie(r);if(c){out.cookies.set(c.name,c.value,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api/backend',...(c.maxAge?{maxAge:Number(c.maxAge)}:{}),...(c.expires?{expires:new Date(c.expires)}:{})})}}
function cookieHeader(req:NextRequest){return req.cookies.getAll().filter(c=>c.name!==ACCESS).map(c=>`${c.name}=${c.value}`).join('; ')}
async function handle(req:NextRequest,ctx:{params:Promise<{path:string[]}>}){
  if(!base)return NextResponse.json({error:{code:'CONFIG',message:'BACKEND_API_URL تنظیم نشده است.'}},{status:503});
  const {path}=await ctx.params;const endpoint=path.join('/');if(path.some(p=>p==='..'))return new NextResponse(null,{status:400});
  if(!['GET','HEAD'].includes(req.method)){const origin=req.headers.get('origin');if(origin&&origin!==req.nextUrl.origin)return new NextResponse(null,{status:403})}
  const upstreamOrigin=backendAppOrigin||req.headers.get('origin')||req.nextUrl.origin;
  const target=`${base.replace(/\/$/,'')}/${endpoint}${req.nextUrl.search}`;
  const bytes=['GET','HEAD'].includes(req.method)?undefined:await req.arrayBuffer();
  const call=(token?:string,url=target)=>{const headers=new Headers();const type=req.headers.get('content-type');if(type)headers.set('content-type',type);if(token)headers.set('authorization',`Bearer ${token}`);const ck=cookieHeader(req);if(ck)headers.set('cookie',ck);headers.set('origin',upstreamOrigin);return fetch(url,{method:req.method,headers,body:bytes,cache:'no-store',redirect:'manual'})};
  try{
    let access=req.cookies.get(ACCESS)?.value;let r=await call(access);
    let rotated:Response|null=null;
    if(r.status===401&&endpoint!=='auth/login'&&endpoint!=='auth/refresh'&&endpoint!=='auth/logout'){
      rotated=await fetch(`${base.replace(/\/$/,'')}/auth/refresh`,{method:'POST',headers:{cookie:cookieHeader(req),origin:upstreamOrigin},cache:'no-store'});
      if(rotated.ok){const b=await rotated.json();access=b.data?.accessToken;const c=refreshCookie(rotated);if(c){const headers=new Headers();const type=req.headers.get('content-type');if(type)headers.set('content-type',type);headers.set('authorization',`Bearer ${access}`);headers.set('cookie',`${c.name}=${c.value}`);headers.set('origin',upstreamOrigin);r=await fetch(target,{method:req.method,headers,body:bytes,cache:'no-store',redirect:'manual'})}}
    }
    if(r.status>=300&&r.status<400)return NextResponse.json({error:{code:'BAD_UPSTREAM_REDIRECT',message:'نشانی پاسخ نامعتبر است.'}},{status:502});
    const headers=new Headers();for(const h of ['content-type','content-disposition']){const v=r.headers.get(h);if(v)headers.set(h,v)}headers.set('cache-control','no-store');headers.set('x-content-type-options','nosniff');
    let body:BodyInit|null=r.body;
    if(endpoint==='auth/login'&&r.ok){const json=await r.json();access=json.data?.accessToken;body=JSON.stringify({data:json.data?.user});headers.set('content-type','application/json')}
    const out=new NextResponse(body,{status:r.status,headers});
    if(endpoint==='auth/login'&&r.ok){if(access)out.cookies.set(ACCESS,access,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api/backend'});setRefresh(out,r)}
    if(rotated?.ok){if(access)out.cookies.set(ACCESS,access,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api/backend'});setRefresh(out,rotated)}
    if(endpoint==='auth/logout'){out.cookies.delete(ACCESS);const c=refreshCookie(r);if(c)out.cookies.delete(c.name)}
    if(endpoint==='auth/refresh'&&r.ok){const json=await r.clone().json();if(json.data?.accessToken)out.cookies.set(ACCESS,json.data.accessToken,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api/backend'});setRefresh(out,r)}
    return out;
  }catch{return NextResponse.json({error:{code:'UPSTREAM_UNAVAILABLE',message:'ارتباط با سرور آزمون برقرار نشد.'}},{status:502})}
}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE};
