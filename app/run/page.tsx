'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface WorldConfig {
  name: string;
  sky: string;
  path: string;
  accent: string;
  ground: string;
  grainBase: string;
  sun?: string;
  moon?: string;
  objects: string[];
}

const scenes: Record<string, WorldConfig> = {
  sahara: { 
    name: 'SAHARA_VR', sky: '#fef3c7', path: '#9a3412', accent: '#166534', ground: '#fb923c', grainBase: '#7c2d12', sun: '#fbbf24',
    objects: ['cactus', 'camel'] 
  },
  beach: { 
    name: 'OCEAN_DRIFT', sky: '#081428', path: '#1e293b', accent: '#065f46', ground: '#0f172a', grainBase: '#38bdf8', moon: '#f1f5f9',
    objects: ['palm', 'post'] 
  }
}

export default function RunPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [selected, setSelected] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [loadText, setLoadText] = useState('')
  const [km, setKm] = useState(0)
  const [points, setPoints] = useState(0)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const lastTs = useRef<number>(0)
  const kmRef = useRef(0)
  
  const state = useRef({
    entities: [] as { x: number, z: number, side: number, type: string }[],
    textureTiles: Array.from({ length: 1500 }, () => ({
      x: Math.random() * 2000 - 1000,
      zOffset: Math.random() * 10,
      side: Math.random() > 0.5 ? 1 : -1,
      shade: Math.random()
    }))
  })

  const bootSequence = [
    "> INITIALIZING OPTIC_OS v9.2...",
    "> CALIBRATING RETINAL PROJECTION...",
    "> ESTABLISHING NEURAL LINK...",
    "> LOADING BIOME DATASETS...",
    "> CONNECTION STABLE. STARTING..."
  ]

  function toggleScene(id: string) {
    setSelected(prev => (prev === id ? null : id))
  }

  async function startRun() {
    if (!selected) return alert('Select a world first')
    setInitializing(true)
    for (let i = 0; i < bootSequence.length; i++) {
      setLoadText(bootSequence[i]); await new Promise(r => setTimeout(r, 600))
    }
    setInitializing(false); setRunning(true); setKm(0); kmRef.current = 0; state.current.entities = []; lastTs.current = 0
  }

  async function stopRun() {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    setRunning(false)
    
    const finalKm = kmRef.current
    const earned = Math.round(finalKm * 80)
    
    console.log("Stopping run... KM:", finalKm, "Points to add:", earned)
  
    // 1. Get User Session again to be 100% sure we are connected
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
  
    if (!user) {
      console.error("No active session found during stopRun")
      return router.push('/login')
    }
  
    // 2. Direct Update (Avoids the "Fetch-then-Update" race condition)
    // This uses Supabase's increment logic so we don't need to fetch first
    const { error: updateError } = await supabase.rpc('increment_stats', {
      user_id: user.id,
      add_points: earned,
      add_km: finalKm,
      add_session: 1
    })
  
    // IF YOU DON'T HAVE AN RPC SETUP, USE THIS INSTEAD:
    if (updateError) {
      console.log("RPC not found, falling back to standard update...")
      
      // First, get current values
      const { data: profile } = await supabase
        .from('profiles')
        .select('points, total_sessions, total_km')
        .eq('id', user.id)
        .single()
  
      const { error: fallbackError } = await supabase
        .from('profiles')
        .update({
          points: (profile?.points || 0) + earned,
          total_sessions: (profile?.total_sessions || 0) + 1,
          total_km: parseFloat(((profile?.total_km || 0) + finalKm).toFixed(2)),
          last_run_at: new Date().toISOString()
        })
        .eq('id', user.id)
  
      if (fallbackError) console.error("Update failed:", fallbackError.message)
    }
  
    // 3. Log the session history
    await supabase.from('run_sessions').insert({
      user_id: user.id,
      km: parseFloat(finalKm.toFixed(2)),
      points_earned: earned,
      scene: scenes[selected || 'sahara'].name
    })
  
    console.log("Database update sequence finished.")
    router.push('/dashboard')
  }

  const drawAsset = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, type: string, world: WorldConfig) => {
    ctx.globalAlpha = Math.min(s * 5, 1)
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x, y, 60 * s, 15 * s, 0, 0, Math.PI * 2); ctx.fill()

    if (type === 'cactus') {
      ctx.fillStyle = world.accent; ctx.fillRect(x - 12 * s, y - 180 * s, 24 * s, 180 * s)
      ctx.fillRect(x - 45 * s, y - 130 * s, 35 * s, 15 * s); ctx.fillRect(x - 45 * s, y - 170 * s, 15 * s, 50 * s)
    } else if (type === 'camel') {
      ctx.fillStyle = '#92400e'; ctx.fillRect(x - 50 * s, y - 70 * s, 100 * s, 45 * s)
      ctx.beginPath(); ctx.arc(x - 18 * s, y - 70 * s, 28 * s, Math.PI, 0); ctx.fill()
      ctx.beginPath(); ctx.arc(x + 18 * s, y - 70 * s, 28 * s, Math.PI, 0); ctx.fill()
      ctx.fillRect(x + 45 * s, y - 120 * s, 15 * s, 80 * s); ctx.fillRect(x + 45 * s, y - 130 * s, 40 * s, 20 * s)
      ctx.fillRect(x - 40 * s, y - 25 * s, 12 * s, 25 * s); ctx.fillRect(x + 28 * s, y - 25 * s, 12 * s, 25 * s)
    } else if (type === 'palm') {
      ctx.fillStyle = '#451a03'; ctx.fillRect(x - 8 * s, y - 250 * s, 16 * s, 250 * s)
      ctx.fillStyle = world.accent; 
      for(let i=0; i<5; i++) {
        ctx.beginPath(); ctx.ellipse(x + (Math.cos(i)*40*s), y - 250*s + (Math.sin(i)*20*s), 60*s, 15*s, i, 0, Math.PI*2); ctx.fill()
      }
    } else if (type === 'post') {
      ctx.fillStyle = '#1e293b'; ctx.fillRect(x - 4 * s, y - 150 * s, 8 * s, 150 * s)
      ctx.fillStyle = '#06b6d4'; ctx.beginPath(); ctx.arc(x, y - 155 * s, 6 * s, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  function drawScene() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false }); if (!ctx) return
    const W = canvas.width, H = canvas.height
    const world = scenes[selected || 'sahara']
    const horizonY = H * 0.5
    const s = state.current

    ctx.fillStyle = world.sky; ctx.fillRect(0, 0, W, horizonY)
    ctx.fillStyle = world.ground; ctx.fillRect(0, horizonY, W, H - horizonY)
    
    if (world.sun) {
      ctx.fillStyle = world.sun; ctx.beginPath(); ctx.arc(W * 0.85, H * 0.2, 45, 0, Math.PI * 2); ctx.fill()
    }
    if (world.moon) {
      ctx.fillStyle = world.moon; ctx.beginPath(); ctx.arc(W * 0.15, H * 0.15, 30, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(56, 189, 248, 0.1)'; ctx.fillRect(W * 0.1, horizonY, 80, H - horizonY)
    }

    s.textureTiles.forEach(g => {
      const z = ((g.zOffset - (kmRef.current * 15)) % 10 + 10) % 10 / 4
      if (z > 0.01 && z < 2.5) {
        const scale = z * z
        const tx = W/2 + ((750 + g.x) * scale * g.side)
        const ty = horizonY + (450 * scale)
        if (ty > horizonY && ty < H) {
          ctx.fillStyle = world.grainBase; ctx.globalAlpha = g.shade * 0.4
          ctx.fillRect(tx, ty, 6 * scale, 6 * scale)
        }
      }
    })
    ctx.globalAlpha = 1
    ctx.fillStyle = world.path; ctx.beginPath(); ctx.moveTo(W/2 - 10, horizonY); ctx.lineTo(W/2 + 10, horizonY); ctx.lineTo(W/2 + 420, H); ctx.lineTo(W/2 - 420, H); ctx.fill()
    ctx.strokeStyle = 'white'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(W/2 - 10, horizonY); ctx.lineTo(W/2 - 420, H); ctx.stroke(); ctx.moveTo(W/2 + 10, horizonY); ctx.lineTo(W/2 + 420, H); ctx.stroke()
    ctx.setLineDash([50, 70]); ctx.lineDashOffset = -(kmRef.current * 800); ctx.beginPath(); ctx.moveTo(W/2, horizonY); ctx.lineTo(W/2, H); ctx.stroke(); ctx.setLineDash([])

    s.entities.forEach(e => {
      const pScale = e.z * e.z
      const x = W/2 + (e.x * pScale * e.side); const y = horizonY + (450 * pScale)
      if (e.z < 2.6) drawAsset(ctx, x, y, pScale, e.type, world)
    })
  }

  useEffect(() => {
    if (!running) return
    function loop(ts: number) {
      if (!lastTs.current) lastTs.current = ts
      const dt = (ts - lastTs.current) / 1000; lastTs.current = ts
      kmRef.current += dt * 0.005; setKm(kmRef.current); setPoints(Math.round(kmRef.current * 80))
      
      const currentWorld = scenes[selected || 'sahara']
      if (Math.random() < 0.035) {
        state.current.entities.push({ 
          x: 650, 
          side: Math.random() > 0.5 ? 1 : -1, 
          z: 0.01, 
          type: currentWorld.objects[Math.floor(Math.random() * currentWorld.objects.length)] 
        })
      }
      state.current.entities.forEach(e => e.z += dt * 0.85); state.current.entities = state.current.entities.filter(e => e.z < 2.6)
      drawScene(); animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [running, selected])

  if (initializing) return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center font-mono p-12">
      <div className="w-full max-w-xs h-1 bg-white/10 rounded-full mb-8 overflow-hidden"><div className="h-full bg-cyan-400 animate-[loading_4s_linear_infinite]" style={{ width: '60%' }} /></div>
      <div className="text-cyan-400 text-[11px] tracking-[0.4em] font-black animate-pulse text-center leading-loose">{loadText}</div>
    </div>
  )

  if (running) return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4 overflow-hidden select-none cursor-none font-mono">
       <div className="relative w-full max-w-6xl aspect-[16/10] rounded-[140px] border-[18px] border-zinc-900 bg-black shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden flex items-center justify-center">
          <div className="relative w-[98%] h-[96%] rounded-[120px] overflow-hidden">
            <canvas ref={canvasRef} width={1280} height={800} className="w-full h-full scale-105" />
            <div className="absolute inset-0 pointer-events-none p-16 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_red]" />
                    <span className="text-white text-[12px] font-black tracking-[0.2em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">REC // NEURAL_LINK</span>
                  </div>
                  <div className="text-cyan-400 font-black text-[10px] uppercase tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">FPS: 60 // LATENCY: 12ms // STABLE</div>
                </div>
                <div className="text-right">
                  <div className="text-white text-[12px] font-black tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">NODE: {selected?.toUpperCase()}</div>
                  <div className="text-white/80 font-black text-[10px] uppercase tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">{new Date().toLocaleTimeString()}</div>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div className="text-white font-black text-[10px] leading-tight tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">AZIMUTH: 182.4° <br/> ALTITUDE: 0.042m <br/> SYNC_STATUS: ACTIVE</div>
                <div className="text-right space-y-3">
                  <div className="text-cyan-400 text-[12px] font-black tracking-[0.3em] uppercase drop-shadow-[0_0_100px_rgba(34,211,238,0.8)]">SENSES: CONNECTED</div>
                  <div className="w-40 h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.8)]"><div className="h-full bg-cyan-400 shadow-[0_0_12px_#22d3ee] w-[88%]" /></div>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_45%,rgba(0,0,0,0.9)_100%)]" />
          </div>
          <div className="absolute top-0 bottom-0 left-1/2 w-32 -translate-x-1/2 bg-gradient-to-r from-black via-zinc-950 to-black opacity-40 blur-xl pointer-events-none" />
        </div>
      <div className="mt-8 grid grid-cols-3 gap-12 w-full max-w-xl">
        <div className="text-center"><div className="text-white text-5xl font-black italic drop-shadow-lg">{km.toFixed(2)}</div><div className="text-[10px] text-white/30 tracking-widest uppercase mt-1 font-bold">KILOMETERS</div></div>
        <div className="text-center"><div className="text-cyan-400 text-5xl font-black italic drop-shadow-lg">{points}</div><div className="text-[10px] text-cyan-400/30 tracking-widest uppercase mt-1 font-bold">POINTS_EARNED</div></div>
        <div className="text-center"><div className="text-white text-5xl font-black italic drop-shadow-lg">5:30</div><div className="text-[10px] text-white/30 tracking-widest uppercase mt-1 font-bold">AVG_PACE</div></div>
      </div>
      <button onClick={stopRun} className="mt-12 text-white/30 hover:text-white text-[10px] font-black tracking-[0.6em] transition-all uppercase px-10 py-5 border border-white/5 hover:border-white/20 rounded-full bg-zinc-900/50">Terminate Neural Link</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#050505] font-mono text-white p-8 relative">
      {/* BACK BUTTON (CUSTOM SVG) */}
      <button 
        onClick={() => router.push('/dashboard')}
        className="absolute top-8 left-8 p-3 rounded-2xl bg-zinc-900 border border-white/5 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all group"
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="w-6 h-6 text-white/50 group-hover:text-cyan-400"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="max-w-md mx-auto space-y-12">
        <div className="text-center space-y-2">
          <div className="text-cyan-500 text-[10px] font-black tracking-[0.4em] uppercase">Select Projection</div>
          <h1 className="text-6xl font-black italic tracking-tighter">SPATIAL</h1>
        </div>
        <div className="grid gap-4">
          {Object.entries(scenes).map(([id, world]) => (
            <button key={id} onClick={() => toggleScene(id)} className={`p-10 rounded-[48px] border text-left transition-all ${selected === id ? 'bg-zinc-800 border-cyan-500/50 shadow-[0_0_40px_rgba(34,211,238,0.15)]' : 'bg-zinc-900 border-white/5'}`}>
              <div className="text-[10px] text-white/20 mb-1 tracking-widest uppercase font-black">Node_0{id}</div>
              <div className="text-2xl font-black italic text-white/90">{world.name}</div>
            </button>
          ))}
        </div>
        <button onClick={startRun} disabled={!selected} className={`w-full py-7 rounded-[40px] font-black italic tracking-[0.2em] transition-all ${selected ? 'bg-white text-black shadow-2xl scale-105' : 'bg-zinc-900 text-white/20 border border-white/5 opacity-50'}`}>
          {selected ? 'INITIALIZE LINK' : 'SELECT BIOME'}
        </button>
      </div>
    </div>
  )
}