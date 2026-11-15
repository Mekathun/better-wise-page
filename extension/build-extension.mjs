// Build: stamp manifest key, embed snapshot, zip, and pack a signed CRX.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const KEY_FILE = path.join(DIR, '..', 'build', 'wesley-cards-extension-key.pem');
const MANIFEST = path.join(DIR, 'manifest.json');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

// 1. key pair (stable id + CRX signature)
let pem;
if (fs.existsSync(KEY_FILE)) pem = fs.readFileSync(KEY_FILE, 'utf8');
else {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  fs.writeFileSync(KEY_FILE, pem);
  console.log('generated', KEY_FILE);
}
const privateKey = crypto.createPrivateKey(pem);
const spki = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' });
const keyB64 = spki.toString('base64');
const hex = crypto.createHash('sha256').update(spki).digest('hex').slice(0, 32);
const id = [...hex].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('');

// 2. manifest: fixed key so the extension id is stable across computers
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
manifest.key = keyB64;
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

// 4. zip for "load unpacked"
const zipPath = path.join(DIR, 'wesley-cards-extension.zip');
fs.rmSync(zipPath, { force: true });
execFileSync('python', ['-c', `
import zipfile, os
root = r'${DIR}'
out = r'${zipPath}'
skip = {'extension-key.pem','wesley-cards-extension.zip','wesley-cards-extension.crx','build-extension.mjs','make-icons.py'}
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for base, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in ('node_modules','.git')]
        for f in files:
            p = os.path.join(base, f)
            rel = os.path.relpath(p, root)
            if rel in skip: continue
            z.write(p, rel)
print('zipped', out)
`], { stdio: 'inherit' });

// 5. CRX3 via Edge --pack-extension with a throwaway profile
const crxPath = DIR + '.crx';
fs.rmSync(crxPath, { force: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pack-ext-'));
try {
  execFileSync(EDGE, [
    `--user-data-dir=${tmp}`, '--no-first-run', '--no-default-browser-check', '--headless=new',
    `--pack-extension=${DIR}`, `--pack-extension-key=${KEY_FILE}`,
  ], { stdio: 'inherit', timeout: 120000 });
} catch (error) {
  console.log('pack-extension exit:', error.status ?? error.message);
}
console.log('crx exists:', fs.existsSync(crxPath), crxPath);

// 6. 按版本号复制到项目根目录（D:\DSH\Better_WiSE）
try {
  const version = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8')).version;
  // 文件名直接跟 manifest 版本号走（0.1.2.6 → Better_WiSE_v0.1.2.6）
  const label = version;
  const root = path.dirname(DIR);
  const outCrx = path.join(root, `Better_WiSE_v${label}.crx`);
  const outZip = path.join(root, `Better_WiSE_v${label}.zip`);
  if (fs.existsSync(crxPath)) fs.copyFileSync(crxPath, outCrx);
  if (fs.existsSync(zipPath)) fs.copyFileSync(zipPath, outZip);
  console.log('PACKAGED:', outCrx);
  console.log('PACKAGED:', outZip);
  fs.rmSync(crxPath, { force: true }); // 中间文件，根目录已有带版本号的那份

  // 6b. 商店专用包：manifest 里不能带 key，否则上传会报
  //     「清单中“key”字段的值与当前内容不符」（本地 key 与商店公钥不是同一把）。
  const storeZip = path.join(root, `Better_WiSE_v${label}-store.zip`);
  const { execFileSync } = await import('node:child_process');
  execFileSync('python', ['-c', `
import zipfile, json, os, shutil, tempfile
src, dst = r'${outZip}', r'${storeZip}'
tmp = tempfile.mkdtemp()
with zipfile.ZipFile(src) as z:
    z.extractall(tmp)
mp = os.path.join(tmp, 'manifest.json')
m = json.load(open(mp, encoding='utf-8'))
m.pop('key', None)
open(mp, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=2))
with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as z:
    for root_, _, files in os.walk(tmp):
        for f in files:
            p = os.path.join(root_, f)
            z.write(p, os.path.relpath(p, tmp).replace(os.sep, '/'))
shutil.rmtree(tmp, ignore_errors=True)
`], { stdio: 'inherit' });
  console.log('PACKAGED:', storeZip, '(no manifest.key, for Chrome Web Store)');
} catch (e) {
  console.log('copy-to-root skipped:', e.message);
}
console.log('EXTENSION_ID:', id);
