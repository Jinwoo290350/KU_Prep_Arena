#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  KU Prep Arena — Jupyter Notebook (CPU job, ไม่ต้องใช้ GPU)
#
#  วิธีใช้:
#    1. บนเซิร์ฟ: sbatch ~/ku_prep_arena/ai/scripts/slurm_notebook.sh
#    2. ดู log:   tail -f ~/ku_prep_arena/jupyter-<JOB>.log
#    3. Copy SSH tunnel command จาก log แล้วรันบน local Mac
#    4. เปิด browser: http://localhost:<PORT>
#    5. ใส่ token ที่เห็นใน log
# ════════════════════════════════════════════════════════════════
#SBATCH --partition gpuq
#SBATCH --account=gm_aip04
#SBATCH --gres=gpu:1g.10gb:1
#SBATCH --cpus-per-task=4
#SBATCH --mem-per-cpu=8G
#SBATCH --time=0-8:00:00
#SBATCH --job-name=jupyter-ku-prep
#SBATCH --output=/home/aip04/ku_prep_arena/jupyter-%J.log

# ─── Tunneling info ────────────────────────────────────────────────────────
XDG_RUNTIME_DIR=""
port=8888
node=$(hostname -s)
user=$(whoami)
cluster="br1.paas.ku.ac.th"

echo "============================================================"
echo " KU Prep Arena — Jupyter Notebook"
echo "============================================================"
echo " Node: $node   Port: $port"
echo ""
echo " SSH TUNNEL (รันบน local Mac):"
echo " ssh -N -L ${port}:${node}:${port} ${user}@${cluster}"
echo ""
echo " เปิด Browser:"
echo " http://localhost:${port}"
echo " (ดู token ด้านล่าง)"
echo "============================================================"

# ─── Load modules ─────────────────────────────────────────────────────────
module load anaconda3/24.1.2
source activate ku_prep

# ─── ตรวจสอบและติดตั้ง kernel ────────────────────────────────────────────
python -m ipykernel install --user --name ku_prep --display-name "KU Prep (Python)" 2>/dev/null || true

# ─── Start Jupyter ────────────────────────────────────────────────────────
cd ~/ku_prep_arena
jupyter notebook --no-browser --port=${port} --ip=0.0.0.0
