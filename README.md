# cc-gap

**How long does your AI rest between sessions?**

Analyzes the time gaps between consecutive Claude Code sessions to reveal your work rhythm — from instant compaction restarts to multi-day breaks.

## Usage

```bash
npx cc-gap
```

Or use the browser version (no install):

→ **[yurukusa.github.io/cc-gap](https://yurukusa.github.io/cc-gap/)**

Drag in your `~/.claude` folder. Everything runs locally — nothing is uploaded.

## Sample output

```
cc-gap — Time between your Claude Code sessions (All time)

488 sessions · 487 gaps analyzed

  < 1 min    ████████████████████████░░░░  119  ( 24%)
  1–5 min    ███████████████░░░░░░░░░░░░░   79  ( 16%)
  5–30 min   ████████████████████████████  148  ( 30%)
  30m–2h     █████████░░░░░░░░░░░░░░░░░░░   46  (  9%)
  2–8 hr     ██████████░░░░░░░░░░░░░░░░░░   51  ( 10%)
  8–24 hr    ██████░░░░░░░░░░░░░░░░░░░░░░   31  (  6%)
  1–2 days   ██░░░░░░░░░░░░░░░░░░░░░░░░░░   13  (  3%)
  2–7 days   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░    0  (  0%)
  7+ days    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░    0  (  0%)

───────────────────────────────────────────────────────
  Work style:   🔄 Rapid Cycler
  Quick breaks between sessions. Fast iteration rhythm.

  Median gap:  7m
  Mean gap:    2h 29m
  P90 gap:     7h 34m
  Longest gap: 1d 23h
  < 1 min (compaction):  24.4% of gaps
```

## Work style classifications

| Type | Median gap | Description |
|------|-----------|-------------|
| ⚡ Always On | < 2 min | The AI barely pauses — continuous autonomous work |
| 🔄 Rapid Cycler | 2–30 min | Quick breaks, fast iteration rhythm |
| ⏸️ Steady Pauser | 30 min–4 hr | Natural pauses between focused bursts |
| 🌙 Daily Worker | 4–24 hr | Sessions in work windows with overnight breaks |
| 📅 Weekend Coder | > 24 hr | Infrequent sessions with multi-day breaks |

## Options

```bash
npx cc-gap              # All-time analysis
npx cc-gap --days=30   # Last 30 days
npx cc-gap --json      # JSON output for dashboards
```

## Part of cc-toolkit

cc-gap is tool #47 in [cc-toolkit](https://yurukusa.github.io/cc-toolkit/) — 47 free tools for Claude Code users.

Related tools:
- [cc-session-length](https://github.com/yurukusa/cc-session-length) — How long do sessions last?
- [cc-night-owl](https://github.com/yurukusa/cc-night-owl) — Which hours does your AI work most?
- [cc-streak](https://github.com/yurukusa/cc-streak) — Consecutive days of usage

---

**GitHub**: [yurukusa/cc-gap](https://github.com/yurukusa/cc-gap)
**Try it**: `npx cc-gap`
