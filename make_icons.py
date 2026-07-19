from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path('/root/empire-eternal/icons')
OUT.mkdir(parents=True, exist_ok=True)

for size in (192, 512):
    img = Image.new('RGBA', (size, size), '#090716')
    d = ImageDraw.Draw(img)
    # Halo astral
    for radius, alpha in ((int(size*.43), 20), (int(size*.35), 35), (int(size*.28), 55)):
        box = (size//2-radius, size//2-radius, size//2+radius, size//2+radius)
        d.ellipse(box, fill=(128, 79, 211, alpha))
    gold = '#f2c45e'; stone = '#716a85'; red = '#c94250'; dark = '#201a32'
    # Château héraldique
    x = size//2; base = int(size*.72); tower_w = int(size*.15); tower_h = int(size*.31)
    d.rectangle((int(size*.29), int(size*.46), int(size*.71), base), fill=stone)
    for tx in (int(size*.22), int(size*.63)):
        d.rectangle((tx, int(size*.39), tx+tower_w, base), fill='#615b74')
        d.polygon([(tx-int(size*.025), int(size*.39)), (tx+tower_w//2, int(size*.25)), (tx+tower_w+int(size*.025), int(size*.39))], fill=red)
    d.rectangle((int(size*.42), int(size*.32), int(size*.58), int(size*.50)), fill='#827a94')
    d.polygon([(int(size*.39), int(size*.32)), (x, int(size*.19)), (int(size*.61), int(size*.32))], fill=gold)
    # Porte et fenêtres
    d.rounded_rectangle((int(size*.44), int(size*.58), int(size*.56), base), radius=int(size*.045), fill=dark)
    for wx in (int(size*.34), int(size*.48), int(size*.62)):
        d.rectangle((wx, int(size*.49), wx+int(size*.035), int(size*.56)), fill='#ffe497')
    # Fracture / étoile
    d.line([(int(size*.78),int(size*.18)),(int(size*.70),int(size*.31)),(int(size*.76),int(size*.38)),(int(size*.67),int(size*.51))], fill='#b785ff', width=max(3,size//64))
    img.save(OUT / f'icon-{size}.png', optimize=True)
