import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolveMobileLink, mobileMode } from '../mobile/navigation.ts';
const base = 'capacitor://localhost/';
test('local links preserve comparison queries on the custom iOS origin', () => {
  const result = resolveMobileLink('/?points=LU7%2CLI4',base);
  assert.equal(result.kind,'local');
  assert.equal(result.url.searchParams.get('points'),'LU7,LI4');
  for (const path of ['/clock','/combinations','/sources','/about']) assert.equal(resolveMobileLink(path,base).kind,'local');
  assert.equal(mobileMode('/clock'),'clock');
});
test('untrusted schemes, credentials and opaque foreign hosts cannot enter the app', () => {
  for (const url of ['javascript:alert(1)','data:text/html,hello','file:///etc/passwd','capacitor://evilhost/','http://example.com','https://user:password@example.com','/unknown']) {
    assert.equal(resolveMobileLink(url,base).kind,'blocked',url);
  }
  assert.equal(resolveMobileLink('https://www.who.int/publications/',base).kind,'external');
});
test('the native build uses bundled assets and a restrictive network policy', () => {
  const html=readFileSync('dist-mobile/index.html','utf8');
  assert.match(html,/connect-src 'self'/); assert.match(html,/object-src 'none'/);
  const config=JSON.parse(readFileSync('mobile/ios/App/App/capacitor.config.json','utf8'));
  assert.equal(config.server,undefined); assert.equal(config.ios.webContentsDebuggingEnabled,false);
  const expected=JSON.parse(readFileSync('lib/mesh-registration.json','utf8')).assetSha256;
  const hash=createHash('sha256').update(readFileSync('dist-mobile/models/human-learning.glb')).digest('hex');
  assert.equal(hash,expected);
  for(const f of readdirSync('dist-mobile/assets')) {
    if(!/\.(js|css)$/.test(f))continue;
    assert.doesNotMatch(readFileSync('dist-mobile/assets/'+f,'utf8'),/\.chatgpt\.site|appgprj_|\/(?:home|Users)\//);
  }
});
