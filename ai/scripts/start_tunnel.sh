#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  KU Prep Arena — Cloudflare Tunnel + Auto-update Vercel
#
#  รันบน cluster (ใน screen session):
#    screen -S tunnel
#    bash ~/ku_prep_arena/ai/scripts/start_tunnel.sh
#    Ctrl+A D  ← detach
#
#  ต้องการ:
#    VERCEL_TOKEN  — จาก https://vercel.com/account/tokens
#    VERCEL_PROJECT_ID — จาก vercel project settings
#    VERCEL_TEAM_ID    — ใส่ "" ถ้าเป็น personal account
# ════════════════════════════════════════════════════════════════

VERCEL_TOKEN="${VERCEL_TOKEN:-}"
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-}"
VERCEL_TEAM_ID="${VERCEL_TEAM_ID:-}"   # ว่างได้ถ้าเป็น personal account

VLLM_PORT=8000
LOG_FILE="/tmp/tunnel.log"

# ── Auto SSH port-forward if running on login node ────────────
# vLLM runs on compute node (dgx-XX), not on login node (br1)
# Detect by checking if vLLM is reachable on localhost first
if ! curl -s "http://localhost:$VLLM_PORT/health" &>/dev/null; then
  # Find the compute node running vLLM via squeue
  COMPUTE_NODE=$(squeue -u "$USER" -h -o "%N" 2>/dev/null | grep -v "^$" | head -1)
  if [ -n "$COMPUTE_NODE" ]; then
    echo "[INFO] vLLM อยู่บน $COMPUTE_NODE — ทำ SSH port forward..."
    ssh -N -L ${VLLM_PORT}:${COMPUTE_NODE}:${VLLM_PORT} localhost &
    SSH_FWD_PID=$!
    sleep 3
    echo "[OK] Port forward: localhost:$VLLM_PORT → $COMPUTE_NODE:$VLLM_PORT (PID $SSH_FWD_PID)"
  fi
fi

# ── Validate ──────────────────────────────────────────────────
if [ -z "$VERCEL_TOKEN" ] || [ -z "$VERCEL_PROJECT_ID" ]; then
  echo "[ERROR] ต้องตั้งค่า VERCEL_TOKEN และ VERCEL_PROJECT_ID"
  echo "  export VERCEL_TOKEN=your_token"
  echo "  export VERCEL_PROJECT_ID=your_project_id"
  exit 1
fi

# ── Wait for vLLM ─────────────────────────────────────────────
echo "[INFO] รอ vLLM พร้อมที่ port $VLLM_PORT..."
for i in $(seq 1 60); do
  if curl -s "http://localhost:$VLLM_PORT/health" &>/dev/null; then
    echo "[OK] vLLM พร้อมแล้ว"
    break
  fi
  sleep 5
done

# ── Start cloudflared ─────────────────────────────────────────
echo "[INFO] เริ่ม Cloudflare tunnel..."
rm -f "$LOG_FILE"
~/cloudflared tunnel --url "http://localhost:$VLLM_PORT" \
  --protocol http2 \
  --logfile "$LOG_FILE" \
  --loglevel info &
CF_PID=$!

# ── Wait for tunnel URL ───────────────────────────────────────
echo "[INFO] รอ tunnel URL..."
TUNNEL_URL=""
for i in $(seq 1 30); do
  TUNNEL_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | head -1)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  sleep 2
done

if [ -z "$TUNNEL_URL" ]; then
  echo "[ERROR] ไม่พบ tunnel URL ใน log หลังรอ 60 วินาที"
  kill $CF_PID 2>/dev/null
  exit 1
fi

echo "════════════════════════════════════════════════"
echo " Tunnel URL: $TUNNEL_URL"
echo " AI_BASE_URL: $TUNNEL_URL/v1"
echo "════════════════════════════════════════════════"

# ── Update Vercel env var ─────────────────────────────────────
update_vercel_env() {
  local key="AI_BASE_URL"
  local value="$TUNNEL_URL/v1"
  local team_param=""
  [ -n "$VERCEL_TEAM_ID" ] && team_param="&teamId=$VERCEL_TEAM_ID"

  # Delete existing env var (all targets)
  for target in production preview development; do
    ENV_ID=$(curl -s \
      "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env?${team_param}" \
      -H "Authorization: Bearer $VERCEL_TOKEN" | \
      python3 -c "
import sys, json
data = json.load(sys.stdin)
for e in data.get('envs', []):
    if e.get('key') == '$key' and '$target' in e.get('target', []):
        print(e['id'])
        break
" 2>/dev/null)

    if [ -n "$ENV_ID" ]; then
      curl -s -X DELETE \
        "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env/$ENV_ID?${team_param}" \
        -H "Authorization: Bearer $VERCEL_TOKEN" > /dev/null
    fi
  done

  # Create new env var for all targets
  curl -s -X POST \
    "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?upsert=true${team_param:+&}${team_param}" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$key\",\"value\":\"$value\",\"type\":\"plain\",\"target\":[\"production\",\"preview\",\"development\"]}" \
    > /dev/null

  echo "[OK] อัปเดต Vercel env: $key=$value"
}

# ── Trigger Vercel redeploy ───────────────────────────────────
trigger_redeploy() {
  local team_param=""
  [ -n "$VERCEL_TEAM_ID" ] && team_param="&teamId=$VERCEL_TEAM_ID"

  # Get latest deployment ID
  DEPLOY_ID=$(curl -s \
    "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&limit=1${team_param:+&}${team_param}" \
    -H "Authorization: Bearer $VERCEL_TOKEN" | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
deps = data.get('deployments', [])
if deps: print(deps[0]['uid'])
" 2>/dev/null)

  if [ -n "$DEPLOY_ID" ]; then
    # Redeploy without changes
    curl -s -X POST \
      "https://api.vercel.com/v13/deployments?forceNew=1${team_param:+&}${team_param}" \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"deploymentId\":\"$DEPLOY_ID\",\"name\":\"ku-prep-arena\"}" \
      > /dev/null
    echo "[OK] Vercel redeploy triggered"
  fi
}

update_vercel_env
trigger_redeploy

echo "[INFO] Tunnel ทำงานอยู่ (PID $CF_PID) กด Ctrl+C เพื่อหยุด"
wait $CF_PID
