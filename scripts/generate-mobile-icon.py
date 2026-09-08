"""Render the project's simple line emblem as an opaque App Store icon (Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw
size=2048
image=Image.new('RGB',(size,size),'#101c24')
d=ImageDraw.Draw(image)
s=4
d.ellipse((92*s,92*s,420*s,420*s), fill='#193139',outline='#71bdb6',width=10*s)
p=[(136,256),(201,256),(230,157),(279,355),(312,256),(376,256)]
d.line([(x*s,y*s) for x,y in p], fill='#99e6dc',width=17*s,joint='curve')
for x,y in p: d.ellipse(((x-8.5)*s,(y-8.5)*s,(x+8.5)*s,(y+8.5)*s),fill='#99e6dc')
output=Path(__file__).resolve().parents[1]/'mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
output.parent.mkdir(parents=True,exist_ok=True)
image.resize((1024,1024),Image.Resampling.LANCZOS).save(output)
print(output)
