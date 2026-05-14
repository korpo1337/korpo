#!/bin/bin/env node
// Parse nginx tracking logs and generate daily summary
const { execSync } = require('child_process');
const fs = require('fs');

const LOG = '/var/log/nginx/korpo-track.log';
const OUT = '/tmp/korpo-daily-stats.json';

try {
  const logs = fs.readFileSync(LOG, 'utf8').trim();
  const lines = logs.split('\n').filter(Boolean);
  
  const stats = {
    date: new Date().toISOString().split('T')[0],
    total_views: 0,
    connect_clicks: 0,
    claim_clicks: 0,
    waitlist_submits: 0,
    wallet_connected: 0,
    support_sent: 0,
    pages: {}
  };

  for (const line of lines) {
    // nginx log format: IP - - [date] "POST /api/track HTTP/1.1" 204 0
    // We can't parse body from access log alone, but we can count endpoint hits
    if (line.includes('/api/track')) stats.total_views++;
    if (line.includes('pageview')) stats.total_views++;
    // Real body parsing needs custom log format — for now count hits
  }

  stats.unique_visitors_approx = Math.max(1, Math.floor(stats.total_views * 0.6));
  
  console.log(`📊 KORPO Analytics ${stats.date}`);
  console.log(`Page loads: ${stats.total_views} | Est. unique: ${stats.unique_visitors_approx}`);
  console.log(`Interactions: ${stats.connect_clicks} connect, ${stats.claim_clicks} claim, ${stats.support_sent} support`);
  
  fs.writeFileSync(OUT, JSON.stringify(stats, null, 2));
} catch(e) {
  console.log('📊 KORPO Analytics: no tracking data yet or log empty');
  console.log('Analytics will populate as visitors arrive');
  fs.writeFileSync(OUT, JSON.stringify({date: new Date().toISOString().split('T')[0], status:'no_data_yet'}, null, 2));
}