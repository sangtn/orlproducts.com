import re, json, datetime as dt
B='/'.join(__file__.split('/')[:-2])+'/'
def rows(path, start, stop=None):
    t=open(path).read(); s=t.find(start); e=t.find(stop, s+1) if stop else len(t)
    out=[]
    for l in t[s:e].splitlines():
        if l.startswith('| ') and not l.startswith('| #') and not l.startswith('|---') and not l.startswith('| File'):
            c=[x.strip().replace('\\|','|') for x in re.split(r'(?<!\\)\|', l)[1:-1]]
            out.append(c)
    return out
L19=B+'Kho_Video_2026-11-19/Lich_dang_2026-11-19.md'; L17=B+'Kho_Video_2026-11-17/Lich_dang_2026-11-17.md'
films=[dict(file='Kho_Video_2026-11-19/'+c[2],yt=c[4],cap=c[5],music=c[6]) for c in rows(L19,'## Phim','## Ảnh story')]
stories=[dict(file='Kho_Video_2026-11-19/'+c[2],text=c[3],link=c[4]) for c in rows(L19,'## Ảnh story')]
A=[dict(file='Kho_Video_2026-11-17/'+c[2],cap=c[3],music=c[4]) for c in rows(L17,'## Bộ A','## Bộ B')]
Bset=[dict(file='Kho_Video_2026-11-17/'+c[2],cap=c[3],music=c[4]) for c in rows(L17,'## Bộ B','## Bản cho')]
ytA={c[0]:c[1] for c in rows(L17,'## Bản cho','## Carousel')}
LINK={'Auroline':'https://apps.apple.com/us/app/id6810007650','Bumpline':'https://apps.apple.com/us/app/id6816296527','VideoUpscale':'https://apps.apple.com/us/app/id6814751776','SpeedGunner':'https://apps.apple.com/us/app/id6812750104','Somavue':'https://apps.apple.com/us/app/id6815892596','VizMath':'https://apps.apple.com/us/app/id6822687291','Randonauting':'https://apps.apple.com/us/app/id1616481958','OrigamiLearn':'https://apps.apple.com/us/app/id6817002288'}
NAME={'Auroline':'Auroline','Bumpline':'Bumpline','VideoUpscale':'Video Upscale','Somavue':'Somavue','VizMath':'VizMath','Randonauting':'Randonauting','OrigamiLearn':'Origami Learn','SpeedGunner':'SpeedGunner'}
def app(f): return f.split('/')[1]
noSG=lambda L:[x for x in L if app(x['file'])!='SpeedGunner']
films,A,Bset,stories=noSG(films),noSG(A),noSG(Bset),noSG(stories)
for x in A+Bset: x['app']=app(x['file'])
for x in films+stories: x['app']=app(x['file'])
def slots(chan, d):
    w=d.weekday()
    T={'yt':{0:[12,20],1:[12,20],2:[12,20],3:[12,20],4:[16,19],5:[11,19],6:[17,20]},
       'fb':{0:[12,20],1:[12,20],2:[12,20],3:[12,20],4:[12,18],5:[12],6:[12]},
       'ig':{0:[11],1:[11],2:[11],3:[11],4:[11],5:[10],6:[13]},
       'igs':{i:[8,20] for i in range(7)},
       'ttn':{i:([13,20] if d>=dt.date(2026,11,25) else [20]) for i in range(7)},
       'tto':{i:[11] for i in range(7)},
       'th':{i:[8,10,13] for i in range(7)},
       'pin':{i:[10,21] for i in range(7)}}
    return T[chan][w]
START={'yt':23,'fb':23,'ig':24,'igs':22,'ttn':22,'tto':24,'th':25,'pin':22}
CH={'yt':'YouTube Shorts','fb':'Facebook Reel','ig':'Instagram Reel','igs':'Instagram+FB Story','ttn':'TikTok @orient_pro26','tto':'TikTok @orientpro26','th':'Threads','pin':'Pinterest'}
it={'films':iter(films*2),'A':iter(A*2),'B':iter(Bset*2),'st':iter(stories*3)}
posts=[]
for ch in CH:
    for day in range(START[ch],31):
        d=dt.date(2026,11,day)
        for k,h in enumerate(slots(ch,d)):
            et=dt.datetime(2026,11,day,h); vn=et+dt.timedelta(hours=12)
            p=dict(ch=ch,channel=CH[ch],et=et.strftime('%a %d/%m %I%p ET'),vn=vn.strftime('%d/%m %H:%M'),vn_iso=vn.isoformat())
            if ch=='yt':
                src=next(it['films']) if k==0 else next(it['A'])
                ttl=src.get('yt') or ytA.get(src['file'].split('/')[-1],'')
                p.update(file=src['file'],title=ttl,desc=src['cap']+f"\n\nDownload {NAME[src['app']]} on the App Store: {LINK[src['app']]}\nMore ORIENTPRO apps: https://orlproducts.com")
            elif ch in('fb','ig'):
                src=next(it['films']) if (k==0) else next(it['A'])
                cap=src['cap']
                if 'App Store' not in cap: cap=re.sub(r'(\s#)',f' Search "{NAME[src["app"]]}" on the App Store.\\1',cap,1)
                p.update(file=src['file'],caption=cap)
            elif ch=='igs':
                src=next(it['st']); p.update(file=src['file'],caption=src['text'],link=src['link'])
            elif ch=='ttn':
                src=next(it['A']); p.update(file=src['file'],caption=src['cap'],music=src['music'])
            elif ch=='tto':
                src=next(it['B']); p.update(file=src['file'],caption=src['cap'],music=src['music'])
            elif ch=='pin':
                src=next(it['st']); p.update(file=src['file'],title=f"{src['text']} | {NAME[src['app']]}",link=src['link'])
            elif ch=='th':
                p.update(file='',caption='(xem Threads_GD1.md)')
                src={'app':['VideoUpscale','OrigamiLearn','Auroline','Bumpline','Somavue','VizMath','Randonauting'][(day*3+k)%7]}
            p['app']=src['app']; p['link']=p.get('link') or LINK[src['app']]
            posts.append(p)
json.dump(posts,open(B+'Lich_GD1/lich_tong_GD1.json','w'),ensure_ascii=False,indent=1)
with open(B+'Lich_GD1/Lich_tong_GD1.md','w') as f:
    f.write('# Lịch tổng giai đoạn 1 (22–30/11/2026 ET) — theo bảng "Giờ vàng", bỏ SpeedGunner (tạm ngừng đẩy traffic)\n\nMỗi bài sau khi lên: bình luận link App Store của đúng app (YouTube ghim bình luận).\n\n')
    for ch in CH:
        L=[p for p in posts if p['ch']==ch]
        f.write(f'## {CH[ch]} ({len(L)} bài)\n\n| ET | VN | App | File | Tiêu đề/Caption |\n|---|---|---|---|---|\n')
        for p in L: f.write(f"| {p['et']} | {p['vn']} | {p['app']} | {p['file']} | {(p.get('title') or p.get('caption','')).replace('|','/')[:140]} |\n")
        f.write('\n')
from collections import Counter
print(Counter(p['channel'] for p in posts), len(posts))
