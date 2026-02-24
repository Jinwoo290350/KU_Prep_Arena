#!/usr/bin/env bash
# setup_vllm.sh — Start vLLM server on A100 (Nontri AI, KU)
#
# Usage:
#   ssh aip04@br2.paas.ku.ac.th
#   bash ai/scripts/setup_vllm.sh [MODEL] [PORT]
#
# Example:
#   bash ai/scripts/setup_vllm.sh Qwen/Qwen2.5-14B-Instruct 8000

set -euo pipefail

MODEL="${1:-Qwen/Qwen2.5-14B-Instruct}"
PORT="${2:-8000}"
GPU_UTIL="${GPU_UTIL:-0.90}"
MAX_LEN="${MAX_LEN:-8192}"

echo "========================================"
echo " KU Prep Arena — vLLM Server"
echo " Model  : $MODEL"
echo " Port   : $PORT"
echo " GPU    : ${GPU_UTIL} utilisation"
echo "========================================"

# Activate conda env if exists
if command -v conda &>/dev/null; then
  eval "$(conda shell.bash hook)"
  conda activate vllm 2>/dev/null || true
fi

python -m vllm.entrypoints.openai.api_server \
  --model "$MODEL" \
  --port "$PORT" \
  --host 0.0.0.0 \
  --max-model-len "$MAX_LEN" \
  --gpu-memory-utilization "$GPU_UTIL" \
  --dtype auto \
  --trust-remote-code
