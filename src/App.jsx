import { useState } from 'react'
import FanusApp from './FanusApp.jsx'
import KulturApp from './KulturApp.jsx'

export default function App() {
  const [view, setView] = useState('home')

  if (view === 'fanus') return <FanusApp onBack={() => setView('home')} />
  if (view === 'kultur') return <KulturApp onBack={() => setView('home')} />

  return (
    <div className="app">
      <div className="start-screen">
        <h1 className="start-title home-title">
          <span className="accent">Tarih</span> Çalışması
        </h1>
        <p className="start-sub">Hangi konuyla çalışmak istersin?</p>

        <div className="start-choices home-choices">
          <button className="choice home-choice" onClick={() => setView('fanus')}>
            <span className="choice-title">Fanus — Islahat</span>
            <span className="choice-meta">Padişah-ıslahat eşleştirme</span>
            <span className="choice-desc">
              Fanustaki ıslahat kartını doğru padişah kutusuna yerleştir.
            </span>
          </button>

          <button className="choice home-choice choice-mixed" onClick={() => setView('kultur')}>
            <span className="choice-title">Kültür-Medeniyet</span>
            <span className="choice-meta">Çoktan seçmeli test</span>
            <span className="choice-desc">
              Bilim insanları, yazarlar, saray/devlet görevlileri, divanlar.
            </span>
          </button>
        </div>

        <div className="back-slot" />
      </div>
    </div>
  )
}
