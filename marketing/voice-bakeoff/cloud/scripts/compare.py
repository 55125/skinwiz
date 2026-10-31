"""Compare cloud logs/results.jsonl with persepolis/logs/results.jsonl, per model (same takes only)."""
import json, collections, os, sys
B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ld = lambda p: {(r["model"], r["voice"], r["line"]): r for r in map(json.loads, open(os.path.join(B, p)))}
c, p = ld("logs/results.jsonl"), ld("persepolis/logs/results.jsonl")
agg = collections.OrderedDict()
for k, r in c.items():
    if k not in p: continue
    a = agg.setdefault(k[0], [0, 0, 0, 0]); a[0] += r["secs"]; a[1] += p[k]["secs"]; a[2] += r["audio_s"]; a[3] = max(a[3], r["peak_rss_mb"])
print("| model | cloud sec | server sec | speed-up | cloud × real time | peak RAM |\n|---|---|---|---|---|---|")
for m, (cs, ps, au, ram) in agg.items(): print(f"| {m} | {cs:.0f} | {ps:.0f} | {ps/cs:.1f}× | {cs/au:.1f}× | {ram/1024:.1f} GB |")
