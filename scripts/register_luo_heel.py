"""Fit the collateral heel turn to the retained skin mesh, not an anatomical claim.
Usage: python register_luo_heel.py MESH.json BODY.glb OUTPUT.json
"""
from pathlib import Path
import hashlib, json, sys
from register_human import read_mesh, Surface

registration, model, output = map(Path, sys.argv[1:4])
data = json.loads(registration.read_text())
raw, vertices, normals, indices = read_mesh(model)
assert hashlib.sha256(raw).hexdigest() == data['assetSha256']
surface = Surface(vertices, normals, indices)
a, b = [data['points'][id]['position'] for id in ['KI4', 'BL60']]
# Keep the authored lower-heel height; locate its posterior skin at the
# midpoint between the two existing ankle references. This is a region,
# not an additional acupoint or a precise anatomical endpoint.
heel = surface.z_project([(a[0]+b[0])/2, .03, -.057], -1)
assert heel['method'] == 'back-z-ray'
assert heel['position'][2] < min(a[2], b[2])
path = surface.surface_path(a, heel['position']) + surface.surface_path(heel['position'], b)[1:]
assert path[0] == a and path[-1] == b
assert all(.15 < p[0] < .35 and 0 < p[1] < .09 and p[2] < .01 for p in path)
result = {
    'channel': 'LUO-KI', 'assetSha256': data['assetSha256'],
    'references': {'KI4': a, 'BL60': b},
    'source': 'https://zh.wikisource.org/w/index.php?title=靈樞經_(四庫全書本)/卷03&oldid=640550',
    'passage': '當踝後繞跟，别走太陽',
    'heelBinding': heel, 'points': path,
    'note': '绕跟段沿现有人体脚跟表面连接，跟中为区域参照；昆仑仅约束足太阳一侧的绘图，不认定它是本络固定终点或新增络穴。体表贴合不等于古文路线的精确解剖验证。',
}
output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'points': len(path), 'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}))
