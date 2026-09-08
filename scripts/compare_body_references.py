"""Render exterior comparison only; this is not anatomical registration.
Usage: python compare_body_references.py SOURCE_SKIN.obj CURRENT.glb OUTPUT.png
Requires numpy and Pillow.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from prepare_neck_reference import read_obj
from register_human import read_mesh

if __name__ == '__main__':
    skin, model, output = map(Path, sys.argv[1:4])
    sv, sf = read_obj(skin); sv = np.array(sv)[:, [0, 2, 1]]; sv[:, 2] *= -1
    sv[:, 1] -= sv[:, 1].min(); sv *= 1.85/np.ptp(sv[:, 1])
    sv[:, 2] -= (sv[:, 2].min()+sv[:, 2].max())/2
    _, mv, _, mf = read_mesh(model)
    image = Image.new('RGB', (1600, 850), '#f2f4f7'); draw = ImageDraw.Draw(image)
    font_path = next((p for p in ['/System/Library/Fonts/Helvetica.ttc',
                     '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'] if Path(p).exists()), None)
    font = ImageFont.truetype(font_path, 19) if font_path else ImageFont.load_default()
    panels = [(mv, mf, 250, False, 'Current: front'), (sv, np.array(sf), 750, False, 'Reference: front'),
              (mv, mf, 1160, True, 'Current: side'), (sv, np.array(sf), 1440, True, 'Reference: side')]
    for vertices, faces, center, side, label in panels:
        triangles = vertices[faces]
        cross = np.cross(triangles[:, 1]-triangles[:, 0], triangles[:, 2]-triangles[:, 0])
        normals = cross/np.maximum(np.linalg.norm(cross, axis=1, keepdims=True), 1e-12)
        light = np.array([.7, .4, .4] if side else [.3, .5, .8]); light /= np.linalg.norm(light)
        shading = np.clip(.55+.4*np.abs(normals@light), 0, 1)
        depths = triangles[:, :, 0 if side else 2].mean(axis=1)
        for index in np.argsort(depths):
            points = triangles[index]
            xy = [(center+(p[2] if side else p[0])*370, 770-p[1]*370) for p in points]
            shade = shading[index]; color = tuple(int(c*shade) for c in [197, 181, 163])
            draw.polygon(xy, fill=color)
        draw.text((center-95, 50), label, fill='#24374b', font=font)
    draw.text((25, 12), 'Exterior comparison at equal displayed height. No point transfer or registration has been applied.', fill='#24374b', font=font)
    draw.text((25, 810), 'Reference: BodyParts3D / DBCLS, CC BY 4.0. Current: MakeHuman, CC0. Application remains unchanged.', fill='#24374b', font=font)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)
