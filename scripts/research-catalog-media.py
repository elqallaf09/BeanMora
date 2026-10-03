#!/usr/bin/env python3
"""Read source-page media metadata and xBloom links for a reviewable catalog batch.

Remote image URLs stay at the publisher. This never downloads/rehosts imagery,
claims a license, copies article bodies, or writes to the database.
"""
import argparse
import concurrent.futures
import html
import json
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from html.parser import HTMLParser
from pathlib import Path

AGENT = 'BeanMoraCatalog/1.0'
locks, robots, last_read = {}, {}, {}
state_lock = threading.Lock()


class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.meta = {}; self.links = []; self.current = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'meta': self.meta[a.get('property') or a.get('name')] = a.get('content', '')
        if tag == 'a': self.current = [a.get('href', ''), '']
    def handle_data(self, text):
        if self.current: self.current[1] += text
    def handle_endtag(self, tag):
        if tag == 'a' and self.current:
            self.links.append(self.current); self.current = None


def get(url):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ('https', 'http') or parsed.username or not parsed.hostname:
        raise ValueError('invalid public source URL')
    url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, urllib.parse.quote(parsed.path, safe='/%:@'), urllib.parse.quote(parsed.query, safe='=&%:@,+'), ''))
    origin = f'{parsed.scheme}://{parsed.netloc}'
    with state_lock: lock = locks.setdefault(origin, threading.Lock())
    with lock:
        if origin not in robots:
            rp = urllib.robotparser.RobotFileParser()
            try:
                with urllib.request.urlopen(urllib.request.Request(origin + '/robots.txt', headers={'User-Agent': AGENT}), timeout=12) as r: rp.parse(r.read(500_000).decode(errors='replace').splitlines())
            except urllib.error.HTTPError as e:
                if e.code == 404: rp.parse([])
                else: raise ValueError('robots unavailable: ' + str(e.code))
            robots[origin] = rp
        if not robots[origin].can_fetch(AGENT, url): raise ValueError('robots disallows this page')
        wait = max(0, last_read.get(origin, 0) + 1 - time.monotonic())
        if wait: time.sleep(wait)
        last_read[origin] = time.monotonic()
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': AGENT}), timeout=20) as response:
            if 'text/html' not in response.headers.get('Content-Type', ''): raise ValueError('not an HTML source page')
            return response.geturl(), response.read(2_000_000).decode(errors='replace')


def inspect(row):
    result = {'id': row.get('id'), 'kind': row['kind'], 'name': row.get('name') or row.get('name_en'), 'source_url': row['source_url']}
    try:
        url, content = get(row['source_url']); p = Page(); p.feed(content)
        raw_image = html.unescape(p.meta.get('og:image', ''))
        image = urllib.parse.urljoin(url, raw_image).replace('http://', 'https://', 1) if raw_image else None
        path = urllib.parse.urlparse(url).path
        specific = bool(re.search(r'/(?:products?|pages)/[^/]+|\.html$', path))
        usable = specific and bool(image) and image.startswith('https://') and not re.search(r'logo|favicon|placeholder', image, re.I)
        if usable:
            try:
                with urllib.request.urlopen(urllib.request.Request(image, method='HEAD', headers={'User-Agent': AGENT}), timeout=15) as photo:
                    usable = photo.headers.get('Content-Type', '').startswith('image/')
            except Exception:
                usable = False
        result.update({'resolved_url': url, 'source_title': p.meta.get('og:title', ''), 'image_url': image if usable else None, 'association': 'source_product_page' if usable else None})
        result['xbloom_links'] = [{'url': urllib.parse.urljoin(url, link), 'title': re.sub(r'\s+', ' ', title).strip()[:100]} for link, title in p.links if 'share-h5.xbloom.com/' in link]
    except Exception as e: result['error'] = str(e)[:200]
    return result


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--input', required=True); ap.add_argument('--output', required=True); args = ap.parse_args()
    data = json.loads(Path(args.input).read_text())
    rows = [{**r, 'kind': kind} for kind in ('beans', 'equipment') for r in data.get(kind, []) if r.get('source_url')]
    rows += [{'kind': 'recipe_directory', 'name': r['source_name'], 'source_url': r['source_url']} for r in data.get('recipe_sources', []) if 'redeemer.coffee/pages/' in r['source_url']]
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        for row in pool.map(inspect, rows):
            results.append(row); Path(args.output).write_text(json.dumps(results, ensure_ascii=False, indent=2))
            if len(results) % 15 == 0: print(json.dumps({'checked': len(results), 'photos': sum(bool(r.get('image_url')) for r in results), 'links': sum(len(r.get('xbloom_links', [])) for r in results)}), flush=True)
    print(json.dumps({'complete': len(results), 'photos': sum(bool(r.get('image_url')) for r in results), 'links': sum(len(r.get('xbloom_links', [])) for r in results)}), flush=True)


if __name__ == '__main__': main()
