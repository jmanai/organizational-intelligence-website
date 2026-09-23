"""Verify generated reports preserve engine content and stay inside page margins."""
import json, re
from pathlib import Path
from pypdf import PdfReader
import pdfplumber

def normalized(value):
    return re.sub(r'\s+', '', re.sub(r'[\u2010-\u2015]', '-', str(value)))

for path in Path('tmp/pdfs/tests').glob('*.json'):
    source = json.loads(path.read_text())
    reader = PdfReader(path.with_suffix('.pdf'))
    result = normalized(' '.join(re.sub(r'(?m)^\d{2} / \d{2}\s*$', '', p.extract_text()) for p in reader.pages))
    expected = [source['team'], source['company'], source['role'], source['oneThing'], source['report']['overallText']]
    for dimension in source['report']['dimensions'].values():
        expected += [dimension['question'], dimension['band']['label'], dimension['band']['text'], *dimension['questions']]
    for kind in ['primaryPattern', 'secondaryPattern']:
        pattern = source['report'][kind]
        if pattern:
            expected += [pattern['title'].upper(), pattern['message']]
    rec = source['report']['recommendation']
    expected += [rec['title'].upper(), rec['text'], rec['framing'] or '']
    for fragment in expected:
        assert normalized(fragment) in result, (path.name, 'Missing text', fragment)
    urls = [str(a.get_object().get('/A', {}).get('/URI', '')) for p in reader.pages for a in p.get('/Annots', [])]
    assert 'https://orgintelligence.io/book' in urls
    assert 'mailto:hello@orgintelligence.io' in urls
    assert len(urls) >= 6
    with pdfplumber.open(path.with_suffix('.pdf')) as doc:
        for index, page in enumerate(doc.pages):
            for char in page.chars:
                assert 40 <= char['x0'] <= char['x1'] <= 555, (path.name, index + 1, 'Horizontal overflow', char)
                assert 35 <= char['top'] <= char['bottom'] <= 822, (path.name, index + 1, 'Vertical overflow', char)
    print(f'{path.stem}: all report content, links and text bounds verified ({len(reader.pages)} pages)')
