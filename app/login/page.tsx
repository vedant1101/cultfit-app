'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('test@cultfit.com')
  const [password, setPassword] = useState('Test@1234')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [time, setTime] = useState(new Date())
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [router, supabase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = []
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.7 + 0.2,
      })
    }

    let frame = 0
    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Grid
      ctx.strokeStyle = 'rgba(0,245,255,0.025)'
      ctx.lineWidth = 0.5
      for (let x = 0; x < canvas.width; x += 45) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 45) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }

      // Horizon glow
      const horizonG = ctx.createLinearGradient(0, canvas.height * 0.55, 0, canvas.height * 0.75)
      horizonG.addColorStop(0, 'rgba(108,92,231,0.12)')
      horizonG.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = horizonG
      ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5)

      // Perspective grid lines
      const vx = canvas.width / 2, vy = canvas.height * 0.6
      ctx.strokeStyle = 'rgba(108,92,231,0.08)'
      ctx.lineWidth = 0.8
      for (let i = -10; i <= 10; i++) {
        ctx.beginPath()
        ctx.moveTo(vx + i * 80, canvas.height)
        ctx.lineTo(vx, vy)
        ctx.stroke()
      }
      for (let j = 0; j < 8; j++) {
        const t = (j / 8 + (frame * 0.002) % 1)
        const y = vy + (canvas.height - vy) * t
        const w = (canvas.width * 0.9) * t
        ctx.beginPath()
        ctx.moveTo(vx - w / 2, y)
        ctx.lineTo(vx + w / 2, y)
        ctx.stroke()
      }

      // Particles
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,245,255,${p.alpha})`
        ctx.fill()
      })

      // Connect nearby particles
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(0,245,255,${0.05 * (1 - dist / 100)})`
            ctx.lineWidth = 0.4; ctx.stroke()
          }
        })
      })

      frame++
      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  async function handleSubmit() {
    setLoading(true)
    setError('')
  
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
  
      if (error) {
        setError(error.message)
      }
    
  
    setLoading(false)
  }
  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>

      {/* Animated canvas background */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Glow orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,92,231,0.12) 0%, transparent 70%)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,245,255,0.08) 0%, transparent 70%)', zIndex: 0 }} />

      {/* Top status bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6c5ce7,#00f5ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 36 36" fill="none">
              <path d="M10 22 L15 12 L18 18 L22 10 L26 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: 2 }}>CULTFIT</span>
          <span style={{ color: 'rgba(0,245,255,0.5)', fontSize: 9, letterSpacing: 3 }}>VR</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ color: 'rgba(0,245,255,0.5)', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2 }}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, letterSpacing: 2 }}>ONLINE</span>
          </div>
        </div>
      </div>

      {/* Login card */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 380, margin: '0 20px' }}>

        {/* Corner brackets */}
        <div style={{ position: 'absolute', top: -8, left: -8, width: 20, height: 20, borderTop: '2px solid rgba(0,245,255,0.5)', borderLeft: '2px solid rgba(0,245,255,0.5)' }} />
        <div style={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderTop: '2px solid rgba(0,245,255,0.5)', borderRight: '2px solid rgba(0,245,255,0.5)' }} />
        <div style={{ position: 'absolute', bottom: -8, left: -8, width: 20, height: 20, borderBottom: '2px solid rgba(0,245,255,0.5)', borderLeft: '2px solid rgba(0,245,255,0.5)' }} />
        <div style={{ position: 'absolute', bottom: -8, right: -8, width: 20, height: 20, borderBottom: '2px solid rgba(0,245,255,0.5)', borderRight: '2px solid rgba(0,245,255,0.5)' }} />

        <div style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(24px)', border: '0.5px solid rgba(0,245,255,0.15)', borderRadius: 16, padding: '36px 32px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#6c5ce7,#00f5ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 0 24px rgba(108,92,231,0.5)' }}>
              <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
                <path d="M10 22 L15 12 L18 18 L22 10 L26 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ color: 'rgba(0,245,255,0.5)', fontSize: 10, letterSpacing: 5, marginBottom: 6 }}>
            ATHLETE LOGIN
            </div>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>
              Welcome Back
            </h1>
          </div>

          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,245,255,0.4)', fontSize: 12 }}>◉</div>
              <input
                style={{ width: '100%', padding: '13px 14px 13px 34px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(0,245,255,0.2)', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', letterSpacing: 0.5 }}
                placeholder="Email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={e => e.target.style.borderColor = 'rgba(0,245,255,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.2)'}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,245,255,0.4)', fontSize: 12 }}>◈</div>
              <input
                style={{ width: '100%', padding: '13px 14px 13px 34px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(0,245,255,0.2)', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', letterSpacing: 0.5 }}
                placeholder="Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={e => e.target.style.borderColor = 'rgba(0,245,255,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(0,245,255,0.2)'}
              />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,50,50,0.1)', border: '0.5px solid rgba(255,50,50,0.3)', color: '#ff6b6b', fontSize: 13, textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: '100%', marginTop: 20, padding: '14px', borderRadius: 10, background: loading ? 'rgba(108,92,231,0.3)' : 'linear-gradient(135deg,#6c5ce7,#4834d4)', border: '0.5px solid rgba(108,92,231,0.6)', color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: 2, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 0 20px rgba(108,92,231,0.4)', transition: 'all 0.2s' }}
          >
            {loading ? 'AUTHENTICATING...' : 'ENTER CULTFIT'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, letterSpacing: 2 }}>OR</span>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '14px 28px', zIndex: 2, borderTop: '0.5px solid rgba(0,245,255,0.06)' }}>
        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, letterSpacing: 3 }}>CULTFIT VR v1.0</span>
        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, letterSpacing: 3 }}>SECURE CONNECTION</span>
      </div>

    </div>
  )
}