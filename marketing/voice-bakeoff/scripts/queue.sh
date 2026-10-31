#!/bin/bash
# Runs each model alone (4 threads) so timings don't overlap. /usr/bin/time gives peak RSS for the whole process.
cd /opt/antigravity/marketing/voice-bakeoff
run() { name=$1; shift; echo "== $name $(date +%T)"; /usr/bin/time -v "$@" > logs/$name.out 2> logs/$name.time; echo "exit $? $(grep Maximum logs/$name.time) wall $(grep Elapsed logs/$name.time | awk '{print $NF}')"; }
while pgrep -f run_chatterbox.py >/dev/null; do sleep 10; done
for j in "$@"; do case $j in
 turbo)  run turbo  venv-turbo/bin/python scripts/run_turbo.py ;;
 kitten) run kitten venv-kitten/bin/python scripts/run_kitten.py ;;
 kitten-stock) run kitten-stock venv-kitten/bin/python scripts/run_kitten.py SarcasticCoworker AudiobookNarratorFemale stock-only ;;
 pocket) for l in english english_drifting_26-09 english_18m_2026-10; do run pocket-$l venv-pocket/bin/python scripts/run_pocket.py $l; done ;;
 qwen-custom) run qwen-custom venv-qwen/bin/python scripts/run_qwen.py custom ;;
 qwen-clone)  run qwen-clone  venv-qwen/bin/python scripts/run_qwen.py clone ;;
esac; done
echo "== done $(date +%T)"
