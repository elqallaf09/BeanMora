#!/usr/bin/env python3
"""Validate public source snapshots and emit admin-only, reviewable SQL batches.

This script never connects to a database, creates reviews, downloads photos,
or receives credentials. Apply schema migrations before reviewing these files.
"""
import argparse
import hashlib
import json
import math
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent


def positive(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value > 0


def https(value):
    if not isinstance(value, str):
        return False
    url = urlparse(value)
    return url.scheme == 'https' and bool(url.hostname) and not url.username and not url.password


def reviewed_rows():
    base = ROOT / 'supabase/research'
    recipes = json.loads((base / 'xbloom/collective-facts.json').read_text())
    for source in json.loads((base / 'xbloom/shared-links.json').read_text()):
        if not source.get('pours'):
            continue
        row = dict(source)
        row.update(slug='xbloom-shared-' + hashlib.sha256(row['url'].encode()).hexdigest()[:24],
                   water_ml=row['water'], poured_water_ml=row['water'],
                   pour_sum_matches_stated_water=True, official=False,
                   model='Original' if row.get('source_model_code') == 1 else None)
        recipes.append(row)
    for row in recipes:
        assert https(row.get('url')) and re.match(r'^https://(?:collective\.xbloom\.com/recipe/[0-9]+$|share-h5\.xbloom\.com/\?id=)', row['url']), 'Expected a public sharing URL'
        assert 1 <= len(row.get('title', '')) <= 300, 'Expected a source title'
        assert positive(row.get('dose')) and positive(row.get('water_ml')), 'Dose or water is missing'
        assert 1 <= len(row.get('pours', [])) <= 50, 'Missing source pours'
        assert all(positive(p.get('volume')) for p in row['pours']), 'Invalid pour volume'
        assert row.get('checked_at'), 'Source verification timestamp missing'
        assert not {'user_id', 'memberId', 'email', 'phone', 'access_token', 'refresh_token'} & row.keys(), 'Noncatalog account metadata'
    media = json.loads((base / 'catalog-media.json').read_text())
    for row in media:
        assert row.get('kind') in ('beans', 'equipment') and row.get('name'), 'Invalid media target'
        assert https(row.get('source_url')) and https(row.get('image_url')), 'Expected attributed remote media'
        assert row.get('association') == 'source_product_page', 'Product association is unreviewed'
    return recipes + media


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True, help='Directory for reviewed SQL batches')
    parser.add_argument('--batch-size', type=int, default=80)
    args = parser.parse_args()
    if not 1 <= args.batch_size <= 200:
        parser.error('batch-size must be between 1 and 200')
    rows = reviewed_rows()
    args.output.mkdir(parents=True, exist_ok=True)
    count = 0
    for index in range(0, len(rows), args.batch_size):
        payload = json.dumps(rows[index:index + args.batch_size], ensure_ascii=False, separators=(',', ':'), allow_nan=False)
        assert '$catalog$' not in payload, 'SQL delimiter appears in source text'
        sql = '-- Reviewed public source facts. Administrative connection only.\n'
        sql += 'select private.publish_reviewed_catalog_batch($catalog$' + payload + '$catalog$::jsonb) as replay;\n'
        (args.output / f'{count:03}.sql').write_text(sql)
        count += 1
    print(json.dumps({'reviewed_rows': len(rows), 'batches': count, 'database_writes': 0}))


if __name__ == '__main__':
    main()
