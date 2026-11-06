# Конвертация CSV Авито (Суздаль) → data.js для приложения «ВПИСАТЬСЯ В СУЗДАЛЬ»
# Правила: цены не меняем (только в число), фото только свои, без персональных данных продавца.
import csv, json, re, sys

src, dst = sys.argv[1], sys.argv[2]
with open(src, newline='', encoding='utf-8') as f:
    rows = list(csv.reader(f))
header, data = rows[0], rows[1:]
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

LOCALITIES = {
    'Суздаль': ('suzdal', 'Суздаль'),
    'Пос. Новый': ('novy', 'Посёлок Новый'),
    'С. Сельцо': ('seltso', 'Село Сельцо'),
    'С. Ивановское': ('ivanovskoe', 'Село Ивановское'),
}

def nbsp(s):
    return re.sub(r'[\u00a0\u202f\s]+', ' ', s).strip()

listings, seen = [], set()
for r in data:
    url = r[idx[C_URL]].strip()
    mid = re.search(r'_(\d+)%3F|_(\d+)\?', url) or re.search(r'_(\d+)$', url)
    m = re.search(r'_(\d+)(?:\?|$)', url)
    lid = m.group(1)
    assert lid and lid not in seen, f'Дубликат/нет ID: {url[:80]}'
    seen.add(lid)

    title = nbsp(r[idx[C_TITLE]])
    parts = [p.strip() for p in title.split(',')]
    type_short = parts[0]                      # «1-к. квартира» / «Квартира-студия»
    area, beds, floor = None, None, None
    for p in parts[1:]:
        ma = re.fullmatch(r'([\d]+(?:,\d+)?)\s*м²', p)
        mb = re.fullmatch(r'(\d+)\s*кровать|кровати|кроватей', p)
        mb = re.fullmatch(r'(\d+)\s*крова(?:ть|ти|тей)', p)
        mf = re.fullmatch(r'(\d+/\d+)\s*эт\.?', p)
        if ma: area = float(ma.group(1).replace(',', '.'))
        elif mb: beds = int(mb.group(1))
        elif mf: floor = mf.group(1)

    price = int(re.sub(r'\D', '', r[idx[C_PRICE]]))   # цена как в объявлении, ₽ за ночь

    # Рейтинг объекта — только если распарсился (например «5» или «4,9»)
    rat_s = r[idx[C_RATING]].strip().replace(',', '.')
    rating = float(rat_s) if re.fullmatch(r'\d(?:[.,]\d)?', rat_s) else None
    # Отзывы — только формат «N отзыв(а/ов)» и только вместе с рейтингом объекта
    rev_s = r[idx[C_REVIEWS]].strip()
    mrev = re.fullmatch(r'(\d+)\s+отзыв(?:а|ов)?', rev_s)
    reviews = int(mrev.group(1)) if (mrev and rating is not None) else None
    if rating is None: reviews = None

    addr = nbsp(r[idx[C_ADDR]])
    prefix = addr.split(',')[0].strip()
    key, name = LOCALITIES[prefix]
    tags = [nbsp(r[idx[t]]) for t in C_TAGS if nbsp(r[idx[t]])]

    photos = [r[idx[c]].strip() for c in C_IMG if r[idx[c]].strip()]
    mmore = re.match(r'Ещё(\d+)\s*фото', r[idx[C_MORE]].strip())
    photos_more = int(mmore.group(1)) if mmore else 0

    desc = r[idx[C_DESC]].replace('\r\n', '\n').replace('\r', '\n').strip()

    listings.append({
        'id': lid,
        'url': url,
        'title': title,
        'typeShort': type_short,
        'rooms': int(re.match(r'(\d+)-к\.', type_short).group(1)) if re.match(r'(\d+)-к\.', type_short) else 0,
        'isStudio': 'студия' in type_short.lower(),
        'area': area,
        'beds': beds,
        'floor': floor,
        'price': price,
        'locality': key,
        'localityName': name,
        'address': addr,
        'rating': rating,
        'reviews': reviews,
        'tags': tags,
        'photos': photos,
        'photosMore': photos_more,
        'description': desc,
    })

listings.sort(key=lambda x: (x['price'], x['id']))
meta = {
    'sourceNote': 'Цены представлены по данным выгрузки объявлений на 21–22 ноября 2026 года для двух гостей. Итоговую стоимость и свободные даты уточняйте в исходном объявлении.',
    'total': len(listings),
    'withPhotos': sum(1 for l in listings if l['photos']),
    'localities': {k2: sum(1 for l in listings if l['locality'] == k) for k2, (k, _n) in
                   [('suzdal', ('suzdal', '')), ('novy', ('novy', '')), ('seltso', ('seltso', '')), ('ivanovskoe', ('ivanovskoe', ''))]},
}

payload = json.dumps({'meta': meta, 'listings': listings}, ensure_ascii=False, separators=(',', ':'))
payload = payload.replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
js = ('// ВПИСАТЬСЯ В СУЗДАЛЬ — данные объявлений\n'
      '// Источник: выгрузка Авито, 111 объявлений, даты поиска 21–22.11.2026, 2 гостя.\n'
      '// Цены за ночь в рублях, без изменений. Персональные данные продавцов исключены.\n'
      'window.SUZDAL_DATA = ' + payload + ';\n')
with open(dst, 'w', encoding='utf-8') as f:
    f.write(js)

# Контроль
print('Записано объявлений:', len(listings))
print('С фото:', meta['withPhotos'], '| без фото:', len(listings) - meta['withPhotos'])
from collections import Counter
print('По населённым пунктам:', dict(Counter(l['localityName'] for l in listings)))
print('С рейтингом:', sum(1 for l in listings if l['rating'] is not None),
      '| с отзывами:', sum(1 for l in listings if l['reviews'] is not None))
print('Цены: мин', min(l['price'] for l in listings), 'макс', max(l['price'] for l in listings))
no_area = [l['title'] for l in listings if l['area'] is None]
no_beds = [l['title'] for l in listings if l['beds'] is None]
print('Без площади:', no_area, '| без кроватей:', no_beds)
print('Файл:', dst)
