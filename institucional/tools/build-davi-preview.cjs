// Public portfolio snapshot only. Never copy deployment config or private files.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = path.resolve(process.argv[2] || '');
assert(process.argv[2] && fs.existsSync(path.join(source, 'index.html')), 'Pass the approved public dist directory.');
const prefix = 'assets/previews/davi-v1';
const output = path.resolve(__dirname, '..', prefix);
const files = ['site.css','brand-motion.css','preloader.css','producer-credit.css','config.js','works-data.js','image-utils.js','app.js','motion.js','house-model.js'];
fs.mkdirSync(output,{recursive:true});
for (const file of files) {
  let body = fs.readFileSync(path.join(source,file),'utf8');
  if (file === 'site.css') body = body.replace("url('assets/fontes/archivo-variable.woff2')", "url('data:font/woff2;base64," + fs.readFileSync(path.join(source,'assets/fontes/archivo-variable.woff2')).toString('base64') + "')");
  if (file === 'house-model.js') body = '(() => {\n' + body + '\n})();';
  fs.writeFileSync(path.join(output,file),body);
}
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
for (const file of walk(path.join(source,'assets'))) {
  if (!/\.(webp|jpg|png|svg)$/i.test(file)) continue;
  const relative=path.relative(source,file);
  fs.mkdirSync(path.dirname(path.join(output,relative)),{recursive:true});
  fs.copyFileSync(file,path.join(output,relative));
}
let html = fs.readFileSync(path.join(source,'index.html'),'utf8')
  .replace(/<meta name="robots"[^>]+>/,'<meta name="robots" content="noindex, nofollow">')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'')
  .replace(/<script data-brand-preloader-bootstrap>[\s\S]*?<\/script>/,'')
  .replace(/<script src="favicon.js[^>]*><\/script>/,'')
  .replace(/<link rel="(?:icon|apple-touch-icon|manifest|describedby|alternate)"[^>]*>/g,'')
  .replace(/<link rel="preload"[^>]*as="font"[^>]*>/g,'')
  .replace('type="module" src="house-model.js','src="house-model.js')
  .replace('</head>','<script src="preview-only.js" defer></script>\n</head>')
  .replace(/[ \t]+$/gm,'');
assert(!/<form|gtag\(|fbq\(|googletagmanager/i.test(html),'Unexpected collection in public preview.');
fs.writeFileSync(path.join(output,'index.html'),html);
fs.writeFileSync(path.resolve(__dirname,'../../deploy/sites-preview-files.txt'),walk(output).map(file=>prefix+'/'+path.relative(output,file)).sort().join('\n')+'\n');
console.log('Public preview prepared. Original project unchanged.');
