'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const scenes = [
  { id: 'mountain', name: 'Mountain Trail', desc: 'Alpine peaks, cool forest air', emoji: '🏔️', colors: { sky: ['#1a6fa8', '#4ab0e8'], ground: ['#4a7a3a', '#2d5a22'], road: '#8a7a5a' } },
  { id: 'ocean', name: 'Ocean Moonrun', desc: 'Midnight beach, moonlit waves', emoji: '🌊', colors: { sky: ['#0d2a5e', '#1a4fa8'], ground: ['#1a5ea0', '#0d3d6e'], road: '#2a4a7a' } },
  { id: 'sahara', name: 'Sahara Dusk', desc: 'Golden dunes, setting sun', emoji: '🌅', colors: { sky: ['#e8c56a', '#f2a83b'], ground: ['#c8a050', '#987020'], road: '#b89040' } },
]

export default function RunPage() {
  const router = useRouter()
  const supabase = createClient()
  const [selected, setSelected] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [km, setKm] = useState(0)
  const [points, setPoints] = useState(0)
  const [currentScene, setCurrentScene] = useState(0)
  const [roadOffset, setRoadOffset] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const lastTs = useRef<number>(0)
  const sceneTimer = useRef(0)
  const kmRef = useRef(0)
  const trees = useRef<{ x: number; z: number }[]>([])

  function toggleScene(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : prev.length < 3 ? [...prev, id] : prev
    )
  }

  function startRun() {
    setRunning(true)
    setKm(0)
    kmRef.current = 0
    trees.current = []
    sceneTimer.current = 0
    setCurrentScene(0)
    lastTs.current = 0
  }

  async function stopRun() {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    setRunning(false)
    const earned = Math.round(kmRef.current * 80)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('points,total_km,total_sessions,streak').eq('id', user.id).single()
      if (profile) {
        await supabase.from('profiles').update({
          points: profile.points + earned,
          total_km: parseFloat((profile.total_km + kmRef.current).toFixed(2)),
          total_sessions: profile.total_sessions + 1,
          streak: profile.streak + 1,
        }).eq('id', user.id)
        await supabase.from('run_sessions').insert({
          user_id: user.id,
          km: parseFloat(kmRef.current.toFixed(2)),
          points_earned: earned,
          scene: scenes[currentScene]?.name || 'Unknown',
          duration_seconds: Math.round(kmRef.current * 330),
        })
      }
    }
    router.push('/dashboard')
  }

  useEffect(() => {
    if (!running) return
    function loop(ts: number) {
      if (!lastTs.current) lastTs.current = ts
      const dt = (ts - lastTs.current) / 1000
      lastTs.current = ts
      kmRef.current += dt * 0.004
      setKm(parseFloat(kmRef.current.toFixed(2)))
      setPoints(Math.round(kmRef.current * 80))
      sceneTimer.current += dt
      if (sceneTimer.current > 8 && selected.length > 1) {
        setCurrentScene(prev => (prev + 1) % selected.length)
        sceneTimer.current = 0
      }
      setRoadOffset(prev => (prev + dt * 120) % 80)
      if (Math.random() < 0.03) trees.current.push({ x: Math.random() * 400, z: 0 })
      trees.current = trees.current.filter(t => t.z < 1.5)
      trees.current.forEach(t => (t.z += dt * 0.5))
      drawScene()
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [running, selected])

  function drawScene() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height
    const scIdx = scenes.findIndex(s => s.id === selected[currentScene % selected.length])
    const scene = scenes[Math.max(0, scIdx)]
    const horizY = H * 0.42

    ctx.clearRect(0, 0, W, H)

    if (scene.id === 'mountain') {
      // Sky with aurora effect
      const skyG = ctx.createLinearGradient(0, 0, 0, horizY)
      skyG.addColorStop(0, '#0a1628')
      skyG.addColorStop(0.4, '#0d3060')
      skyG.addColorStop(1, '#1a6fa8')
      ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, horizY)

      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      for (let i = 0; i < 80; i++) {
        const sx = (i * 137.5) % W
        const sy = (i * 97.3) % (horizY * 0.8)
        const sr = i % 3 === 0 ? 1.2 : 0.6
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill()
      }

      // Aurora
      const auroraG = ctx.createLinearGradient(0, 0, W, 0)
      auroraG.addColorStop(0, 'rgba(0,255,150,0)')
      auroraG.addColorStop(0.3, 'rgba(0,255,150,0.08)')
      auroraG.addColorStop(0.5, 'rgba(100,200,255,0.12)')
      auroraG.addColorStop(0.7, 'rgba(150,100,255,0.08)')
      auroraG.addColorStop(1, 'rgba(150,100,255,0)')
      ctx.fillStyle = auroraG
      ctx.fillRect(0, horizY * 0.1, W, horizY * 0.5)

      // Far mountains (dark blue)
      ctx.fillStyle = '#0d2a4a'
      ctx.beginPath(); ctx.moveTo(0, horizY)
      ctx.lineTo(50, horizY - 80); ctx.lineTo(130, horizY - 40)
      ctx.lineTo(200, horizY - 110); ctx.lineTo(280, horizY - 60)
      ctx.lineTo(350, horizY - 130); ctx.lineTo(420, horizY - 70)
      ctx.lineTo(500, horizY - 120); ctx.lineTo(580, horizY - 55)
      ctx.lineTo(650, horizY - 100); ctx.lineTo(720, horizY - 45)
      ctx.lineTo(800, horizY - 90); ctx.lineTo(W, horizY)
      ctx.closePath(); ctx.fill()

      // Mid mountains (dark teal)
      ctx.fillStyle = '#0f3d2a'
      ctx.beginPath(); ctx.moveTo(0, horizY)
      ctx.lineTo(80, horizY - 55); ctx.lineTo(160, horizY - 25)
      ctx.lineTo(240, horizY - 75); ctx.lineTo(320, horizY - 35)
      ctx.lineTo(400, horizY - 85); ctx.lineTo(480, horizY - 30)
      ctx.lineTo(560, horizY - 65); ctx.lineTo(640, horizY - 20)
      ctx.lineTo(720, horizY - 60); ctx.lineTo(W, horizY - 30)
      ctx.lineTo(W, horizY)
      ctx.closePath(); ctx.fill()

      // Snow caps
      ctx.fillStyle = 'rgba(200,230,255,0.7)'
      ;[[200, horizY - 110, 30], [350, horizY - 130, 35], [500, horizY - 120, 28]].forEach(([px, py, size]) => {
        ctx.beginPath()
        ctx.moveTo(px as number, py as number)
        ctx.lineTo((px as number) - (size as number), (py as number) + (size as number) * 0.6)
        ctx.lineTo((px as number) + (size as number), (py as number) + (size as number) * 0.6)
        ctx.closePath(); ctx.fill()
      })

      // Ground
      const gG = ctx.createLinearGradient(0, horizY, 0, H)
      gG.addColorStop(0, '#1a3a20')
      gG.addColorStop(0.4, '#2d5a28')
      gG.addColorStop(1, '#1a2e18')
      ctx.fillStyle = gG; ctx.fillRect(0, horizY, W, H - horizY)

      // Ground texture lines
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1
      for (let i = 0; i < 6; i++) {
        const y = horizY + (H - horizY) * (i / 6)
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

    } else if (scene.id === 'ocean') {
      // Night sky
      const skyG = ctx.createLinearGradient(0, 0, 0, horizY)
      skyG.addColorStop(0, '#020814')
      skyG.addColorStop(0.6, '#050f2a')
      skyG.addColorStop(1, '#0a1f4a')
      ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, horizY)

      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      for (let i = 0; i < 120; i++) {
        const sx = (i * 173.1) % W
        const sy = (i * 89.7) % (horizY * 0.85)
        const sr = i % 5 === 0 ? 1.5 : 0.7
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill()
      }

      // Moon
      const moonX = W * 0.78, moonY = horizY * 0.25
      const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 80)
      moonGlow.addColorStop(0, 'rgba(255,245,180,0.15)')
      moonGlow.addColorStop(1, 'rgba(255,245,180,0)')
      ctx.fillStyle = moonGlow; ctx.beginPath(); ctx.arc(moonX, moonY, 80, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fffacd'; ctx.beginPath(); ctx.arc(moonX, moonY, 22, 0, Math.PI * 2); ctx.fill()

      // Moon reflection on water
      const refG = ctx.createLinearGradient(W * 0.7, horizY, W * 0.85, H)
      refG.addColorStop(0, 'rgba(255,245,180,0.25)')
      refG.addColorStop(1, 'rgba(255,245,180,0)')
      ctx.fillStyle = refG
      ctx.beginPath()
      ctx.moveTo(W * 0.74, horizY); ctx.lineTo(W * 0.82, horizY)
      ctx.lineTo(W * 0.95, H); ctx.lineTo(W * 0.62, H)
      ctx.closePath(); ctx.fill()

      // Ocean layers
      ;['#0a2a4a', '#0d3560', '#0f4070', '#124a80'].forEach((color, i) => {
        const y = horizY + (H - horizY) * (i / 4)
        const h2 = (H - horizY) / 4 + 2
        ctx.fillStyle = color; ctx.fillRect(0, y, W, h2)
      })

      // Waves
      for (let w = 0; w < 5; w++) {
        const wy = horizY + (H - horizY) * ((w + (roadOffset / 80)) % 5) / 5
        const alpha = 0.1 + w * 0.05
        ctx.strokeStyle = `rgba(100,180,255,${alpha})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        for (let x = 0; x < W; x += 4) {
          const wave = Math.sin((x / 60) + w) * 3
          if (x === 0) ctx.moveTo(x, wy + wave)
          else ctx.lineTo(x, wy + wave)
        }
        ctx.stroke()
      }

    } else if (scene.id === 'sahara') {
      // Sunset sky
      const skyG = ctx.createLinearGradient(0, 0, 0, horizY)
      skyG.addColorStop(0, '#0a0520')
      skyG.addColorStop(0.3, '#2d0a40')
      skyG.addColorStop(0.6, '#8b1a1a')
      skyG.addColorStop(0.8, '#d4400a')
      skyG.addColorStop(1, '#f07020')
      ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, horizY)

      // Stars (top portion only)
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      for (let i = 0; i < 60; i++) {
        const sx = (i * 143.7) % W
        const sy = (i * 67.3) % (horizY * 0.4)
        ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI * 2); ctx.fill()
      }

      // Sun
      const sunX = W * 0.22, sunY = horizY * 0.85
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 120)
      sunGlow.addColorStop(0, 'rgba(255,200,50,0.4)')
      sunGlow.addColorStop(0.4, 'rgba(255,120,20,0.2)')
      sunGlow.addColorStop(1, 'rgba(255,80,0,0)')
      ctx.fillStyle = sunGlow; ctx.beginPath(); ctx.arc(sunX, sunY, 120, 0, Math.PI * 2); ctx.fill()
      const sunCore = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 28)
      sunCore.addColorStop(0, '#fff5aa')
      sunCore.addColorStop(0.5, '#ffb830')
      sunCore.addColorStop(1, '#ff6010')
      ctx.fillStyle = sunCore; ctx.beginPath(); ctx.arc(sunX, sunY, 28, 0, Math.PI * 2); ctx.fill()

      // Dunes far
      ctx.fillStyle = '#8b4a10'
      ctx.beginPath(); ctx.moveTo(0, horizY)
      ctx.quadraticCurveTo(100, horizY - 45, 200, horizY - 20)
      ctx.quadraticCurveTo(320, horizY - 60, 440, horizY - 25)
      ctx.quadraticCurveTo(580, horizY - 55, 700, horizY - 15)
      ctx.quadraticCurveTo(780, horizY - 35, W, horizY)
      ctx.lineTo(W, horizY); ctx.lineTo(0, horizY); ctx.closePath(); ctx.fill()

      // Dunes near
      const duneG = ctx.createLinearGradient(0, horizY, 0, H)
      duneG.addColorStop(0, '#c87830')
      duneG.addColorStop(0.3, '#d4903a')
      duneG.addColorStop(0.7, '#b86820')
      duneG.addColorStop(1, '#8b4a10')
      ctx.fillStyle = duneG; ctx.fillRect(0, horizY, W, H - horizY)

      // Dune ripples
      ctx.strokeStyle = 'rgba(180,100,20,0.3)'; ctx.lineWidth = 1
      for (let r = 0; r < 8; r++) {
        const ry = horizY + (H - horizY) * (r / 8) + 10
        ctx.beginPath()
        for (let x = 0; x < W; x += 3) {
          const wave = Math.sin((x / 40) + r * 0.7) * 2
          if (x === 0) ctx.moveTo(x, ry + wave)
          else ctx.lineTo(x, ry + wave)
        }
        ctx.stroke()
      }
    }

    // VR lens distortion vignette
    const vignette = ctx.createRadialGradient(W/2, H/2, H * 0.3, W/2, H/2, H * 0.85)
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,0.75)')
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H)

    // Road
    const vp = { x: W / 2, y: horizY }
    const roadG = ctx.createLinearGradient(0, horizY, 0, H)
    roadG.addColorStop(0, scene.id === 'ocean' ? '#1a2a4a' : scene.id === 'sahara' ? '#7a5a30' : '#4a4a3a')
    roadG.addColorStop(1, scene.id === 'ocean' ? '#0d1a30' : scene.id === 'sahara' ? '#5a3a18' : '#2a2a1a')
    ctx.fillStyle = roadG
    ctx.beginPath()
    ctx.moveTo(vp.x - 6, vp.y); ctx.lineTo(vp.x + 6, vp.y)
    ctx.lineTo(vp.x + 130, H); ctx.lineTo(vp.x - 130, H)
    ctx.closePath(); ctx.fill()

    // Road edge lines
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(vp.x - 6, vp.y); ctx.lineTo(vp.x - 130, H); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(vp.x + 6, vp.y); ctx.lineTo(vp.x + 130, H); ctx.stroke()

    // Road dashes
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    for (let i = 0; i < 12; i++) {
      const t = ((i / 12) + (roadOffset / 80)) % 1
      const y = horizY + (H - horizY) * t
      const w2 = 5 * t
      ctx.lineWidth = Math.max(1, t * 3)
      ctx.beginPath(); ctx.moveTo(vp.x - w2, y); ctx.lineTo(vp.x + w2, y); ctx.stroke()
    }

    // Trees / cacti / posts along road
    trees.current.forEach(tree => {
      const t = tree.z
      const scale = 0.1 + t * 0.9
      const baseY = horizY + (H - horizY) * t
      const side = tree.x < 200 ? -1 : 1
      const tx = vp.x + side * (130 * t + 15)

      if (scene.id === 'mountain') {
        // Pine trees
        const h2 = 70 * scale
        const trunkW = 5 * scale
        ctx.fillStyle = '#3d2b1f'
        ctx.fillRect(tx - trunkW / 2, baseY - h2 * 0.35, trunkW, h2 * 0.35)
        ;['#1a5c1a', '#226622', '#2d7a2d'].forEach((color, layer) => {
          ctx.fillStyle = color
          const lh = h2 * (0.5 + layer * 0.2)
          const lw = (28 - layer * 6) * scale
          ctx.beginPath()
          ctx.moveTo(tx, baseY - h2 - layer * h2 * 0.1)
          ctx.lineTo(tx - lw, baseY - lh + layer * 10 * scale)
          ctx.lineTo(tx + lw, baseY - lh + layer * 10 * scale)
          ctx.closePath(); ctx.fill()
        })
      } else if (scene.id === 'ocean') {
        // Palm trees
        const h2 = 65 * scale
        ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 4 * scale
        ctx.beginPath()
        ctx.moveTo(tx, baseY)
        ctx.quadraticCurveTo(tx + side * 8 * scale, baseY - h2 * 0.5, tx + side * 4 * scale, baseY - h2)
        ctx.stroke()
        // Palm leaves
        ;[[-30, -15], [0, -25], [30, -15], [-20, -5], [20, -5]].forEach(([lx, ly]) => {
          ctx.strokeStyle = '#2d7a2d'; ctx.lineWidth = 2.5 * scale
          ctx.beginPath()
          ctx.moveTo(tx + side * 4 * scale, baseY - h2)
          ctx.quadraticCurveTo(
            tx + side * 4 * scale + lx * scale * 0.5,
            baseY - h2 + ly * scale * 0.5,
            tx + side * 4 * scale + lx * scale,
            baseY - h2 + ly * scale
          )
          ctx.stroke()
        })
      } else {
        // Cacti
        const h2 = 50 * scale
        ctx.fillStyle = '#2d6b20'
        ctx.fillRect(tx - 4 * scale, baseY - h2, 8 * scale, h2)
        ctx.fillRect(tx - 16 * scale, baseY - h2 * 0.6, 12 * scale, 5 * scale)
        ctx.fillRect(tx + 4 * scale, baseY - h2 * 0.7, 12 * scale, 5 * scale)
        ctx.fillRect(tx - 16 * scale, baseY - h2 * 0.6, 5 * scale, 16 * scale)
        ctx.fillRect(tx + 11 * scale, baseY - h2 * 0.7, 5 * scale, 14 * scale)
      }
    })

    // VR grid overlay (subtle)
    ctx.strokeStyle = 'rgba(100,200,255,0.04)'; ctx.lineWidth = 0.5
    for (let gx = 0; gx < W; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke()
    }
    for (let gy = 0; gy < H; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke()
    }

    // HUD scanline effect
    ctx.fillStyle = 'rgba(0,0,0,0.03)'
    for (let sl = 0; sl < H; sl += 3) {
      ctx.fillRect(0, sl, W, 1)
    }
  }

  if (running) return (
    <div className="min-h-screen flex flex-col" style={{ background: '#000' }}>
      <canvas ref={canvasRef} width={800} height={450} className="w-full" style={{ maxHeight: '60vh' }} />
      <div className="flex-1 px-6 py-4" style={{ background: '#0f0c29' }}>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[{ label: 'KM', value: km.toFixed(2) }, { label: 'PTS EARNED', value: points }, { label: 'PACE', value: '5:30' }].map((s, i) => (
            <div key={i} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
              <div className="text-white text-xl font-semibold">{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Now in: {scenes.find(s => s.id === selected[currentScene % selected.length])?.name}
        </p>
        <button onClick={stopRun} className="w-full py-3 rounded-xl font-medium text-white" style={{ background: '#e74c3c' }}>
          Stop Run & Save
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#0f0c29' }}>
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button onClick={() => router.push('/dashboard')} style={{ color: 'rgba(255,255,255,0.5)' }}>← Back</button>
        <span className="text-white font-semibold">Pick your scene</span>
      </div>
      <div className="px-6 py-4">
        <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Choose up to 3 VR worlds</p>
        <div className="flex flex-col gap-3 mb-6">
          {scenes.map(scene => {
            const isPicked = selected.includes(scene.id)
            return (
              <div
                key={scene.id}
                onClick={() => toggleScene(scene.id)}
                className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all"
                style={{
                  background: isPicked ? 'rgba(108,92,231,0.2)' : 'rgba(255,255,255,0.04)',
                  border: isPicked ? '2px solid #6c5ce7' : '0.5px solid rgba(255,255,255,0.1)'
                }}
              >
                <div className="text-4xl">{scene.emoji}</div>
                <div className="flex-1">
                  <div className="text-white font-medium">{scene.name}</div>
                  <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{scene.desc}</div>
                </div>
                {isPicked && <div className="text-sm px-3 py-1 rounded-full" style={{ background: '#6c5ce7', color: '#fff' }}>✓</div>}
              </div>
            )
          })}
        </div>
        <button
          onClick={startRun}
          disabled={selected.length === 0}
          className="w-full py-4 rounded-2xl font-semibold text-white transition-all"
          style={{ background: selected.length > 0 ? '#6c5ce7' : 'rgba(255,255,255,0.1)', opacity: selected.length > 0 ? 1 : 0.5 }}
        >
          {selected.length > 0 ? `Start VR Run · ${selected.length} scene${selected.length > 1 ? 's' : ''}` : 'Select a scene first'}
        </button>
      </div>
    </div>
  )
}