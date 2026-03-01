#!/usr/bin/env node
import { readdir, open } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const VERSION = '1.0.0';
const MAX_CHUNK = 4096;

function parseArgs(argv) {
  const args = { days: 0, json: false, utc: false };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--days=')) args.days = parseInt(a.slice(7)) || 0;
    else if (a === '--json') args.json = true;
    else if (a === '--utc') args.utc = true;
    else if (a === '--help' || a === '-h') {
      console.log([
        `cc-gap v${VERSION}`,
        '',
        'Usage: cc-gap [options]',
        '',
        'Options:',
        '  --days=N    Only analyze sessions from the last N days',
        '  --json      Output JSON for piping',
        '  --help      Show this help',
        '',
        'Shows the distribution of time gaps between consecutive Claude Code sessions.',
      ].join('\n'));
      process.exit(0);
    }
  }
  return args;
}

async function getFirstTimestamp(path) {
  let fh;
  try {
    fh = await open(path, 'r');
    const buf = Buffer.alloc(MAX_CHUNK);
    const { bytesRead } = await fh.read(buf, 0, MAX_CHUNK, 0);
    const text = buf.subarray(0, bytesRead).toString('utf8');
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const d = JSON.parse(line);
        if (d.timestamp) return new Date(d.timestamp);
      } catch {}
    }
  } catch {}
  finally { await fh?.close(); }
  return null;
}

async function collectStarts(claudeDir, cutoff) {
  const starts = [];
  let projectDirs;
  try { projectDirs = await readdir(claudeDir); } catch { return starts; }

  for (const pd of projectDirs) {
    const pdPath = join(claudeDir, pd);
    let files;
    try { files = await readdir(pdPath); } catch { continue; }
    for (const name of files) {
      if (!name.endsWith('.jsonl')) continue;
      const ts = await getFirstTimestamp(join(pdPath, name));
      if (!ts) continue;
      if (cutoff && ts < cutoff) continue;
      starts.push(ts);
    }
  }
  return starts;
}

const BUCKETS = [
  { label: '< 1 min',   min: 0,     max: 1,      cls: 'instant' },
  { label: '1–5 min',   min: 1,     max: 5,      cls: 'quick' },
  { label: '5–30 min',  min: 5,     max: 30,     cls: 'quick' },
  { label: '30m–2h',    min: 30,    max: 120,    cls: 'medium' },
  { label: '2–8 hr',    min: 120,   max: 480,    cls: 'medium' },
  { label: '8–24 hr',   min: 480,   max: 1440,   cls: 'long' },
  { label: '1–2 days',  min: 1440,  max: 2880,   cls: 'long' },
  { label: '2–7 days',  min: 2880,  max: 10080,  cls: 'long' },
  { label: '7+ days',   min: 10080, max: Infinity, cls: 'long' },
];

function fmtGap(min) {
  if (min < 1) return `${Math.round(min * 60)}s`;
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

function median(sorted) {
  if (!sorted.length) return 0;
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

function mean(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function classify(medianMin, pctInstant) {
  if (pctInstant >= 0.5 || medianMin < 2)
    return { label: '⚡ Always On', desc: 'Your AI barely pauses. Instant restarts, continuous work.' };
  if (medianMin < 30)
    return { label: '🔄 Rapid Cycler', desc: 'Quick breaks between sessions. Fast iteration rhythm.' };
  if (medianMin < 240)
    return { label: '⏸️  Steady Pauser', desc: 'Natural pauses between focused bursts.' };
  if (medianMin < 1440)
    return { label: '🌙 Daily Worker', desc: 'Sessions cluster in work windows with overnight breaks.' };
  return { label: '📅 Weekend Coder', desc: 'Infrequent sessions with multi-day breaks between.' };
}

async function main() {
  const args = parseArgs(process.argv);
  const claudeDir = join(homedir(), '.claude', 'projects');
  const cutoff = args.days ? new Date(Date.now() - args.days * 86400000) : null;

  const starts = await collectStarts(claudeDir, cutoff);
  if (starts.length < 2) {
    console.log('Not enough sessions to compute gaps.');
    process.exit(0);
  }

  starts.sort((a, b) => a - b);

  const gapsMin = [];
  for (let i = 1; i < starts.length; i++) {
    const g = (starts[i] - starts[i - 1]) / 60000;
    if (g >= 0 && g < 365 * 24 * 60) gapsMin.push(g);
  }

  const sorted = [...gapsMin].sort((a, b) => a - b);
  const total = sorted.length;
  const med = median(sorted);
  const avg = mean(sorted);
  const maxGap = sorted[total - 1];
  const pctInstant = sorted.filter(g => g < 1).length / total;
  const p90 = sorted[Math.floor(total * 0.9)];
  const cls = classify(med, pctInstant);

  const bucketCounts = BUCKETS.map(b => ({
    ...b,
    count: sorted.filter(g => g >= b.min && g < b.max).length,
  }));

  if (args.json) {
    console.log(JSON.stringify({
      sessions: starts.length,
      gaps: total,
      median: med,
      mean: avg,
      max: maxGap,
      p90,
      pctInstant,
      classification: cls.label,
      buckets: bucketCounts.map(b => ({ label: b.label, count: b.count, pct: b.count / total * 100 })),
    }, null, 2));
    return;
  }

  const scope = args.days ? `Last ${args.days} days` : 'All time';

  const C = {
    reset: '\x1b[0m', bold: '\x1b[1m',
    purple: '\x1b[35m', cyan: '\x1b[36m',
    yellow: '\x1b[33m', orange: '\x1b[38;5;214m',
    muted: '\x1b[90m', green: '\x1b[32m',
  };

  const maxCount = Math.max(...bucketCounts.map(b => b.count), 1);

  console.log(`\n${C.cyan}${C.bold}cc-gap${C.reset} — Time between your Claude Code sessions (${scope})\n`);
  console.log(`${C.muted}${starts.length} sessions · ${total} gaps analyzed${C.reset}\n`);

  for (const b of bucketCounts) {
    const pct = (b.count / total * 100).toFixed(0);
    const barWidth = Math.round(b.count / maxCount * 28);
    const color = b.cls === 'instant' ? C.purple
                : b.cls === 'quick'   ? C.cyan
                : b.cls === 'medium'  ? C.yellow
                : C.orange;
    const filled = '█'.repeat(barWidth);
    const empty  = '░'.repeat(28 - barWidth);
    console.log(
      `  ${C.muted}${b.label.padEnd(10)}${C.reset}  ` +
      `${color}${filled}${C.muted}${empty}${C.reset}  ` +
      `${C.muted}${String(b.count).padStart(4)}  (${String(pct).padStart(3)}%)${C.reset}`
    );
  }

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  ${C.cyan}Work style:${C.reset}   ${C.bold}${cls.label}${C.reset}`);
  console.log(`  ${C.muted}${cls.desc}${C.reset}`);

  console.log(`\n  ${C.muted}Median gap:${C.reset}  ${C.bold}${fmtGap(med)}${C.reset}`);
  console.log(`  ${C.muted}Mean gap:${C.reset}    ${C.bold}${fmtGap(avg)}${C.reset}`);
  console.log(`  ${C.muted}P90 gap:${C.reset}     ${C.bold}${fmtGap(p90)}${C.reset}`);
  console.log(`  ${C.muted}Longest gap:${C.reset} ${C.orange}${C.bold}${fmtGap(maxGap)}${C.reset}`);
  console.log(`  ${C.muted}< 1 min (compaction):${C.reset}  ${(pctInstant * 100).toFixed(1)}% of gaps`);
  console.log();
}

main().catch(e => { console.error(e.message); process.exit(1); });
