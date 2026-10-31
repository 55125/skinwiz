#!/bin/bash
# Cloud rerun of the persepolis battery (4 vCPU Xeon, 15 GB). One model at a time; deletes each model's HF cache after its run to stay within disk.
cd /tmp/claude-0/-home-user-skinwiz/3f05b7b6-09ea-5e68-bb0b-b1a5aa5416ba/scratchpad/bake/marketing/voice-bakeoff; V=/tmp/claude-0/-home-user-skinwiz/3f05b7b6-09ea-5e68-bb0b-b1a5aa5416ba/scratchpad/venvs; H=~/.cache/huggingface/hub
run() { name=$1; shift; echo "== $name $(date +%T)"; s=$(date +%s); "$@" > logs/$name.out 2>&1; echo "exit $? wall $(($(date +%s)-s))s"; grep -E "loaded|Error" logs/$name.out | tail -2; }
run turbo $V/chatterbox/bin/python scripts/run_turbo.py; rm -rf $H/models--ResembleAI*
for l in english english_drifting_26-09 english_18m_2026-10; do run pocket-$l /tmp/claude-0/-home-user-skinwiz/3f05b7b6-09ea-5e68-bb0b-b1a5aa5416ba/scratchpad/venv/bin/python scripts/run_pocket.py $l; done
run kitten $V/kitten/bin/python scripts/run_kitten.py SarcasticCoworker AudiobookNarratorFemale
run qwen-custom $V/qwen/bin/python scripts/run_qwen.py custom; rm -rf $H/models--Qwen--Qwen3-TTS-12Hz-1.7B*
run qwen-clone $V/qwen/bin/python scripts/run_qwen.py clone
echo "== done $(date +%T)"; df -h / | tail -1
