#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const PATH = '/var/www/korpo/data/waitlist.json';

function addEntry(email, wallet) {
  let data = [];
  try { data = JSON.parse(fs.readFileSync(PATH, 'utf8')); } catch {}
  if (data.find(e => e.email === email)) return { ok: true, msg: 'Already registered', count: data.length };
  data.push({ email, wallet: wallet || '', date: new Date().toISOString() });
  fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
  return { ok: true, msg: 'Added', count: data.length };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  if (req.method === 'POST' && req.url === '/api/waitlist') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { email, wallet } = JSON.parse(body);
        if (!email || !email.includes('@')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, msg: 'Invalid email' }));
        }
        const result = addEntry(email, wallet);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, msg: 'Parse error: ' + e.message }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, msg: 'Not found' }));
  }
});

server.listen(3099, () => console.log('Waitlist API listening on :3099'));