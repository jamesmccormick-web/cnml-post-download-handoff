"""v60: one-pass, offline extraction of a Downloaded-with-State HTML artifact."""
import hashlib
import json
import re
import sys
from decimal import Decimal
from pathlib import Path
from bs4 import BeautifulSoup


def text(el):
    return el.get_text().strip() if el else ''


def money(value):
    value = value.strip()
    if not value or value.lower() == 'enter amount' or value == '—':
        return None
    value = value.replace('⚠', '').replace('\ufe0f', '').strip()
    value = value.replace('$', '').replace(',', '').replace('−', '-').strip()
    if value.startswith('(') and value.endswith(')'):
        value = '-' + value[1:-1]
    if not re.fullmatch(r'[+-]?\d+(?:\.\d{1,2})?', value):
        raise ValueError('Invalid money value: ' + repr(value))
    return int(Decimal(value) * 100)


def extract(path):
    path = Path(path)
    if not path.name.endswith('_state.html'):
        raise ValueError('Use the Download with State _state.html file; extraction not attempted.')
    raw = path.read_bytes()
    soup = BeautifulSoup(raw, 'html.parser')
    h1 = soup.find('h1')
    assert h1 and text(h1), 'Missing property address'
    meta = h1.find_next_sibling()
    metadata = text(meta)
    token_match = re.search(r'Flip\s*Token\s*:\s*([^·|\s]+)', metadata, re.I)
    if token_match:
        token = token_match.group(1).strip()
    else:
        parts = metadata.split('·')
        assert len(parts) >= 2, 'Missing header flip token'
        token = parts[1].strip()
    assert re.fullmatch(r'[A-Za-z0-9_-]+', token), 'Ambiguous header flip token'
    cp_match = re.search(r'CP\s*Version\s*:\s*([^·|]+)', metadata, re.I)
    cp = cp_match.group(1).strip() if cp_match else None
    table = soup.find('table', id='upside')
    assert table, 'Missing Table 1'
    rows = [r for r in table.select('tbody tr') if r.get('data-row-id') is not None]
    assert len(rows) == 15, 'Exactly 15 Table 1 data rows required'
    cols = ['D', 'E', 'F', 'H', 'V', 'G', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q']
    sf_cols = ['X', 'Y', 'Z', 'AA', None, 'AM', 'AE', 'AB', 'AC', 'AD', 'AF', 'AG', 'AI', 'AH', 'AJ']
    sf_positive = {0, 1, 2, 3}
    sf_negative = {5, 7, 10, 11, 12, 13, 14}
    doc, sf, details, notes = {}, {}, [], []
    for i, row in enumerate(rows):
        side = 'credit' if i in {0, 2, 3} else 'debit'
        cell = row.select_one('td[data-col="' + side + '"]')
        assert cell is not None, 'Missing ' + side + ' cell on row ' + str(i)
        value = money(text(cell))
        value = None if value is None else abs(value) * (1 if side == 'credit' else -1)
        ap = money(text(row.select_one('td.ap')))
        if ap is not None and i in sf_positive:
            ap = abs(ap)
        if ap is not None and i in sf_negative:
            ap = -abs(ap)
        doc[cols[i]] = value
        if sf_cols[i]:
            sf[sf_cols[i]] = ap
        cells = row.find_all('td', recursive=False)
        assert len(cells) >= 2, 'Missing subject cell'
        subject = re.sub(r'\[[^\]]*\]', '', text(cells[1])).strip()
        note = text(row.select_one('.adj-text'))
        if note:
            notes.append('• ' + subject + ' — ' + note)
        details.append(dict(index=i, id=row.get('data-row-id'), subject=subject,
                            side=side, column=cols[i], cents=value, sfCents=ap, note=note))
    net_el = table.select_one('tfoot #up-net')
    assert net_el is not None, 'Missing net footer'
    net = money(text(net_el))
    assert net is not None, 'Blank proceeds net'
    classes = net_el.get('class', [])
    negative = 'net-neg' in classes or text(net_el).startswith(('−', '-'))
    if negative:
        net = -abs(net)
    branch = 'negative' if net <= 0 else 'positive' if net > 0 and 'net-pos' in classes else 'blocked'
    doc['R'] = net
    ap_el = table.select_one('tfoot td.ap')
    ap_footer = money(text(ap_el))
    if ap_footer is not None and ap_el and 'net-neg' in ap_el.get('class', []):
        ap_footer = -abs(ap_footer)
    sf.update(AK=0, AL=ap_footer)
    delta = text(table.select_one('tfoot #delta-net'))
    footer = ''
    if delta and delta != '—':
        assert ap_footer is not None, 'Delta present but SF footer is blank'
        footer = f'Footer: Upside Proceeds net (doc) ${net / 100:,.2f} vs SF Auto Pull net (SF Upside OD) ${ap_footer / 100:,.2f} — delta {delta}.'
    before = set(id(el) for el in table.find_all_previous())
    flags = '\n'.join(text(el) for el in soup.select('div.flagbox') if id(el) in before and text(el))
    candidates = [t for t in soup.find_all('table') if any(text(th) == 'Field' for th in t.find_all('th'))]
    assert len(candidates) == 1, 'Exactly one Field-header table required'
    fields = {}
    for row in candidates[0].find_all('tr'):
        cells = row.find_all('td', recursive=False)
        labels = [c for c in cells if c.get('class') is None]
        value = row.find('td', class_='editable')
        if not labels or value is None:
            continue
        assert len(labels) == 1, 'Ambiguous Table 2 label'
        label = text(labels[0])
        assert label not in fields, 'Duplicate Table 2 label'
        fields[label] = re.sub(r'^\s*\[HS suggest\]\s*', '', text(value), flags=re.I).strip()
    def field(name):
        matches = [v for k, v in fields.items() if name in k]
        assert len(matches) == 1, 'Missing or ambiguous Table 2 field: ' + name
        return matches[0]
    estimated = money(field('Estimated Upside Proceeds'))
    seller = field('Seller Full Name')
    email = field('Seller Email')
    manual = [text(h1), token, cp] + [doc[chr(c)] / 100 if doc[chr(c)] is not None else None for c in range(ord('D'), ord('R') + 1)]
    return dict(version=60, path=str(path.resolve()), sha256=hashlib.sha256(raw).hexdigest(),
                address=text(h1), token=token, cpVersion=cp, rows=details, docCents=doc,
                sfReferenceCents=sf, netCents=net, branch=branch, seller=seller, email=email,
                estimatedCents=estimated, manual=manual,
                subsidy=None if doc['V'] is None else doc['V'] / 100,
                notes=[token, text(h1), '\n'.join(notes), '\n'.join(x for x in [flags, footer] if x)],
                warnings=(['Unsupported positive sign state: review required.'] if branch == 'blocked' else [])
                         + (['Estimated Upside Proceeds is blank.'] if estimated is None else []))


if __name__ == '__main__':
    print(json.dumps(extract(sys.argv[1]), ensure_ascii=False))
