"""Constrained surface-only trial; never updates atlas coordinates.
Usage: python trial_neck_registration.py SKIN.obj HUMAN.glb OUTPUT_DIRECTORY [--symmetric]
Requires numpy and Pillow. A low surface residual is not anatomical validation.
"""
from pathlib import Path
import hashlib
import json
import sys
import numpy as np
from prepare_neck_reference import read_obj
from register_human import read_mesh


def nearest(a, b):
    ids, distances = [], []
    for start in range(0, len(a), 100):
        d = np.sum((a[start:start+100, None, :]-b[None, :, :])**2, axis=2)
        i = np.argmin(d, axis=1)
        ids.extend(i.tolist())
        distances.extend(np.sqrt(d[np.arange(len(i)), i]).tolist())
    return np.array(ids), np.array(distances)


def sample(points, limit):
    return points[np.linspace(0, len(points)-1, min(limit, len(points)), dtype=int)]


def fit(source, target, symmetric=False):
    current = source.copy(); scale = 1.; shift = np.zeros(3); history = []
    for step in range(60):
        ids, distance = nearest(current, target)
        # Trim distant shoulders and geometry outside the overlapping crop.
        mask = distance <= np.quantile(distance, .85)
        a, b = current[mask], target[ids[mask]]
        if symmetric:
            reverse_ids, reverse_distance = nearest(target, current)
            reverse_mask = reverse_distance <= np.quantile(reverse_distance, .85)
            a = np.concatenate([a, current[reverse_ids[reverse_mask]]])
            b = np.concatenate([b, target[reverse_mask]])
        ac, bc = a.mean(axis=0), b.mean(axis=0)
        factor = float(np.sum((a-ac)*(b-bc))/np.sum((a-ac)**2))
        factor = float(np.clip(factor, .99, 1.01))
        new_scale = scale*factor
        if not .85 <= new_scale <= 1.15:
            break
        translation = bc-factor*ac
        translation[0] = 0.  # Preserve the midsagittal plane; no rotation or warp.
        movement = np.max(np.linalg.norm(current*factor+translation-current, axis=1))
        current = current*factor+translation
        scale = new_scale; shift = shift*factor+translation
        history.append({'step': step, 'trimmedRms': float(np.sqrt(np.mean(distance[mask]**2))),
                        'scaleRelativeToHeight': scale})
        if movement < 1e-7:
            break
    return scale, shift, history


def metrics(a, b):
    _, ab = nearest(a, b); _, ba = nearest(b, a)
    def summarize(d):
        return {'median': float(np.median(d)), 'p95': float(np.quantile(d, .95)),
                'max': float(d.max()), 'rms': float(np.sqrt(np.mean(d*d)))}
    return {'sourceToTarget': summarize(ab), 'targetToSource': summarize(ba)}


if __name__ == '__main__':
    skin_path, human_path, output = map(Path, sys.argv[1:4])
    symmetric = '--symmetric' in sys.argv[4:]
    skin, _ = read_obj(skin_path); skin = np.array(skin)
    _, human, _, _ = read_mesh(human_path)
    # Source +Z is superior; source -Y is anterior. Preserve +X side.
    axes = np.array([[1., 0., 0.], [0., 0., 1.], [0., -1., 0.]])
    oriented = skin@axes.T
    height_scale = float(np.ptp(human[:, 1])/np.ptp(oriented[:, 1]))
    initial_shift = np.array([0., human[:, 1].min()-oriented[:, 1].min()*height_scale, 0.])
    initial_shift[2] = float((human[:, 2].min()+human[:, 2].max())/2-
                             (oriented[:, 2].min()+oriented[:, 2].max())*height_scale/2)
    initial = oriented*height_scale+initial_shift
    crop = lambda p: p[(p[:, 1] >= 1.48)&(p[:, 1] <= 1.65)&(np.abs(p[:, 0]) <= .14)]
    source = crop(initial); target = crop(human)
    if min(len(source), len(target)) < 100:
        raise ValueError('Insufficient crop overlap')
    train_source = sample(source[::2], 1800); train_target = sample(target[::2], 1800)
    validation_source = sample(source[1::2], 1800); validation_target = sample(target[1::2], 1800)
    factor, translation, history = fit(train_source, train_target, symmetric)
    matrix = np.eye(4)
    matrix[:3, :3] = axes*height_scale*factor
    matrix[:3, 3] = initial_shift*factor+translation
    result = {'status': 'Surface-only candidate. Not approved for point transfer.',
              'symmetricTraining': symmetric,
              'inputSha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in [skin_path, human_path]},
              'sourceToAtlasColumnVectorMatrix': matrix.tolist(),
              'heightScale': height_scale, 'additionalScale': factor,
              'roiInitialAtlasCoordinates': {'y': [1.48, 1.65], 'absoluteXMax': .14},
              'trainingPointCounts': [len(train_source), len(train_target)],
              'heldOutPointCounts': [len(validation_source), len(validation_target)],
              'initialHeldOutMetrics': metrics(validation_source, validation_target),
              'candidateHeldOutMetrics': metrics(validation_source*factor+translation, validation_target),
              'history': history,
              'limitations': ['Vertex samples are not uniform surface samples.',
                             'Crop and nearest-neighbor agreement do not establish correspondence of anatomical landmarks.',
                             'No rotation, nonrigid fitting, or point-coordinate changes are performed.']}
    output.mkdir(parents=True, exist_ok=True)
    (output/'trial-registration.json').write_text(json.dumps(result, indent=2)+'\n')
    from PIL import Image, ImageDraw, ImageFont
    im = Image.new('RGB', (1100, 650), '#f7f8fa'); draw = ImageDraw.Draw(im)
    font_path = next((p for p in ['/System/Library/Fonts/Helvetica.ttc',
                     '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'] if Path(p).exists()), None)
    font = ImageFont.truetype(font_path, 17) if font_path else ImageFont.load_default()
    draw.text((20, 18), 'Neck surface candidate - blue: target, orange: transformed source', fill='#172a38', font=font)
    draw.text((20, 43), 'Held-out vertex samples. Surface agreement does not validate internal anatomy.', fill='#172a38', font=font)
    aligned = validation_source*factor+translation
    for panel in range(2):
        for points, color in [(validation_target, '#376fbd'), (aligned, '#d48842')]:
            for point in points:
                x = (point[0] if panel == 0 else point[2]-.04)*2400+275+panel*550
                y = 560-(point[1]-1.46)*2400
                if panel*550+15 < x < (panel+1)*550-15 and 90 < y < 590:
                    draw.ellipse((x-1, y-1, x+1, y+1), fill=color)
        draw.text((panel*550+210, 603), 'Front projection' if panel == 0 else 'Side projection', fill='#172a38', font=font)
    im.save(output/'trial-overlay.png')
    print(json.dumps({'initial': result['initialHeldOutMetrics'], 'candidate': result['candidateHeldOutMetrics'], 'additionalScale': factor}))
