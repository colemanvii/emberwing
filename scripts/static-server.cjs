const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');

const MIME={
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8',
  '.cjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.wasm':'application/wasm'
};

function safePath(root,urlPath){
  const pathname=decodeURIComponent((urlPath||'/').split('?')[0]);
  const rel=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
  const full=path.resolve(root,rel);
  const base=path.resolve(root)+path.sep;
  if(full!==path.resolve(root)&&!full.startsWith(base))return null;
  return full;
}

function startStaticServer({root=path.resolve(__dirname,'..'),port=0,host='127.0.0.1'}={}){
  return new Promise((resolve,reject)=>{
    const server=http.createServer((req,res)=>{
      const file=safePath(root,req.url);
      if(!file){res.writeHead(403);res.end('Forbidden');return;}
      fs.stat(file,(err,stat)=>{
        if(err||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
        res.writeHead(200,{
          'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream',
          'Cache-Control':'no-store'
        });
        fs.createReadStream(file).pipe(res);
      });
    });
    server.once('error',reject);
    server.listen(port,host,()=>{
      const address=server.address();
      resolve({
        server,
        url:`http://${host}:${address.port}`,
        close:()=>new Promise((done,fail)=>server.close(err=>err?fail(err):done()))
      });
    });
  });
}

module.exports={startStaticServer};

if(require.main===module){
  const port=Number(process.env.PORT||8892);
  startStaticServer({port}).then(({url})=>console.log(`Emberwing available at ${url}`)).catch(error=>{
    console.error(error);
    process.exitCode=1;
  });
}
