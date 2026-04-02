#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  KU Prep Arena — LoRA Fine-tuning: Typhoon2-8B (Thai)
#
#  Base model : scb10x/llm-typhoon-v2-8b-instruct (Llama-3.1 / Thai-first)
#  GPU        : 3g.40gb MIG (40GB VRAM) — 8B 4-bit + LoRA r=64 ≈ 14GB
#  Output     : ~/ku_prep_arena/ai/models/ku_typhoon_v1/          (LoRA)
#               ~/ku_prep_arena/ai/models/ku_typhoon_v1_merged/   (merged, for vLLM)
#
#  วิธีใช้:
#    1. ดาวน์โหลด base model ก่อน:  sbatch ai/scripts/download_typhoon.sh
#    2. sbatch ~/ku_prep_arena/ai/scripts/slurm_finetune.sh
#    3. tail -f ~/ku_prep_arena/finetune-<JOB>.log
# ════════════════════════════════════════════════════════════════
#SBATCH --partition gpuq
#SBATCH --account=gm_aip04
#SBATCH --gres=gpu:3g.40gb:1
#SBATCH --cpus-per-task=8
#SBATCH --mem-per-cpu=8G
#SBATCH --time=0-4:00:00
#SBATCH --job-name=finetune-typhoon
#SBATCH --output=/home/aip04/ku_prep_arena/finetune-%J.log

echo "============================================================"
echo " KU Prep Arena — Fine-tuning Typhoon2-8B (Thai)"
echo " Start: $(date)"
echo "============================================================"

module load anaconda3/24.1.2
module load cuda/12.4

if conda activate ku_prep 2>/dev/null || source activate ku_prep 2>/dev/null; then
  echo "[INFO] Using ku_prep conda env"
fi

export CUDA_VISIBLE_DEVICES=0
# LoRA fine-tuning ใช้ internet download ได้ (ต่างจาก vLLM serve)
unset HF_HUB_OFFLINE
unset TRANSFORMERS_OFFLINE
# ปิด torch dynamo/compile — ป้องกัน crash ตอน save LoRA adapter
export TORCHDYNAMO_DISABLE=1
export TORCH_COMPILE_DISABLE=1

# ─── Remove torchao if installed ──────────────────────────────────────────
pip show torchao &>/dev/null \
  && { echo "[FIX] Removing torchao..."; pip uninstall -q -y torchao; } || true

# ─── Install unsloth if needed ────────────────────────────────────────────
python -c "import unsloth" 2>/dev/null \
  || { echo "[INSTALL] Installing unsloth..."; pip install -q "unsloth[cu124-torch240]"; }

# ─── Run notebook (finetune + save LoRA to /tmp) ──────────────────────────
cd ~/ku_prep_arena
jupyter nbconvert \
  --to notebook \
  --execute \
  --inplace \
  --ExecutePreprocessor.timeout=14400 \
  ai/notebooks/04_finetune.ipynb

# ─── Merge LoRA → merged model (ทุกอย่างใน /tmp บน node นี้) ─────────────
echo "[INFO] Starting LoRA merge on $(hostname -s)..."
pip uninstall -q -y torchao 2>/dev/null || true
pip install -q "transformers==4.51.3" "peft>=0.14.0" "accelerate>=1.0.0"

python - <<'PYEOF'
import json, torch, os
from pathlib import Path
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

os.environ['TORCHDYNAMO_DISABLE']   = '1'
os.environ['TORCH_COMPILE_DISABLE'] = '1'

info_file = Path.home() / 'ku_prep_arena/ai/models/downloaded_base_model.json'
base_model_path = json.loads(info_file.read_text())['path']

lora_path   = Path('/tmp/ku_typhoon_v1')
merged_path = Path('/tmp/ku_typhoon_v1_merged')

if not (lora_path / 'adapter_config.json').exists():
    raise FileNotFoundError(f"LoRA not found at {lora_path} — finetune may have failed")

merged_path.mkdir(parents=True, exist_ok=True)
print(f"Base  : {base_model_path}")
print(f"LoRA  : {lora_path}")
print(f"Output: {merged_path}")

print("\nLoading base model...")
model = AutoModelForCausalLM.from_pretrained(
    base_model_path, torch_dtype=torch.bfloat16,
    device_map="auto", trust_remote_code=True,
)
tokenizer = AutoTokenizer.from_pretrained(base_model_path, trust_remote_code=True)

print("Merging LoRA...")
model = PeftModel.from_pretrained(model, str(lora_path))
model = model.merge_and_unload()

print(f"Saving merged model to {merged_path} ...")
model.save_pretrained(str(merged_path), safe_serialization=True)
tokenizer.save_pretrained(str(merged_path))

files = list(merged_path.glob('*.safetensors'))
print(f"✅ Merge done — {len(files)} shard(s) in {merged_path}")
PYEOF

NODE=$(hostname -s)
echo "============================================================"
echo " Done: $(date)"
echo " Node    : ${NODE}"
echo " LoRA    : /tmp/ku_typhoon_v1  (local SSD on ${NODE})"
echo " Merged  : /tmp/ku_typhoon_v1_merged  (local SSD on ${NODE})"
echo ""
echo " ⚠️  Submit vLLM on the SAME node:"
echo "   sbatch --nodelist=${NODE} ~/ku_prep_arena/ai/scripts/slurm_vllm.sh"
echo "============================================================"
