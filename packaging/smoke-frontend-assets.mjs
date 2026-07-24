#!/usr/bin/env node

/* global AbortSignal, fetch */

import { Buffer } from 'node:buffer';
import { error, log } from 'node:console';
import process from 'node:process';
import { URL } from 'node:url';

const baseUrl = process.argv[2];
if (!baseUrl) {
  error('Usage: smoke-frontend-assets.mjs <frontend-url>');
  process.exit(2);
}

const fetchChecked = async (url, options = {}) => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    ...options,
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response;
};

const indexUrl = new URL('/', baseUrl).toString();
const indexResponse = await fetchChecked(indexUrl, {
  headers: {
    'if-none-match': 'W/"stale-upgrade-validator"',
    'if-modified-since': 'Wed, 21 Oct 2015 07:28:00 GMT',
  },
});
const indexType = indexResponse.headers.get('content-type') ?? '';
if (!indexType.includes('text/html')) throw new Error(`index.html MIME không hợp lệ: ${indexType}`);
if (indexResponse.status !== 200)
  throw new Error(`index.html không được truyền mới: HTTP ${indexResponse.status}`);
const contentSecurityPolicy = indexResponse.headers.get('content-security-policy') ?? '';
if (/\bupgrade-insecure-requests\b/i.test(contentSecurityPolicy)) {
  throw new Error('CSP đang ép asset HTTP sang HTTPS và sẽ gây màn hình trắng trên IP LAN.');
}
const html = await indexResponse.text();
if (!html.includes('<div id="root"></div>')) throw new Error('index.html thiếu React root.');

const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]);
const assets = references
  .map((reference) => new URL(reference, indexUrl))
  .filter((url) => url.pathname.startsWith('/assets/') && /\.(?:css|js)$/.test(url.pathname));
if (
  !assets.some((url) => url.pathname.endsWith('.css')) ||
  !assets.some((url) => url.pathname.endsWith('.js'))
) {
  throw new Error('index.html phải tham chiếu ít nhất một CSS và một JavaScript asset.');
}

const checked = [];
for (const asset of assets) {
  const response = await fetchChecked(asset);
  const contentType = response.headers.get('content-type') ?? '';
  const expectedType = asset.pathname.endsWith('.css') ? 'text/css' : 'javascript';
  if (!contentType.includes(expectedType)) {
    throw new Error(`${asset.pathname} MIME không hợp lệ: ${contentType}`);
  }
  const body = await response.text();
  if (!body.trim() || /^\s*(?:<!doctype|<html)/i.test(body)) {
    throw new Error(`${asset.pathname} rỗng hoặc bị thay bằng index.html.`);
  }
  checked.push({ path: asset.pathname, contentType, bytes: Buffer.byteLength(body) });
}

log(JSON.stringify({ status: 'ready', index: indexUrl, contentSecurityPolicy, assets: checked }));
