#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  KU Prep Arena — Teacher Model (Qwen2.5-32B-AWQ) for Data Generation
#
#  ใช้เฉพาะตอนสร้าง / rate dataset สำหรับ fine-tuning
#  หลังจาก generate + rate dataset เสร็จแล้วให้ scancel job นี้
#
#  วิธีใช้:
#    ssh aip04@br1.paas.ku.ac.th
#    module load slurm
#    sbatch ~/ku_prep_arena/ai/scripts/slurm_teacher.sh
#    squeue -u aip04
#    tail -f ~/ku_prep_arena/teacher-<JOB>.log
#
#  แล้วรัน notebook 01 / 05 กับ port 8001:
#    AI_BASE_URL=http://localhost:8001/v1 jupyter ...
#    AI_MODEL=Qwen/Qwen2.5-32B-Instruct-AWQ
# ════════════════════════════════════════════════════════════════
#SBATCH --partition gpuq
#SBATCH --account=gm_aip04
#SBATCH --gres=gpu:3g.40gb:1
#SBATCH --cpus-per-task=4
#SBATCH --mem-per-cpu=8G
#SBATCH --time=0-8:00:00
#SBATCH --job-name=teacher-ku-prep
#SBATCH --output=/home/aip04/ku_prep_arena/teacher-%J.log

# ─── Print SSH tunnel command ──────────────────────────────────────────────
port=8001
node=$(hostname -s)
user=$(whoami)
cluster="br1.paas.ku.ac.th"

echo "============================================================"
echo " KU Prep Arena — Teacher Model (Qwen2.5-32B-AWQ, 3g.40gb)"
echo "============================================================"
echo " Node: $node   Port: $port"
echo ""
echo " SSH TUNNEL (รันบน local machine):"
echo " ssh -N -L ${port}:${node}:${port} ${user}@${cluster}"
echo ""
echo " ตั้งค่าใน notebook:"
echo " AI_BASE_URL=http://localhost:${port}/v1"
echo " AI_MODEL=Qwen/Qwen2.5-32B-Instruct-AWQ"
echo "============================================================"

# ─── Load modules ─────────────────────────────────────────────────────────
module load anaconda3/24.1.2
module load cuda/12.4

if conda activate ku_prep 2>/dev/null || source activate ku_prep 2>/dev/null; then
  echo "[INFO] Using ku_prep conda env"
else
  echo "[WARN] ku_prep env not found — using system Python"
fi

# Pin transformers for vLLM compatibility
python -c "import transformers; assert transformers.__version__ == '4.45.2'" 2>/dev/null \
  || { echo "[FIX] Pinning transformers==4.45.2 ..."; pip install -q "transformers==4.45.2"; }

export CUDA_VISIBLE_DEVICES=0

# ─── Start Teacher vLLM on port 8001 ──────────────────────────────────────
# 40GB MIG: Qwen2.5-32B AWQ (~18GB VRAM) — much better than 7B for data generation
# --max-model-len 8192: ยาวพอสำหรับ PDF chunk + 10 questions output
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-32B-Instruct-AWQ \
  --quantization awq_marlin \
  --port ${port} \
  --host 0.0.0.0 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.88 \
  --dtype auto \
  --trust-remote-code \
  --enable-prefix-caching \
  --max-num-seqs 4
