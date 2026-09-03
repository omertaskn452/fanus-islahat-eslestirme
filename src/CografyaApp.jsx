import { useMemo, useState } from 'react'
import veri from './data/madenler.json'
import TurkiyeHaritasi from './components/TurkiyeHaritasi.jsx'
import {
  DESTELER,
  madenSorulariUret,
  olasiSoruSayisi,
  madenIsaretleri,
  sahaEtiketi,
} from './utils/cografyaSorular.js'

const COUNT_OPTIONS = [15, 35, 75, 'Tümü']

export default function CografyaApp({ onBack }) {
  const [ekran, setEkran] = useState('secim') // secim | kesif | test
  const [deste, setDeste] = useState(null)
  const [count, setCount] = useState(15)
  const [sessionKey, setSessionKey] = useState(0)

  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [answers, setAnswers] = useState({})

  const questions = useMemo(() => {
    if (ekran !== 'test' || deste == null) return []
    return madenSorulariUret(veri, deste, count)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ekran, deste, count, sessionKey])

  function restart() {
    setSessionKey((k) => k + 1)
    setIdx(0)
    setPicked(null)
    setAnswers({})
  }

  function desteSec(id) {
    setDeste(id)
    setEkran('test')
    restart()
  }

  function desteDegistir() {
    setDeste(null)
    setEkran('secim')
    restart()
  }

  function selectOption(opt) {
    if (picked != null) return
    const q = questions[idx]
    setPicked(opt)
    setAnswers((prev) => ({ ...prev, [q.id]: { picked: opt, isCorrect: opt === q.dogru } }))
  }

  function nextQuestion() {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1)
      setPicked(null)
    } else {
      setIdx(questions.length)
    }
  }

  // -------- EKRAN 1: DESTE SEÇİMİ --------
  if (ekran === 'secim') {
    return (
      <div className="app">
        <div className="start-screen">
          <h1 className="start-title">
            <span className="accent">Coğrafya</span> — Madenler
          </h1>
          <p className="start-sub">Hangi desteyle çalışmak istersin?</p>

          <div className="start-choices">
            {DESTELER.map((d) => {
              const cls = d.id === 'karma' ? 'choice choice-mixed' : 'choice'
              return (
                <button key={d.id} className={cls} onClick={() => desteSec(d.id)}>
                  <span className="choice-title">{d.ad}</span>
                  <span className="choice-meta">{olasiSoruSayisi(veri, d.id)} olası soru</span>
                  <span className="choice-desc">{d.aciklama}</span>
                </button>
              )
            })}
          </div>

          <div className="back-slot">
            <button className="btn ghost" onClick={() => setEkran('kesif')}>
              Haritaları incele
            </button>
            {onBack && (
              <button className="btn ghost" onClick={onBack}>
                Ana menü
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // -------- KEŞİF EKRANI --------
  if (ekran === 'kesif') {
    return <KesifEkrani onBack={() => setEkran('secim')} onAnaMenu={onBack} />
  }

  const desteInfo = DESTELER.find((d) => d.id === deste)

  // -------- BİTİŞ EKRANI --------
  if (idx >= questions.length && questions.length > 0) {
    const dogru = Object.values(answers).filter((a) => a.isCorrect).length
    const yanlis = Object.values(answers).filter((a) => !a.isCorrect).length
    const yuzde = Math.round((dogru / questions.length) * 100)

    return (
      <div className="app">
        <div className="header">
          <h1 className="title">
            <span className="accent">Coğrafya</span>
            <span className="title-sep">·</span>
            <span className="title-mode">{desteInfo.ad}</span>
          </h1>
          <div className="header-controls">
            {onBack && (
              <button className="btn ghost" onClick={onBack}>
                Ana menü
              </button>
            )}
          </div>
        </div>

        <div className="test-content">
          <div className="test-finish">
            <div className="test-finish-score">
              <span className="finish-percent">%{yuzde}</span>
              <div className="finish-nums">
                <span className="finish-ok">✓ {dogru} doğru</span>
                <span className="finish-err">✗ {yanlis} yanlış</span>
                <span className="finish-total">/ {questions.length} soru</span>
              </div>
            </div>

            <div className="test-finish-actions">
              <button className="btn primary" onClick={restart}>
                Yeni Tur
              </button>
              <button className="btn" onClick={desteDegistir}>
                Deste değiştir
              </button>
            </div>

            {yanlis > 0 && (
              <div className="wrong-list">
                <h3 className="wrong-list-title">Yanlış cevapladıkların</h3>
                {questions
                  .filter((q) => answers[q.id] && !answers[q.id].isCorrect)
                  .map((q) => (
                    <div key={q.id} className="wrong-item">
                      <div className="wrong-item-q">{q.soru}</div>
                      <div className="wrong-item-a">
                        <span className="wrong-picked">Cevabın: {answers[q.id].picked}</span>
                        <span className="wrong-correct">Doğrusu: {q.dogru}</span>
                      </div>
                      {q.aciklama && <div className="wrong-item-explain">{q.aciklama}</div>}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="app">
        <div className="start-screen">
          <p className="start-sub">Bu seçimde yeterli veri yok.</p>
          <button className="btn primary" onClick={desteDegistir}>
            Deste değiştir
          </button>
        </div>
      </div>
    )
  }

  // -------- TEST EKRANI --------
  const q = questions[idx]
  const cevaplandi = picked != null
  const dogruSayisi = Object.values(answers).filter((a) => a.isCorrect).length
  const yanlisSayisi = Object.values(answers).filter((a) => !a.isCorrect).length

  return (
    <div className="app">
      <div className="header">
        <h1 className="title">
          <span className="accent">Coğrafya</span>
          <span className="title-sep">·</span>
          <span className="title-mode">{desteInfo.ad}</span>
        </h1>
        <div className="header-controls">
          <div className="count-picker" role="group" aria-label="Soru sayısı">
            {COUNT_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={opt === count ? 'active' : ''}
                onClick={() => {
                  setCount(opt)
                  restart()
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          <button className="btn ghost" onClick={restart}>
            Baştan başla
          </button>
          <button className="btn ghost" onClick={desteDegistir}>
            Deste değiştir
          </button>
          {onBack && (
            <button className="btn ghost" onClick={onBack}>
              Ana menü
            </button>
          )}
        </div>
      </div>

      <div className="test-content">
        <div className="test-progress">
          <div className="test-progress-bar">
            <div className="test-progress-fill" style={{ width: `${(idx / questions.length) * 100}%` }} />
          </div>
          <div className="test-progress-info">
            <span>
              Soru {idx + 1} / {questions.length}
            </span>
            <span className="test-progress-stats">
              <span className="stat ok">✓ {dogruSayisi}</span>
              <span className="stat err">✗ {yanlisSayisi}</span>
            </span>
          </div>
        </div>

        <div className="test-card">
          {q.harita && <TurkiyeHaritasi isaretler={q.harita.isaretler} lejant={q.harita.lejant || []} />}

          <div className="test-question">{q.soru}</div>

          <div className="test-options">
            {q.secenekler.map((opt, i) => {
              let cls = 'test-option'
              if (cevaplandi) {
                if (opt === q.dogru) cls += ' correct'
                else if (opt === picked) cls += ' wrong'
                else cls += ' disabled'
              }
              return (
                <button key={i} className={cls} onClick={() => selectOption(opt)} disabled={cevaplandi}>
                  <span className="test-option-letter">{String.fromCharCode(65 + i)}</span>
                  <span className="test-option-text">{opt}</span>
                </button>
              )
            })}
          </div>

          {cevaplandi && q.aciklama && <div className="test-explain">{q.aciklama}</div>}

          <div className="test-actions">
            <button className="btn primary" onClick={nextQuestion} disabled={!cevaplandi}>
              {idx + 1 < questions.length ? 'Sonraki Soru' : 'Sonuçları Gör'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- keşif ----

function KesifEkrani({ onBack, onAnaMenu }) {
  const [madenId, setMadenId] = useState(veri.madenler[0].id)

  const maden = veri.madenler.find((m) => m.id === madenId)
  const isaretler = madenIsaretleri(maden)

  return (
    <div className="app">
      <div className="header">
        <h1 className="title">
          <span className="accent">Coğrafya</span>
          <span className="title-sep">·</span>
          <span className="title-mode">Harita İnceleme</span>
        </h1>
        <div className="header-controls">
          <button className="btn ghost" onClick={onBack}>
            Teste dön
          </button>
          {onAnaMenu && (
            <button className="btn ghost" onClick={onAnaMenu}>
              Ana menü
            </button>
          )}
        </div>
      </div>

      <div className="test-content">
        <div className="kesif-liste">
          {veri.madenler.map((m) => (
            <button
              key={m.id}
              className={m.id === madenId ? 'kesif-cip aktif' : 'kesif-cip'}
              onClick={() => setMadenId(m.id)}
            >
              {m.ad}
            </button>
          ))}
        </div>

        <div className="test-card">
          <TurkiyeHaritasi
            isaretler={isaretler}
            etiketGoster
            lejant={[
              { renk: '#f87171', ad: 'Çıkarıldığı alanlar' },
              ...(maden.tesisler?.length ? [{ renk: '#a3a3a3', ad: 'İşleme tesisleri', tip: 'tesis' }] : []),
            ]}
          />

          <h2 className="kesif-baslik">{maden.ad}</h2>

          <div className="kesif-bolum">
            <h3>Çıkarıldığı yerler</h3>
            <div className="kesif-etiketler">
              {maden.sahalar.map((s) => (
                <span key={sahaEtiketi(s)} className="kesif-etiket">
                  {sahaEtiketi(s)}
                  {s.not && <em className="kesif-not">{s.not}</em>}
                </span>
              ))}
            </div>
          </div>

          {maden.tesisler?.length > 0 && (
            <div className="kesif-bolum">
              <h3>İşlendiği yerler</h3>
              <div className="kesif-etiketler">
                {maden.tesisler.map((t) => (
                  <span key={t.ad} className="kesif-etiket tesis">
                    {t.ad} — {t.il}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="kesif-bolum">
            <h3>Özellikleri</h3>
            <ul className="kesif-bilgiler">
              {maden.bilgiler.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
