#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  KU Prep Arena — vLLM: Typhoon2-8B Fine-tuned (Thai Quiz)
#
#  Model  : ku_typhoon_v1_merged  (Typhoon2-8B + LoRA merged)
#  GPU    : 3g.40gb MIG — ~16GB bfloat16, fits easily in 40GB
#
#  วิธีใช้:
#    sbatch ~/ku_prep_arena/ai/scripts/slurm_vllm.sh
#    squeue -u aip04                        ← ดู node
#    tail -f ~/ku_prep_arena/vllm-<JOB>.log
#
#  SSH tunnel บน local:
#    ssh -N -L 8000:dgx-XX:8000 aip04@br2.paas.ku.ac.th
#  .env.local:
#    AI_BASE_URL=http://localhost:8000/v1
#    AI_MODEL=ku_typhoon_v1_merged
# ════════════════════════════════════════════════════════════════
#SBATCH --partition gpuq
#SBATCH --account=gm_aip04
#SBATCH --gres=gpu:3g.40gb:1
#SBATCH --cpus-per-task=8
#SBATCH --mem-per-cpu=8G
#SBATCH --time=1-0:00:00
#SBATCH --job-name=vllm-typhoon
#SBATCH --output=/home/aip04/ku_prep_arena/vllm-%J.log

port=8000
node=$(hostname -s)
user=$(whoami)
cluster="br2.paas.ku.ac.th"

echo "============================================================"
echo " KU Prep Arena — vLLM Typhoon2 Thai Quiz Server"
echo " Node: $node   Port: $port"
echo ""
echo " SSH TUNNEL:"
echo " ssh -N -L ${port}:${node}:${port} ${user}@${cluster}"
echo "============================================================"

module load anaconda3/24.1.2
module load cuda/12.4

if conda activate ku_prep 2>/dev/null || source activate ku_prep 2>/dev/null; then
  echo "[INFO] Using ku_prep conda env"
fi

export CUDA_VISIBLE_DEVICES=0

# ─── Install vLLM ≥0.8.0 ไปยัง /tmp (ไม่แตะ NFS conda env เลย) ──────────
# conda env อยู่บน NFS → pip install ลง NFS ล้มเหลว OSError 5
# แก้: install --target /tmp/vllm_pkg แล้ว prepend PYTHONPATH
VLLM_PKG=/tmp/vllm_pkg
export TMPDIR=/tmp   # pip temp extraction ไป local SSD ด้วย

VLLM_OK=$(python -c "
import sys
sys.path.insert(0, '$VLLM_PKG')
try:
    import vllm
    ok = tuple(int(x) for x in vllm.__version__.split('.')[:2]) >= (0,8)
    print('ok' if ok else 'old')
except ImportError:
    print('missing')
" 2>/dev/null)

if [ "$VLLM_OK" = "ok" ]; then
  echo "[INFO] vLLM ≥0.8.0 already in $VLLM_PKG"
else
  echo "[INFO] Installing vLLM ≥0.8.0 to $VLLM_PKG (local SSD)..."
  mkdir -p "$VLLM_PKG"
  pip install -q "vllm>=0.8.0" \
      --target "$VLLM_PKG" \
      --cache-dir /tmp/pip_cache \
      --no-deps-check 2>/dev/null || \
  pip install -q "vllm>=0.8.0" \
      --target "$VLLM_PKG" \
      --cache-dir /tmp/pip_cache
fi

export PYTHONPATH="$VLLM_PKG:$PYTHONPATH"
python -c "import sys; sys.path.insert(0,'$VLLM_PKG'); import vllm; print('[OK] vLLM', vllm.__version__)"

# ─── Set offline mode หลัง pip เสร็จ ─────────────────────────────────────
export HF_HUB_OFFLINE=1
export TRANSFORMERS_OFFLINE=1

# ─── Find model: /tmp → tar.gz → chunks → fallback error ─────────────────
TMP_MODEL="/tmp/ku_typhoon_v1_merged"
MODELS_DIR="$HOME/ku_prep_arena/ai/models"
TARBALL="$MODELS_DIR/ku_typhoon_v1_merged.tar.gz"
SPLIT_DIR="$MODELS_DIR/ku_typhoon_split"

if [ -d "$TMP_MODEL" ] && [ -f "$TMP_MODEL/config.json" ]; then
  echo "[INFO] Found merged model in /tmp — using directly"
elif [ -f "$TARBALL" ]; then
  echo "[INFO] Extracting model from tarball ($TARBALL) to /tmp..."
  tar -xzf "$TARBALL" -C /tmp
  echo "[OK] Tarball extracted."
elif [ -d "$SPLIT_DIR" ] && ls "$SPLIT_DIR"/chunk_* &>/dev/null; then
  echo "[INFO] Reassembling model from chunks (NFS → /tmp)..."
  cat "$SPLIT_DIR"/chunk_* | tar -x -C /tmp
  echo "[OK] Chunks extracted."
else
  echo "[ERROR] Model not found in /tmp, no tarball, and no chunks available."
  exit 1
fi

# ─── Verification Check ──────────────────────────────────────────────────
if [ ! -f "$TMP_MODEL/config.json" ]; then
  echo "[ERROR] Extraction failed or path is wrong! $TMP_MODEL/config.json not found."
  echo "Current contents of /tmp/ku_typhoon_v1_merged:"
  ls -la "$TMP_MODEL" 2>/dev/null || echo "Directory does not exist."
  echo "Current contents of /tmp:"
  ls -la /tmp | grep ku_
  exit 1
fi

echo "[OK] Model verified and ready: $(du -sh $TMP_MODEL | cut -f1)"

# ─── Start vLLM ───────────────────────────────────────────────────────────
echo "[INFO] Starting vLLM server..."
python -m vllm.entrypoints.openai.api_server \
  --model "$TMP_MODEL" \
  --port ${port} \
  --host 0.0.0.0 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.85 \
  --dtype bfloat16 \
  --trust-remote-code \
  --served-model-name ku_typhoon_v1_merged \
  --enable-prefix-caching \
  --max-num-seqs 32