"""Collect published level-11 facts, retaining the source HTML in the QA cache."""
from html.parser import HTMLParser
from pathlib import Path
import json,re,datetime
from urllib.request import Request,urlopen

class Node:
    def __init__(self,tag='',attrs=None): self.tag,self.attrs,self.children=tag,dict(attrs or []),[]
    def text(self): return ' '.join(value.text() if isinstance(value,Node) else value for value in self.children).strip()
    def all(self,tag):
        result=[]
        for child in self.children:
            if isinstance(child,Node):
                if child.tag==tag: result.append(child)
                result.extend(child.all(tag))
        return result
class Parser(HTMLParser):
    def __init__(self): super().__init__();self.root=Node();self.stack=[self.root]
    def handle_starttag(self,tag,attrs):
        node=Node(tag,attrs);self.stack[-1].children.append(node)
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}: self.stack.append(node)
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag: self.stack=self.stack[:i];return
    def handle_data(self,data): self.stack[-1].children.append(data.strip())

root=Path(__file__).resolve().parents[1];folder=root/'qa/battle-assets/cr-current';cards=[]
folder.mkdir(parents=True,exist_ok=True)
if not list(folder.glob('*.html')):
    def download(url):
        with urlopen(Request(url,headers={'User-Agent':'PokeArenaStatReview/1.0'}),timeout=30) as response: return response.read().decode('utf8')
    index=download('https://crtool.app/en/units/')
    for key in sorted(set(re.findall(r'/en/units/([a-z0-9-]+)/',index))):
        if key not in {'heroes','evolutions'}: (folder/(key+'.html')).write_text(download('https://crtool.app/en/units/'+key+'/'),encoding='utf8')
for file in sorted(folder.glob('*.html')):
    if file.stem in {'heroes','evolutions'}: continue
    parser=Parser();parser.feed(file.read_text(encoding='utf8'));doc=parser.root
    names=doc.all('h1')
    if not names: continue
    text=re.sub(r'\s+',' ',doc.text());name=re.sub(r'\s+',' ',names[0].text())
    traits={}
    for dl in doc.all('dl')[:1]:
        labels=dl.all('dt');values=dl.all('dd')
        for label,value in zip(labels,values): traits.setdefault(re.sub(r'\s+',' ',label.text()),re.sub(r'\s+',' ',value.text()))
    tables=[]
    for table in doc.all('table'):
        rows=[]
        for row in table.all('tr'):
            rows.append([re.sub(r'\s+',' ',cell.text()) for cell in row.children if isinstance(cell,Node) and cell.tag in {'td','th'}])
        for row in rows:
            if row and re.fullmatch(r'Level\s*11',row[0]): tables.append(dict(zip(rows[0][1:],row[1:])))
    cost=re.search(r'(\d+)\s*Elixir',text)
    version=re.search(r'Game data:\s*([\d.]+)\s*\(updated ([^)]+)\)',text)
    cards.append({'key':file.stem,'name':name,'elixir':int(cost.group(1)) if cost else None,'traits':traits,'level11':tables,'source':'https://crtool.app/en/units/'+file.stem+'/','gameVersion':version.group(1) if version else None,'dataUpdated':version.group(2) if version else None})
report={'collected':str(datetime.date.today()),'level':11,'source':'https://crtool.app/en/units/','cards':cards}
target=root/'docs/clash-royale-level11.json';target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'cards':len(cards),'withLevel11':sum(bool(card['level11']) for card in cards),'samples':[c for c in cards if c['key'] in ['tornado','baby-dragon','hog-rider','balloon','knight']]}))
