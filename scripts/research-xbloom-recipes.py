#!/usr/bin/env python3
"""Read only publicly shared xBloom recipe facts from supplied sharing links.

The request matches the public sharing page, not a device-control API. Author
IDs, avatars and other account metadata are deliberately discarded. The output
is a reviewable source snapshot and never writes or publishes database rows.
"""
import argparse
import concurrent.futures
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path


def number(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0 else None


def fetch(row):
    url = urllib.parse.urlparse(row['url'])
    if url.hostname != 'share-h5.xbloom.com': return None
    share_id = urllib.parse.parse_qs(url.query).get('id', [None])[0]
    if not share_id: return None
    try:
        # These constants are the published, credential-free sharing-page request.
        body = json.dumps({'tableIdOfRSA': share_id, 'interfaceVersion': 19700101, 'skey': 'testskey'}).encode()
        request = urllib.request.Request('https://client-api.xbloom.com/RecipeDetail.html', data=body, headers={'Content-Type': 'application/json', 'Origin': 'https://share-h5.xbloom.com'})
        with urllib.request.urlopen(request, timeout=20) as response: data = json.loads(response.read(500_000))
        source = data.get('recipeVo')
        if not source or data.get('result') != 'success': return {'url': row['url'], 'error': 'public sharing page has no recipe'}
        pours = [{'volume': number(p.get('volume')), 'temperature': number(p.get('temperature')), 'flow_rate': number(p.get('flowRate')), 'pause_seconds': p.get('pausing') if isinstance(p.get('pausing'), (int, float)) and p['pausing'] >= 0 else None, 'pattern_code': p.get('pattern'), 'vibration_before': p.get('isEnableVibrationBefore'), 'vibration_after': p.get('isEnableVibrationAfter')} for p in source.get('pourList', [])]
        return {'url': row['url'], 'directory_url': row.get('directory_url'), 'title': source.get('theName') or row.get('title'), 'author': data.get('shareMemberName') or None, 'dose': number(source.get('dose')), 'water': sum(p['volume'] for p in pours) if pours and all(p['volume'] for p in pours) else None, 'ratio': number(source.get('grandWater')), 'grind_size': number(source.get('grinderSize')), 'rpm': number(source.get('rpm')) if source.get('adaptedModel') != 1 else None, 'source_model_code': source.get('adaptedModel'), 'cup_type': source.get('cupTypeName'), 'pours': pours, 'checked_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
    except Exception as error: return {'url': row['url'], 'error': str(error)[:200]}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--sources', required=True); ap.add_argument('--media', required=True); ap.add_argument('--output', required=True); args = ap.parse_args()
    catalog = json.loads(Path(args.sources).read_text()); media = json.loads(Path(args.media).read_text())
    links = [{'url': r['source_url'], 'title': r.get('source_name')} for r in catalog.get('recipe_sources', []) if 'share-h5.xbloom.com/' in r['source_url']]
    links += [{**r, 'directory_url': page['source_url']} for page in media for r in page.get('xbloom_links', [])]
    unique = {urllib.parse.parse_qs(urllib.parse.urlparse(r['url']).query).get('id', [r['url']])[0]: r for r in links}
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(fetch, unique.values()):
            if result: results.append(result)
            Path(args.output).write_text(json.dumps(results, ensure_ascii=False, indent=2))
            if len(results) % 15 == 0: print(json.dumps({'checked': len(results), 'with_parameters': sum(bool(r.get('pours')) for r in results)}), flush=True)
    print(json.dumps({'complete': len(results), 'with_parameters': sum(bool(r.get('pours')) for r in results)}), flush=True)


if __name__ == '__main__': main()
