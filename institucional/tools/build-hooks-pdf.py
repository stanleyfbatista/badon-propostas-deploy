"""Build the downloadable guide from the same editorial sources as the page.
Requires reportlab. Does not execute any script from the supplied material.
"""
from pathlib import Path
from html import escape
import json, re, shutil
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, KeepTogether, Table, TableStyle, Flowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'institucional/guias/50-ganchos'
OUT = ROOT / 'output/pdf/guia-50-ganchos-badon.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
FONTS = Path('/System/Library/Fonts/Supplemental')
pdfmetrics.registerFont(TTFont('Guide', str(FONTS / 'Arial.ttf')))
pdfmetrics.registerFont(TTFont('GuideBold', str(FONTS / 'Arial Bold.ttf')))
pdfmetrics.registerFontFamily('Guide', normal='Guide', bold='GuideBold', italic='Guide', boldItalic='GuideBold')
blue, ink, muted = HexColor('#0053C3'), HexColor('#10223b'), HexColor('#455773')
class ContactButton(Flowable):
    def __init__(self, label, url, filled=True):
        super().__init__()
        self.width, self.height = 400, 43
        self.label, self.url, self.filled = label, url, filled
    def draw(self):
        c = self.canv
        c.setFillColor(blue if self.filled else HexColor('#edf4ff'))
        c.setStrokeColor(blue)
        c.roundRect(0, 0, self.width, self.height, 10, fill=1, stroke=0)
        c.setFillColor(white if self.filled else blue)
        c.setFont('GuideBold', 11)
        c.drawCentredString(self.width / 2, 16, self.label)
        c.linkURL(self.url, (0, 0, self.width, self.height), relative=1, thickness=0)
styles = {
    'body': ParagraphStyle('body', fontName='Guide', fontSize=10, leading=15, textColor=ink, spaceAfter=9),
    'h1': ParagraphStyle('h1', fontName='GuideBold', fontSize=32, leading=36, textColor=ink, spaceAfter=20),
    'h2': ParagraphStyle('h2', fontName='GuideBold', fontSize=17, leading=22, textColor=blue, spaceBefore=14, spaceAfter=12, keepWithNext=True),
    'h3': ParagraphStyle('h3', fontName='GuideBold', fontSize=14, leading=18, textColor=ink, spaceAfter=10, keepWithNext=True),
    'small': ParagraphStyle('small', fontName='Guide', fontSize=9, leading=13, textColor=muted, spaceAfter=8),
    'prompt': ParagraphStyle('prompt', fontName='Guide', fontSize=9.5, leading=14, textColor=ink, spaceAfter=9),
}
def para(text, style='body'):
    return Paragraph(escape(text.replace('→', '>').replace('□', '[ ]').replace('—', '-')).replace('\n','<br/>'), styles[style])
def heading(text):
    return text if text != text.upper() else text.capitalize().replace(' ia',' IA').replace('reels','Reels')
def editorial(text):
    result = []
    for block in re.split(r'\n\s*\n', text.strip()):
        if re.match(r'^(Botão|Botões|Mensagem após|Mensagem se|Texto de apoio|Mensagem sugerida)',block):
            continue
        if block.startswith('“Oi, Stanley!'):
            continue
        is_heading = block == block.upper() and len(block) > 8 and '\n' not in block
        result.append(para(heading(block), 'h2') if is_heading else para(block))
    return result
def page_decoration(c, doc):
    w,h = doc.pagesize
    c.setFillColor(blue); c.rect(0,h-9,w,9,fill=1,stroke=0)
    c.setFont('GuideBold',9); c.setFillColor(ink)
    c.drawString(46,h-35,'Produtora Bādon  /  50 ganchos')
    c.setStrokeColor(HexColor('#dbe4f0')); c.line(46,44,w-46,44)
    c.setFillColor(muted); c.setFont('Guide',8)
    c.drawString(46,29,'Stanley Batista • produtorabadon.com/presentes/50-ganchos/')
    c.linkURL('https://produtorabadon.com/', (46,25,380,39), relative=0, thickness=0)
    c.drawRightString(w-46,29,str(doc.page))

hooks=json.loads((SOURCE/'content/50-ganchos.json').read_text())
intro=(SOURCE/'content/abertura.txt').read_text()
closing=(SOURCE/'content/fechamento.txt').read_text()
story=[Spacer(1,30),para('Parabéns, aqui está o seu presente.','h2'),para('50 ganchos para seus próximos conteúdos.','h1')]
story += [para('Um guia para escolher uma abertura, adaptar à sua marca e transformar a ideia em Reel ou carrossel.')]
portrait=Image(str(SOURCE/'stanley-batista.webp'),width=105,height=105)
bio=para('Eu sou Stanley Batista, gestor de marketing à frente da Produtora Bādon. Há mais de 6 anos, crio e cuido de marcas. Preparei este material para ajudar você a dar o próximo passo no seu conteúdo.')
table=Table([[portrait,bio]],colWidths=[125,370]);table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),15)]))
story += [Spacer(1,18),table,Spacer(1,25),para('Como consultar este guia','h2'),para('Comece pelas orientações. Depois, escolha entre as cinco categorias, personalize os campos entre colchetes e use os prompts completos na IA de sua preferência. Todos os 50 ganchos têm exemplo, desenvolvimento e cuidado.'),para('As estruturas são pontos de partida para adaptar e testar. Não há promessa de visualizações, seguidores ou vendas.'),para('Versão de 31 de outubro de 2026. Texto selecionável, com prompts completos e links clicáveis.','small'),PageBreak()]
story += editorial(intro)
story += [PageBreak()]
for idx in range(0,len(hooks),2):
    pair=hooks[idx:idx+2]
    story.append(para(pair[0]['categoria'],'h2'))
    for n,h in enumerate(pair):
        story.append(para(f"{h['numero']:02d}  {h['gancho']}",'h3'))
        for key,label in [('quando_usar_e_por_que','Quando usar e por quê'),('exemplo','Exemplo'),('como_desenvolver','Como desenvolver'),('cuidado','Cuidado')]:
            story.append(Paragraph('<b>'+label+':</b> '+escape(h[key]),styles['body']))
        if n==0: story.append(Spacer(1,14))
    story.append(PageBreak())
before,after=closing.split('CHECKLIST ANTES DE PUBLICAR',1)
story += editorial(before)
for filename in ['prompt-adaptacao.txt','prompt-reels.txt','prompt-carrossel.txt']:
    story.append(PageBreak())
    blocks=(SOURCE/'content'/filename).read_text().strip().split('\n\n')
    story.append(para(heading(blocks[0]),'h2'))
    story.append(para('Copie o texto abaixo e preencha os campos entre colchetes antes de enviar à IA.','small'))
    story.extend(para(block,'prompt') for block in blocks[1:])
story += [PageBreak()]
story += editorial('CHECKLIST ANTES DE PUBLICAR'+after.split('QUER AJUDA PARA TRANSFORMAR')[0])
story += [KeepTogether([
    Spacer(1,18),
    para('Vamos cuidar do próximo passo da sua marca?','h2'),
    para('Se você quer apoio com consultoria, criação de sites, gestão de marketing ou criação de conteúdo, vamos conversar sobre o momento do seu negócio.'),
    Spacer(1,8),
    ContactButton('Conversar com Stanley no WhatsApp', 'https://wa.me/5519983256292?text=Oi%2C%20Stanley%21%20Vim%20pelo%20guia%20dos%2050%20ganchos%20e%20quero%20conversar%20sobre%20minha%20marca.'),
    Spacer(1,10),
    ContactButton('Conhecer o site da Produtora Bādon', 'https://produtorabadon.com/', filled=False),
    Spacer(1,10),
    para('Toque nos botões para abrir os links. Se estiver com o guia impresso: WhatsApp (19) 98325-6292 · produtorabadon.com','small'),
])]
doc=SimpleDocTemplate(str(OUT),pagesize=(595.28,841.89),rightMargin=46,leftMargin=46,topMargin=58,bottomMargin=60,title='50 ganchos para seus próximos conteúdos',author='Stanley Batista | Produtora Bādon',subject='Ganchos, exemplos e prompts para Reels e carrosséis')
doc.build(story,onFirstPage=page_decoration,onLaterPages=page_decoration)
shutil.copy2(OUT,SOURCE/'guia-50-ganchos-badon.pdf')
print(OUT)
