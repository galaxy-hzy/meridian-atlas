"""Check rendered routes and their referenced assets against the local service."""
import argparse
import datetime
import json
import hashlib
import re
import urllib.request
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:4319')
parser.add_argument('--output', default='work/validation/http.json')
args = parser.parse_args()
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
rows = []
assets = set()
routes = [
    ('/', '三维经络图谱'),
    ('/clock', '十二时辰'),
    ('/combinations', '消渴相关配穴'),
    ('/sources', '当前模型与资料状态'),
    ('/?points=EX-B3%2CBL13%2CBL20%2CBL23%2CSP6%2CKI3%2CLU9%2CHT8', '跨经配穴对照'),
]
for route, marker in routes:
    with opener.open(args.base + route, timeout=15) as response:
        body = response.read().decode()
        row = {'route': route, 'status': response.status,
               'expected_text_present': marker in body, 'bytes': len(body.encode())}
        rows.append(row)
        assert response.status == 200 and marker in body, row
        assets.update(re.findall(r'(?:src|href)="(/_next/[^"<>]+)"', body))
for asset in sorted(assets):
    with opener.open(args.base + asset, timeout=15) as response:
        content_type = response.headers.get('content-type', '')
        expected_type = 'javascript' if asset.endswith('.js') else 'text/css' if asset.endswith('.css') else ''
        row = {'asset': asset, 'status': response.status, 'content_type': content_type,
               'bytes': len(response.read())}
        rows.append(row)
        assert response.status == 200 and expected_type in content_type, row
mesh = json.loads((Path(__file__).resolve().parents[1] / 'lib/mesh-registration.json').read_text())
with opener.open(args.base + mesh['assetUrl'], timeout=15) as response:
    content = response.read()
    actual_hash = hashlib.sha256(content).hexdigest()
    assert response.status == 200 and actual_hash == mesh['assetSha256'], 'Served mesh differs from registered mesh'
    rows.append({'asset': mesh['assetUrl'], 'status': response.status, 'bytes': len(content), 'sha256': actual_hash})
result = {'checked_at': datetime.datetime.now().astimezone().isoformat(), 'base': args.base,
          'scope': 'SSR route responses and assets directly referenced by their HTML; does not replace browser interaction tests',
          'results': rows}
output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(f'PASS: {len(routes)} route responses, {len(assets)} referenced assets and matching human mesh; {output}')
