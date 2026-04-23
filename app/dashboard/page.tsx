'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Profile = {
  name: string
  points: number
  tier: string
  total_km: number
  total_sessions: number
  streak: number
}

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    load()
    const tick = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#00f5ff', fontFamily: 'monospace', fontSize: 16, letterSpacing: 4 }}>LOADING CULTFIT...</div>
    </div>
  )

  const tierColors: Record<string, string> = { Bronze: '#cd7f32', Silver: '#c0c0c0', Gold: '#ffd700', Platinum: '#00f5ff' }
  const tierColor = tierColors[profile.tier] || '#cd7f32'
  const nextTierPts = profile.tier === 'Bronze' ? 1500 : profile.tier === 'Silver' ? 3000 : profile.tier === 'Gold' ? 6000 : 10000
  const progress = Math.min((profile.points / nextTierPts) * 100, 100)

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* Animated grid background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 0 }} />

      {/* Glow orbs */}
      <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,92,231,0.15) 0%, transparent 70%)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: -80, right: -80, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,245,255,0.08) 0%, transparent 70%)', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '0.5px solid rgba(0,245,255,0.15)', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#6c5ce7,#00f5ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 36 36" fill="none">
                <path d="M10 22 L15 12 L18 18 L22 10 L26 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 16, letterSpacing: 1 }}>CULTFIT</span>
            <span style={{ color: 'rgba(0,245,255,0.5)', fontSize: 10, letterSpacing: 3, marginLeft: 4 }}>VR</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Live clock */}
            <div style={{ color: 'rgba(0,245,255,0.6)', fontSize: 12, fontFamily: 'monospace', letterSpacing: 2 }}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>

            {/* Wallet */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: 'rgba(108,92,231,0.2)', border: '0.5px solid rgba(108,92,231,0.6)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6c5ce7', boxShadow: '0 0 6px #6c5ce7' }} />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{profile.points.toLocaleString()}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>PTS</span>
            </div>

            <button onClick={signOut} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, background: 'none', border: '0.5px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', letterSpacing: 1 }}>
              EXIT
            </button>
          </div>
        </div>

        {/* Hero section */}
        <div style={{ padding: '32px 24px 24px', borderBottom: '0.5px solid rgba(0,245,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: 'rgba(0,245,255,0.5)', fontSize: 11, letterSpacing: 4, marginBottom: 8 }}>ATHLETE PROFILE</div>
              <h1 style={{ color: '#fff', fontSize: 36, fontWeight: 700, margin: 0, letterSpacing: -1 }}>
                {profile.name || 'Athlete'}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <div style={{ padding: '3px 10px', borderRadius: 20, border: `0.5px solid ${tierColor}`, color: tierColor, fontSize: 11, fontWeight: 600, letterSpacing: 2 }}>
                  {profile.tier.toUpperCase()}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>·</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>🔥 {profile.streak} day streak</div>
              </div>
            </div>

            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#6c5ce7,#00f5ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff', border: `2px solid ${tierColor}` }}>
                {(profile.name || 'A')[0].toUpperCase()}
              </div>
              <div style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: '#00ff88', border: '2px solid #000', boxShadow: '0 0 6px #00ff88' }} />
            </div>
          </div>

          {/* Tier progress bar */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, letterSpacing: 2 }}>TIER PROGRESS</span>
              <span style={{ color: tierColor, fontSize: 11, fontWeight: 600 }}>{profile.points.toLocaleString()} / {nextTierPts.toLocaleString()}</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, #6c5ce7, ${tierColor})`, borderRadius: 2, boxShadow: `0 0 8px ${tierColor}`, transition: 'width 1s ease' }} />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(0,245,255,0.05)', margin: '0', borderTop: '0.5px solid rgba(0,245,255,0.08)', borderBottom: '0.5px solid rgba(0,245,255,0.08)' }}>
          {[
            { label: 'TOTAL KM', value: profile.total_km.toFixed(1), unit: 'km', color: '#00f5ff' },
            { label: 'SESSIONS', value: profile.total_sessions, unit: 'runs', color: '#6c5ce7' },
            { label: 'STREAK', value: profile.streak, unit: 'days', color: '#ff6b6b' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '20px 16px', textAlign: 'center', background: 'rgba(0,0,0,0.4)', borderRight: i < 2 ? '0.5px solid rgba(0,245,255,0.08)' : 'none' }}>
              <div style={{ color: s.color, fontSize: 28, fontWeight: 700, lineHeight: 1, textShadow: `0 0 20px ${s.color}` }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, letterSpacing: 3, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Run card */}
        <div style={{ padding: '24px' }}>
          <div style={{ color: 'rgba(0,245,255,0.4)', fontSize: 10, letterSpacing: 4, marginBottom: 14 }}>SELECT ACTIVITY</div>

          <div
            onClick={() => router.push('/run')}
            style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '28px 24px', cursor: 'pointer', background: 'rgba(108,92,231,0.08)', border: '0.5px solid rgba(108,92,231,0.4)', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.border = '0.5px solid rgba(0,245,255,0.6)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(108,92,231,0.15)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.border = '0.5px solid rgba(108,92,231,0.4)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(108,92,231,0.08)' }}
          >
            {/* Decorative corner lines */}
            <div style={{ position: 'absolute', top: 10, left: 10, width: 16, height: 16, borderTop: '1.5px solid rgba(0,245,255,0.5)', borderLeft: '1.5px solid rgba(0,245,255,0.5)' }} />
            <div style={{ position: 'absolute', top: 10, right: 10, width: 16, height: 16, borderTop: '1.5px solid rgba(0,245,255,0.5)', borderRight: '1.5px solid rgba(0,245,255,0.5)' }} />
            <div style={{ position: 'absolute', bottom: 10, left: 10, width: 16, height: 16, borderBottom: '1.5px solid rgba(0,245,255,0.5)', borderLeft: '1.5px solid rgba(0,245,255,0.5)' }} />
            <div style={{ position: 'absolute', bottom: 10, right: 10, width: 16, height: 16, borderBottom: '1.5px solid rgba(0,245,255,0.5)', borderRight: '1.5px solid rgba(0,245,255,0.5)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(108,92,231,0.3)', border: '0.5px solid rgba(108,92,231,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
                🏃
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 20, letterSpacing: 0.5 }}>VR RUN</span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(0,245,255,0.1)', border: '0.5px solid rgba(0,245,255,0.3)', color: '#00f5ff', fontSize: 9, letterSpacing: 2 }}>LIVE</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>+80 pts per km · 2 immersive worlds</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  {['🌅 Sahara','🌊 Ocean'].map((s, i) => (
                    <div key={i} style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{s}</div>
                  ))}
                </div>
              </div>
              <div style={{ color: 'rgba(0,245,255,0.6)', fontSize: 24 }}>›</div>
            </div>
          </div>
        </div>

        {/* Bottom status bar */}
        <div style={{ margin: '0 24px 24px', padding: '12px 16px', borderRadius: 10, background: 'rgba(0,245,255,0.03)', border: '0.5px solid rgba(0,245,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: 2 }}>SYSTEM ONLINE</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontFamily: 'monospace' }}>CULTFIT v1.0</span>
        </div>

      </div>
    </div>
  )
}