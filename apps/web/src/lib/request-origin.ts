// Trusted deployment proxy preserves Host and supplies x-forwarded-proto.
// Do not use x-forwarded-host: an arbitrary client can supply it.
export function requestOrigin(req:Request){
 const url=new URL(req.url),host=req.headers.get('host')??url.host;
 const protocol=req.headers.get('x-forwarded-proto')?.split(',')[0]??url.protocol.slice(0,-1);
 if(!['http','https'].includes(protocol))throw new Error('Origin not allowed');
 const origin=new URL(`${protocol}://${host}`);
 if(origin.host!==host||origin.username||origin.password)throw new Error('Origin not allowed');
 return origin.origin;
}
