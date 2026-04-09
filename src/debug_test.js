const fs = require('fs');
const vm = require('vm');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const code = fs.readFileSync('src/content.js','utf8');
const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
const window = dom.window;
const document = window.document;
const console = global.console;

const sandbox = {window, document, console, setTimeout, clearTimeout};
vm.createContext(sandbox);

// Extract inferSourceType function source
const fnStart = code.indexOf('function inferSourceType');
if (fnStart === -1) {
  console.error('inferSourceType not found');
  process.exit(1);
}
let i = code.indexOf('{', fnStart);
let depth = 0;
let end = -1;
for (; i < code.length; i++) {
  if (code[i] === '{') depth++;
  else if (code[i] === '}') {
    depth--;
    if (depth === 0) { end = i+1; break; }
  }
}
if (end === -1) {
  console.error('could not parse function body');
  process.exit(1);
}
const fnSource = code.slice(fnStart, end);

// Define function in sandbox and a helper to invoke it
const helper = `\n; this.inferSourceType = inferSourceType; this.__testInfer = function(el){ try{ const links = Array.from(el.querySelectorAll('a')).map(a=>a.href); return {res: inferSourceType(el), text: (el.innerText||''), links}; }catch(e){return {error: e&&e.message}} }`;
vm.runInContext(fnSource + helper, sandbox);

const tests = [
  {html: `<div><a href="https://example.com/file.md">file</a></div>`, expect: 'markdown'},
  {html: `<div><a href="https://example.com/presentation.pptx">ppt</a></div>`, expect: 'presentation'},
  {html: `<div><a href="https://youtu.be/abc">yt</a></div>`, expect: 'video_youtube'},
  {html: `<div><a href="https://example.com/file.pdf">pdf</a></div>`, expect: 'drive_pdf'},
  {html: `<div>これはマークダウンの例 markdown</div>`, expect: 'markdown'},
  {html: `<div>音声ファイル example.mp3</div>`, expect: 'audio'},
  {html: `<div>ただのテキスト example.txt</div>`, expect: 'text'}
];

for (const t of tests) {
  const el = document.createElement('div');
  el.innerHTML = t.html;
  const diag = sandbox.__testInfer(el);
  console.log('HTML:', t.html, '=>', diag, 'expected', t.expect);
}
