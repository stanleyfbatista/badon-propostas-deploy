"""Generate labelled-by-HTML placeholder assets, never client artwork or reviews.
Only needs Pillow on a development machine; the deployed site needs no build.
The existing Stanley portrait is copied unchanged, not generated here.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import math

ROOT = Path(__file__).resolve().parents[1] / "assets" / "img"

def backdrop(name, size=(800, 600), tone=(14, 32, 58), accent=(51, 104, 178), variant=0):
    width, height = size
    image = Image.new("RGB", size)
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            distance = math.hypot((x-width*.8)/width, (y-height*.05)/height)
            blend = max(0, 1-distance)*.65
            pixels[x,y] = tuple(int(tone[c]*(1-blend)+accent[c]*blend) for c in range(3))
    draw = ImageDraw.Draw(image)
    line = tuple(min(255,c+12) for c in tone)
    if variant % 3 == 0:
        for x in range(0, width, 50):
            draw.line((x,0,x,height), fill=line, width=1)
        for y in range(0,height,50):
            draw.line((0,y,width,y), fill=line, width=1)
        for radius in range(110, 360, 12):
            draw.ellipse((width*.76-radius,height*.92-radius,width*.76+radius,height*.92+radius),outline=line,width=1)
    elif variant % 3 == 1:
        for offset in range(0,500,15):
            draw.arc((-width*.3+offset,-height*.5+offset,width*1.2+offset,height*1.5+offset),150,340,fill=line,width=1)
    else:
        for i in range(9):
            pad=26+i*20
            draw.rounded_rectangle((pad,pad,width-pad,height-pad),radius=15,outline=line,width=1)
    image.save(ROOT / name, "WEBP", quality=85, method=6)

backdrop("time-socio.webp", (800,900), (11,31,56), (44,89,148), 1)
for index, name in enumerate(["clp-facil","advocacia-moderna","davi-guedes","04","05","06"]):
    tones=[(10,32,61),(31,31,37),(21,39,44),(15,27,48),(24,32,51),(17,31,43)]
    accents=[(35,86,153),(89,96,113),(68,100,113),(43,85,142),(63,95,151),(65,104,145)]
    backdrop("case-"+name+".webp", tone=tones[index], accent=accents[index], variant=index)
for index, name in enumerate(["trafego","sites","google","design"]):
    backdrop("blog-"+name+".webp", variant=index, tone=(8,28,55), accent=(30+index*8,90,175))
for i in range(1,13):
    image=Image.new("RGB",(300,150),(244,247,251))
    draw=ImageDraw.Draw(image)
    blue=(55,105,175)
    cx,cy=150,56
    shape=i%4
    if shape==0:
        draw.polygon([(cx,cy-30),(cx+30,cy),(cx,cy+30),(cx-30,cy)],outline=blue,width=3)
        draw.line((cx-20,cy,cx+20,cy),fill=blue,width=3)
    elif shape==1:
        draw.ellipse((cx-28,cy-28,cx+28,cy+28),outline=blue,width=3)
        draw.ellipse((cx-13,cy-13,cx+13,cy+13),outline=blue,width=3)
    elif shape==2:
        draw.rectangle((cx-28,cy-23,cx+28,cy+23),outline=blue,width=3)
        draw.line((cx-15,cy-32,cx-15,cy+32),fill=blue,width=3)
    else:
        draw.polygon([(cx,cy-32),(cx+32,cy+23),(cx-32,cy+23)],outline=blue,width=3)
    image.save(ROOT / ("cliente-%02d.webp" % i),"WEBP",quality=85)
backdrop("og-badon.webp",(1200,630),variant=1)
print("24 placeholders WebP gerados. Foto existente preservada.")
