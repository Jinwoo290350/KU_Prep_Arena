#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  Merge LoRA adapter into base model
#  ใช้ PEFT (ไม่ใช่ unsloth) เพื่อหลีกเลี่ยง torch dynamo error
# ════════════════════════════════════════════════════════════════
#SBATCH --partition gpuq
#SBATCH --account=gm_aip04
#SBATCH --gres=gpu:3g.40gb:1
#SBATCH --cpus-per-task=4
#SBATCH --mem-per-cpu=8G
#SBATCH --time=0-0:30:00
#SBATCH --job-name=merge-lora
#SBATCH --output=/home/aip04/ku_prep_arena/merge-%J.log

echo "============================================================"
echo " Merge LoRA → full model"
echo " Start: $(date)"
echo "============================================================"

module load anaconda3/24.1.2
module load cuda/12.4
conda activate ku_prep 2>/dev/null || source activate ku_prep 2>/dev/null

export CUDA_VISIBLE_DEVICES=0
# ปิด dynamo — ป้องกัน crash ตอน save
export TORCHDYNAMO_DISABLE=1
export TORCH_COMPILE_DISABLE=1

# ── Fix dependencies ──────────────────────────────────────────────────────
pip uninstall -q -y torchao 2>/dev/null || true
pip install -q "transformers==4.51.3" "peft>=0.14.0" "accelerate>=1.0.0"

python - <<'PYEOF'
import json, torch, subprocess, os
from pathlib import Path
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

os.environ['TORCHDYNAMO_DISABLE']   = '1'
os.environ['TORCH_COMPILE_DISABLE'] = '1'

# ── Paths ──────────────────────────────────────────────────────
info_file = Path.home() / 'ku_prep_arena/ai/models/downloaded_base_model.json'
base_model_path = json.loads(info_file.read_text())['path']

# หา LoRA — home (rsync'd จาก /tmp หลัง train)
lora_base = Path.home() / 'ku_prep_arena/ai/models/ku_typhoon_v1'
if (lora_base / 'adapter_config.json').exists():
    lora_path = lora_base
else:
    ckpt_dir = lora_base / 'checkpoints'
    checkpoints = sorted(ckpt_dir.glob('checkpoint-*'), key=lambda p: int(p.name.split('-')[-1]))
    if not checkpoints:
        raise FileNotFoundError(
            f"No LoRA adapter found at {lora_base}/adapter_config.json\n"
            f"Run slurm_finetune.sh first."
        )
    lora_path = checkpoints[-1]

# Save merged ไป /tmp (local SSD) — ป้องกัน EPROTO บน NFS
tmp_output   = Path('/tmp/ku_typhoon_v1_merged')
home_output  = Path.home() / 'ku_prep_arena/ai/models/ku_typhoon_v1_merged'
tmp_output.mkdir(parents=True, exist_ok=True)

print(f"Base model : {base_model_path}")
print(f"LoRA       : {lora_path}")
print(f"Output     : {tmp_output} → {home_output}")

# ── Load + merge ───────────────────────────────────────────────
print("\nLoading base model (bfloat16)...")
model = AutoModelForCausalLM.from_pretrained(
    base_model_path,
    torch_dtype=torch.bfloat16,
    device_map="auto",
    trust_remote_code=True,
)
tokenizer = AutoTokenizer.from_pretrained(base_model_path, trust_remote_code=True)

print("Loading + merging LoRA...")
model = PeftModel.from_pretrained(model, str(lora_path))
model = model.merge_and_unload()

# ── Save to /tmp ───────────────────────────────────────────────
print(f"\nSaving to {tmp_output} (local SSD)...")
model.save_pretrained(str(tmp_output), safe_serialization=True)
tokenizer.save_pretrained(str(tmp_output))
print(f"✅ Saved to {tmp_output}")

# ── Copy กลับ NFS home (chunked, no mmap — ป้องกัน EPROTO) ───────────
import shutil

def nfs_copy_file(src, dst, chunk_mb=32):
    dst.parent.mkdir(parents=True, exist_ok=True)
    with open(src, 'rb') as fin, open(dst, 'wb') as fout:
        chunk = chunk_mb * 1024 * 1024
        while True:
            data = fin.read(chunk)
            if not data:
                break
            fout.write(data)
    shutil.copystat(src, dst)

print(f"\nCopying to NFS home: {home_output}")
home_output.mkdir(parents=True, exist_ok=True)
for src_file in sorted(tmp_output.rglob('*')):   # recursive — รองรับ subdirectory
    if not src_file.is_file():
        continue
    dst_file = home_output / src_file.relative_to(tmp_output)
    size_mb = src_file.stat().st_size / 1024 / 1024
    print(f"  {src_file.relative_to(tmp_output)} ({size_mb:.1f} MB)...")
    nfs_copy_file(src_file, dst_file)
    print(f"  ✅ done")
os.system(f"du -sh '{home_output}'")
print("\n✅ Merge complete!")
print(f"   vLLM can serve: {home_output}")
PYEOF

echo "============================================================"
echo " Done: $(date)"
echo "============================================================"
