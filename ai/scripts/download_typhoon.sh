#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  Download Thai LLM to HuggingFace cache
#
#  ถ้ามี HF_TOKEN:  ดาวน์โหลด Typhoon2-8B (ดีที่สุดสำหรับภาษาไทย)
#  ถ้าไม่มี token:  ดาวน์โหลด OpenThaiGPT-7B (ไม่ต้อง auth)
#
#  วิธีตั้ง HF_TOKEN (ทำครั้งเดียว):
#    1. ไปที่ https://huggingface.co/settings/tokens
#    2. สร้าง token (Read access)
#    3. export HF_TOKEN=hf_xxxxxxxxxxxx  (ใส่ใน ~/.bashrc)
# ════════════════════════════════════════════════════════════════
#SBATCH --partition gpuq
#SBATCH --account=gm_aip04
#SBATCH --cpus-per-task=4
#SBATCH --mem-per-cpu=4G
#SBATCH --time=0-1:00:00
#SBATCH --job-name=download-thai-llm
#SBATCH --output=/home/aip04/ku_prep_arena/download-%J.log

echo "============================================================"
echo " Download Thai LLM — $(date)"
echo "============================================================"

module load anaconda3/24.1.2
if conda activate ku_prep 2>/dev/null || source activate ku_prep 2>/dev/null; then
  echo "[INFO] ku_prep env"
fi

python - <<'PYEOF'
import os
from huggingface_hub import snapshot_download

token = os.environ.get("HF_TOKEN", "").strip()

# ── ลำดับความสำคัญ ─────────────────────────────────────────────
# 1. Typhoon2-8B  (ดีที่สุดภาษาไทย แต่ต้องการ token)
# 2. OpenThaiGPT-7B  (ไม่ต้อง auth, Thai fine-tuned LLaMA)

candidates = []

if token:
    candidates.append(("typhoon-ai/typhoon2.5-qwen3-4b", token))

# OpenThaiGPT ไม่ต้อง token
candidates.append(("openthaigpt/openthaigpt1.5-7b-instruct", None))

downloaded = None
for model_id, use_token in candidates:
    print(f"\nTrying: {model_id} ...")
    try:
        kwargs = dict(
            repo_id=model_id,
            ignore_patterns=["*.pt", "original/*"],
        )
        if use_token:
            kwargs["token"] = use_token
        path = snapshot_download(**kwargs)
        print(f"✅ Downloaded: {model_id}")
        print(f"   Path: {path}")
        os.system(f"du -sh '{path}'")
        downloaded = (model_id, path)
        break
    except Exception as e:
        print(f"   ❌ Failed: {e}")

if downloaded:
    model_id, path = downloaded
    print(f"\n{'='*60}")
    print(f"  Model ready: {model_id}")
    print(f"  Path: {path}")
    print(f"  ถัดไป: sbatch ai/scripts/slurm_finetune.sh")
    print(f"{'='*60}")

    # บันทึก model ที่ download ได้ เพื่อให้ notebook อ่านได้
    import json
    from pathlib import Path
    info_file = Path.home() / "ku_prep_arena/ai/models/downloaded_base_model.json"
    info_file.parent.mkdir(parents=True, exist_ok=True)
    info_file.write_text(json.dumps({"model_id": model_id, "path": path}, indent=2))
    print(f"  Saved model info → {info_file}")
else:
    print("\n❌ All downloads failed. Check internet connection or HF_TOKEN.")
    exit(1)
PYEOF

echo "Done: $(date)"
