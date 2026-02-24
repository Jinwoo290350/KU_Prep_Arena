#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  KU Prep Arena — vLLM SLURM job
#
#  วิธีเริ่มใหม่หลัง Ctrl+C / job หมดเวลา:
#    ssh aip04@br1.paas.ku.ac.th
#    module load slurm
#    sbatch ~/ku_prep_arena/ai/scripts/slurm_vllm.sh
#    squeue -u aip04                 ← ดู job ID และ node
#    tail -f ~/ku_prep_arena/vllm-<JOB>.log  ← ดู log
#
#  แล้วเปิด SSH tunnel บน local machine:
#    ssh -N -L 8000:dgx-XX:8000 aip04@br1.paas.ku.ac.th
#  (แทน dgx-XX ด้วย node ที่เห็นใน squeue)
# ════════════════════════════════════════════════════════════════
#SBATCH --partition gpuq
#SBATCH --account=gm_aip04
#SBATCH --gres=gpu:1g.10gb:1
#SBATCH --cpus-per-task=4
#SBATCH --mem-per-cpu=8G
#SBATCH --time=1-0:00:00
#SBATCH --job-name=vllm-ku-prep
#SBATCH --output=/home/aip04/ku_prep_arena/vllm-%J.log

# ─── Print SSH tunnel command ──────────────────────────────────────────────
port=8000
node=$(hostname -s)
user=$(whoami)
cluster="br1.paas.ku.ac.th"

echo "============================================================"
echo " KU Prep Arena — vLLM Server"
echo "============================================================"
echo " Node: $node   Port: $port"
echo ""
echo " SSH TUNNEL (รันบน local machine):"
echo " ssh -N -L ${port}:${node}:${port} ${user}@${cluster}"
echo ""
echo " แล้วเปิด web app ที่ .env.local:"
echo " AI_BASE_URL=http://localhost:${port}/v1"
echo "============================================================"

# ─── Load modules ─────────────────────────────────────────────────────────
module load anaconda3/24.1.2
module load cuda/12.4

# Try ku_prep conda env first; fall back to system Python (has vLLM in ~/.local)
if conda activate ku_prep 2>/dev/null || source activate ku_prep 2>/dev/null; then
  echo "[INFO] Using ku_prep conda env"
else
  echo "[WARN] ku_prep env not found — using system Python"
fi

# Pin transformers to version compatible with vLLM 0.6.6
# Needs >=4.45.0 (mllama module) but <4.46 (all_special_tokens_extended still present)
python -c "import transformers; assert transformers.__version__ == '4.45.2'" 2>/dev/null \
  || { echo "[FIX] Pinning transformers==4.45.2 ..."; pip install -q "transformers==4.45.2"; }

# ─── Fix vLLM 0.15.1 MIG UUID bug ────────────────────────────────────────
# SLURM sets CUDA_VISIBLE_DEVICES=MIG-<uuid> but vLLM tries int(uuid) → crash
# SLURM cgroup already isolates the MIG slice, so "0" = allocated MIG device
export CUDA_VISIBLE_DEVICES=0

# ─── Start vLLM ───────────────────────────────────────────────────────────
# 10GB MIG: ใช้ Qwen2.5-7B AWQ (4-bit quantized, ~4GB VRAM)
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct-AWQ \
  --quantization awq_marlin \
  --port ${port} \
  --host 0.0.0.0 \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.85 \
  --dtype auto \
  --trust-remote-code
