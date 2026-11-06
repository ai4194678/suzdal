# Анализ структуры CSV с объявлениями Авито (Суздаль)
import csv, re, sys
from collections import Counter

path = sys.argv[1]
with open(path, newline='', encoding='utf-8') as f:
    rows = list(csv.reader(f))

header, data = rows[0], rows[1:]
print("СТОЛБЦОВ:", len(header), "| СТРОК ДАННЫХ:", len(data))

# Индексы столбцов (по факту из header)
idx = {name: i for i, name in enumerate(header)}
C_URL = 'sliderLink-d5107317afba0dec href'
C_IMG = ['image-_5928ad20c08a425b src', 'image-_5928ad20c08a425b src 2',
         'image-_5928ad20c08a425b src 3', 'image-_5928ad20c08a425b src 4',
         'image-_5928ad20c08a425b src 5']
C_MORE = 'item-_5928ad20c08a425b'
C_TITLE = 'root-_3be970cbe47adb45'
C_RATING = 'size_m-_05800d40521e2e33'
C_REVIEWS = 'root-affa583e50031066'
C_PRICE = 'size_l-_05800d40521e2e33'
C_TAGS = ['content-_9d9763f6d1ada1d0', 'content-_9d9763f6d1ada1d0 2', 'content-_9d9763f6d1ada1d0 3']
C_ADDR = 'root-affa583e50031066 2'
C_DESC = 'root-affa583e50031066 3'

def clean_num(s):
    if s is None: return None
    d = re.sub(r'[^\d]', '', s)
    return int(d) if d else None

ids, prices, locals_c = [], [], Counter()
photo_dist, tags_c, title_types = Counter(), Counter(), Counter()
no_rating_with_rev, odd_titles, no_price_rows = 0, [], []
addr_empty, desc_empty = 0, 0

for r in data:
    m = re.search(r'_(\d+)\?', r[idx[C_URL]])
    ids.append(m.group(1) if m else '??')
    p = clean_num(r[idx[C_PRICE]])
    prices.append(p)
    if p is None: no_price_rows.append(r[idx[C_TITLE]])
    addr = r[idx[C_ADDR]].strip()
    if not addr: addr_empty += 1
    loc = addr.split(',')[0].strip() if addr else '(пусто)'
    locals_c[loc] += 1
    nph = sum(1 for c in C_IMG if r[idx[c]].strip())
    photo_dist[nph] += 1
    for t in C_TAGS:
        v = r[idx[t]].strip()
        if v: tags_c[v] += 1
    ttl = r[idx[C_TITLE]]
    m2 = re.match(r'([\D]+?)[,]', ttl)
    title_types[ttl.split(',')[0].strip()] += 1
    rat, rev = r[idx[C_RATING]].strip(), r[idx[C_REVIEWS]].strip()
    if rev and not rat: no_rating_with_rev += 1
    if not r[idx[C_DESC]].strip(): desc_empty += 1

print("\n— ID: уникальных", len(set(ids)), "из", len(ids), "| дубликаты:",
      [i for i, c in Counter(ids).items() if c > 1])
print("— ЦЕНЫ: нет у", len([p for p in prices if p is None]), "| мин:",
      min(p for p in prices if p), "| макс:", max(p for p in prices if p),
      "| средняя:", round(sum(p for p in prices if p)/len(prices)))
if no_price_rows: print("  без цены:", no_price_rows)
print("\n— НАСЕЛЁННЫЕ ПУНКТЫ (префикс адреса):")
for k, v in locals_c.most_common(): print(f"   {k!r}: {v}")
print("\n— ФОТОГРАФИИ (сколько ссылок в строке): ", dict(sorted(photo_dist.items())))
print("— ТЕГИ (content-*):")
for k, v in tags_c.most_common(): print(f"   {k!r}: {v}")
print("\n— ТИПЫ ЖИЛЬЯ (первая часть названия):")
for k, v in title_types.most_common(): print(f"   {k!r}: {v}")
print("\n— Рейтинг есть, но нет отзывов / отзывы без рейтинга:", no_rating_with_rev)
print("— Пустых адресов:", addr_empty, "| пустых описаний:", desc_empty)

# Примеры рейтингов/отзывов и цен с десятичными
print("\n— ПРИМЕРЫ (title | rating | reviews | price | addr | more):")
for r in data[:5] + data[40:43] + data[-3:]:
    print(f"   {r[idx[C_TITLE]]!r} | {r[idx[C_RATING]]!r} | {r[idx[C_REVIEWS]]!r} | {r[idx[C_PRICE]]!r} | {r[idx[C_ADDR]]!r} | {r[idx[C_MORE]]!r}")

# Цены с копейками/нестандартные форматы
odd_prices = [r[idx[C_PRICE]] for r in data if not re.fullmatch(r'[\d\s\u00a0\u202f₽]*', r[idx[C_PRICE]])]
print("\n— Нестандартные строки цен:", odd_prices[:10])
# Площади с запятой
areas_comma = [r[idx[C_TITLE]] for r in data if re.search(r'\d,\d', r[idx[C_TITLE]])]
print("— Названия с дробной площадью:", areas_comma)
# Отзывы: формат
rev_formats = Counter(re.sub(r'\d+', 'N', r[idx[C_REVIEWS]].strip()) for r in data if r[idx[C_REVIEWS]].strip())
print("— Форматы отзывов:", dict(rev_formats))
rat_vals = Counter(r[idx[C_RATING]].strip() for r in data if r[idx[C_RATING]].strip())
print("— Значения рейтинга:", dict(rat_vals))
