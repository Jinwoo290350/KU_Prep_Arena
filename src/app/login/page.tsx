"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

const FLOATERS = [
  { emoji: "📚", x: 6,  y: 10, dur: 7,   delay: 0,   size: 26 },
  { emoji: "📖", x: 88, y: 15, dur: 8.5, delay: 1.2, size: 22 },
  { emoji: "✏️", x: 14, y: 72, dur: 6,   delay: 2,   size: 20 },
  { emoji: "🎓", x: 84, y: 65, dur: 9,   delay: 0.6, size: 28 },
  { emoji: "📝", x: 4,  y: 45, dur: 7,   delay: 1.8, size: 18 },
  { emoji: "💡", x: 92, y: 42, dur: 8,   delay: 2.8, size: 20 },
  { emoji: "📐", x: 48, y: 5,  dur: 10,  delay: 3.2, size: 18 },
  { emoji: "🔬", x: 24, y: 86, dur: 7,   delay: 0.4, size: 20 },
  { emoji: "📊", x: 74, y: 85, dur: 8,   delay: 1.6, size: 18 },
]

type Tab = "login" | "register"

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await signIn("credentials", { username, password, redirect: false })
    setLoading(false)
    if (res?.error) setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
    else router.push("/")
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (password !== confirm) { setError("รหัสผ่านไม่ตรงกัน"); return }
    setLoading(true)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setSuccess("ลงทะเบียนสำเร็จ! กำลังเข้าสู่ระบบ...")
    const lr = await signIn("credentials", { username, password, redirect: false })
    if (!lr?.error) router.push("/")
  }

  function switchTab(t: Tab) {
    setTab(t); setError(""); setSuccess(""); setPassword(""); setConfirm("")
  }

  return (
    <div className="h-screen overflow-hidden relative flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #f7f5ef 0%, #ecf4e4 55%, #f3f0e8 100%)" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        .lf { font-family: 'Outfit', sans-serif; }
        @keyframes float-book {
          0%,100% { transform: translateY(0) rotate(var(--r)); opacity: var(--op); }
          50%      { transform: translateY(-16px) rotate(calc(var(--r) + 3deg)); opacity: calc(var(--op)*1.4); }
        }
        @keyframes slide-up {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes fade-in { from{opacity:0} to{opacity:1} }
        @keyframes shake {
          0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)}
          40%{transform:translateX(5px)}   60%{transform:translateX(-3px)}
          80%{transform:translateX(3px)}
        }
        @keyframes ruled-scroll {
          from { background-position: 0 0; }
          to   { background-position: 0 40px; }
        }
        .ci  { animation: slide-up 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .ci2 { animation: slide-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.08s both; }
        .fade{ animation: fade-in 0.3s ease both; }
        .shake-it { animation: shake 0.35s ease; }
        .ku-input {
          width:100%; padding:9px 12px;
          border:1.5px solid #d0dcc6; border-radius:10px;
          background:#fff; font-size:13px;
          font-family:'Outfit',sans-serif; color:#1a2e10; outline:none;
          transition: border-color .15s, box-shadow .15s;
        }
        .ku-input::placeholder { color:#9aad86; }
        .ku-input:focus { border-color:#4a8c1c; box-shadow:0 0 0 3px rgba(74,140,28,.1); }
        .ku-btn {
          width:100%; padding:11px; border-radius:10px; border:none;
          background:linear-gradient(135deg,#3d7a18,#4a8c1c 60%,#5aaa22);
          color:#fff; font-family:'Outfit',sans-serif; font-size:14px; font-weight:700;
          cursor:pointer; transition:transform .15s,filter .15s,box-shadow .15s;
          box-shadow:0 3px 12px rgba(74,140,28,.35);
        }
        .ku-btn:hover:not(:disabled) { transform:translateY(-2px); filter:brightness(1.06); }
        .ku-btn:active:not(:disabled){ transform:scale(0.98); }
        .ku-btn:disabled { opacity:.6; cursor:not-allowed; }
        .tab-btn {
          flex:1; padding:8px; border:none; background:transparent;
          font-family:'Outfit',sans-serif; font-size:13px; font-weight:600;
          cursor:pointer; border-radius:8px; transition:background .2s,color .2s; color:#7a9a6a;
        }
        .tab-btn.active { background:#fff; color:#2d5a10; box-shadow:0 2px 6px rgba(0,0,0,.08); }
        .google-btn {
          width:100%; padding:9px; border-radius:10px;
          border:1.5px solid #d0dcc6; background:#fff;
          font-family:'Outfit',sans-serif; font-size:13px; font-weight:600; color:#2d3a26;
          cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;
          transition:border-color .15s,box-shadow .15s,background .15s;
        }
        .google-btn:hover { border-color:#4a8c1c; box-shadow:0 2px 8px rgba(74,140,28,.12); background:#f8fbf5; }
        .ruled {
          background-image: repeating-linear-gradient(transparent,transparent 39px,#c4d8b0 39px,#c4d8b0 40px);
          animation: ruled-scroll 8s linear infinite;
        }
      `}</style>

      {/* Ruled paper background */}
      <div className="absolute inset-0 ruled opacity-25 pointer-events-none" aria-hidden />

      {/* Floating emojis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {FLOATERS.map((f, i) => (
          <span key={i} className="absolute select-none"
            style={{
              left:`${f.x}%`, top:`${f.y}%`, fontSize:f.size,
              ["--r" as string]:`${-6+(i*5)%14}deg`,
              ["--op" as string]:"0.15",
              opacity:0.15,
              animation:`float-book ${f.dur}s ease-in-out infinite`,
              animationDelay:`${f.delay}s`,
            }}>
            {f.emoji}
          </span>
        ))}
      </div>

      {/* Card */}
      <div className="lf relative z-10 w-full max-w-sm mx-4">

        {/* Logo */}
        <div className="ci text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2.5 text-2xl"
            style={{ background:"linear-gradient(145deg,#3d7a18,#5aaa22)", boxShadow:"0 3px 12px rgba(74,140,28,.3)" }}>
            🌾
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color:"#1a2e10" }}>KU Prep Arena</h1>
          <p className="text-xs mt-1 font-medium" style={{ color:"#6a8a58" }}>แพลตฟอร์มเรียนอัจฉริยะสำหรับนิสิต มก.</p>
        </div>

        {/* Form card */}
        <div className="ci2 rounded-2xl px-6 py-5"
          style={{ background:"#fff", boxShadow:"0 6px 30px rgba(60,100,30,.11),0 2px 6px rgba(0,0,0,.05)", border:"1px solid #ddebd2" }}>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background:"#f0f6eb" }}>
            <button className={`tab-btn ${tab==="login"?"active":""}`} onClick={()=>switchTab("login")}>เข้าสู่ระบบ</button>
            <button className={`tab-btn ${tab==="register"?"active":""}`} onClick={()=>switchTab("register")}>ลงทะเบียน</button>
          </div>

          {/* Login */}
          {tab==="login" && (
            <form onSubmit={handleLogin} className="fade flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color:"#3a5a28" }}>ชื่อผู้ใช้</label>
                <input className="ku-input" type="text" placeholder="กรอกชื่อผู้ใช้"
                  value={username} onChange={e=>setUsername(e.target.value)} required autoComplete="username" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color:"#3a5a28" }}>รหัสผ่าน</label>
                <input className="ku-input" type="password" placeholder="กรอกรหัสผ่าน"
                  value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              {error && (
                <div className="shake-it text-xs font-semibold text-center py-1.5 px-3 rounded-lg"
                  style={{ background:"#fff0f0", color:"#c0392b", border:"1px solid #fad7d7" }}>{error}</div>
              )}
              <button type="submit" className="ku-btn mt-0.5" disabled={loading}>
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </button>
            </form>
          )}

          {/* Register */}
          {tab==="register" && (
            <form onSubmit={handleRegister} className="fade flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color:"#3a5a28" }}>ชื่อผู้ใช้</label>
                <input className="ku-input" type="text" placeholder="อย่างน้อย 3 ตัวอักษร"
                  value={username} onChange={e=>setUsername(e.target.value)} required autoComplete="username" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color:"#3a5a28" }}>รหัสผ่าน</label>
                <input className="ku-input" type="password" placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="new-password" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color:"#3a5a28" }}>ยืนยันรหัสผ่าน</label>
                <input className="ku-input" type="password" placeholder="กรอกรหัสผ่านอีกครั้ง"
                  value={confirm} onChange={e=>setConfirm(e.target.value)} required autoComplete="new-password" />
              </div>
              {error && (
                <div className="shake-it text-xs font-semibold text-center py-1.5 px-3 rounded-lg"
                  style={{ background:"#fff0f0", color:"#c0392b", border:"1px solid #fad7d7" }}>{error}</div>
              )}
              {success && (
                <div className="text-xs font-semibold text-center py-1.5 px-3 rounded-lg"
                  style={{ background:"#f0fbf0", color:"#2d7a2d", border:"1px solid #c8e6c8" }}>{success}</div>
              )}
              <button type="submit" className="ku-btn mt-0.5" disabled={loading}>
                {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชีใหม่"}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-3.5">
            <div className="h-px flex-1" style={{ background:"#e2edda" }} />
            <span className="text-[11px] font-medium" style={{ color:"#9aad86" }}>หรือ</span>
            <div className="h-px flex-1" style={{ background:"#e2edda" }} />
          </div>

          {/* Google */}
          <button className="google-btn" onClick={()=>signIn("google",{callbackUrl:"/"})}>
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="text-center text-[10px] mt-3 font-medium" style={{ color:"#8aa870" }}>
          มหาวิทยาลัยเกษตรศาสตร์ · KU AI Pioneers 2026
        </p>
      </div>
    </div>
  )
}
