import { useMemo, useState } from 'react'
import data from './data/kultur.json'
import { generateQuestions } from './utils/questionGenerator.js'

const COUNT_OPTIONS = [15, 35, 75, 125, 'Tümü']


const UNITE_LIST = [
  {
    id: 'İlk Müslüman Türk Devletleri',
    ad: 'İlk Müslüman Türk Devletleri',
    kisa: 'İlk Müslüman Türk',
    aciklama: 'Bilim insanları, yazarlar, saray/devlet görevlileri, divanlar',
  },
  {
    id: 'Osmanlı Kültür ve Medeniyeti',
    ad: 'Osmanlı Kültür ve Medeniyeti',
    kisa: 'Osmanlı',
    aciklama: 'Bilim insanları, toprak yönetimi, ekonomi, vergiler',
  },
]

const KATEGORI_LIST = [
  { id: 'kisiler',  ad: 'Kişiler',  aciklama: 'Bilim insanları, yazarlar' },
  { id: 'terimler', ad: 'Terimler', aciklama: 'Görevliler, divanlar, kavramlar, vergiler, topraklar' },
  { id: 'karma',    ad: 'Tümü',     aciklama: 'Kişi ve terimler karışık' },
]

function countCandidatesFor(gruplar, unite, kategori) {
  let filt = gruplar
  if (unite !== 'karma') filt = filt.filter(g => g.unite === unite)
  if (kategori !== 'karma') filt = filt.filter(g => g.kategori === kategori)
  let cnt = 0
  for (const g of filt) {
    for (const v of g.varliklar) {
      for (const o of v.ozellikler) {
        cnt++
        if (g.tip === 'terim' && v.ozellikler.filter(x => x.tip === o.tip).length === 1) {
          cnt++
        }
      }
    }
  }
  return cnt
}

export default function KulturApp({ onBack }) {
  const [unite, setUnite] = useState(null)
  const [kategori, setKategori] = useState(null)
  const [count, setCount] = useState(15)
  const [sessionKey, setSessionKey] = useState(0)

  const questions = useMemo(() => {
    if (unite == null || kategori == null) return []
    return generateQuestions(data.gruplar, unite, kategori, count)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unite, kategori, count, sessionKey])

  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [reveals, setReveals] = useState({})
  const [answers, setAnswers] = useState({})

  function restart() {
    setSessionKey(k => k + 1)
    setIdx(0)
    setPicked(null)
    setReveals({})
    setAnswers({})
  }

  function backToKategoriSecim() {
    setKategori(null)
    setIdx(0)
    setPicked(null)
    setReveals({})
    setAnswers({})
  }

  function backToUniteSecim() {
    setUnite(null)
    setKategori(null)
    setIdx(0)
    setPicked(null)
    setReveals({})
    setAnswers({})
  }

  function selectOption(opt) {
    if (picked != null) return
    const q = questions[idx]
    const isCorrect = opt === q.dogru
    setPicked(opt)
    setAnswers(prev => ({ ...prev, [q.id]: { picked: opt, isCorrect } }))
  }

  function nextQuestion() {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1)
      setPicked(null)
    } else {
      setIdx(questions.length)
    }
  }

  function toggleReveal(qid) {
    setReveals(prev => ({ ...prev, [qid]: !prev[qid] }))
  }

  const uniteInfo = unite === 'karma'
    ? { ad: 'Karma (Tüm Üniteler)', kisa: 'Karma' }
    : UNITE_LIST.find(u => u.id === unite) || null
  const kategoriInfo = KATEGORI_LIST.find(k => k.id === kategori) || null

  // -------- EKRAN 1: ÜNİTE SEÇİMİ --------
  if (unite == null) {
    return (
      <div className="app">
        <div className="start-screen">
          <h1 className="start-title">
            <span className="accent">Kültür-Medeniyet</span> — Test
          </h1>
          <p className="start-sub">Hangi üniteyi çalışmak istersin?</p>

          <div className="start-choices">
            {UNITE_LIST.map(u => {
              const cnt = countCandidatesFor(data.gruplar, u.id, 'karma')
              return (
                <button key={u.id} className="choice" onClick={() => setUnite(u.id)}>
                  <span className="choice-title">{u.ad}</span>
                  <span className="choice-meta">{cnt} olası soru</span>
                  <span className="choice-desc">{u.aciklama}</span>
                </button>
              )
            })}

            <button className="choice choice-mixed" onClick={() => setUnite('karma')}>
              <span className="choice-title">Karma</span>
              <span className="choice-meta">
                {countCandidatesFor(data.gruplar, 'karma', 'karma')} olası soru
              </span>
              <span className="choice-desc">Tüm ünitelerden karışık</span>
            </button>
          </div>

          <div className="back-slot">
            {onBack && (
              <button className="btn ghost" onClick={onBack}>← Ana menü</button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // -------- EKRAN 2: DESTE SEÇİMİ --------
  if (kategori == null) {
    return (
      <div className="app">
        <div className="start-screen">
          <h1 className="start-title">
            <span className="accent">{uniteInfo.ad}</span>
          </h1>
          <p className="start-sub">Hangi desteyle çalışmak istersin?</p>

          <div className="start-choices">
            {KATEGORI_LIST.map(k => {
              const cnt = countCandidatesFor(data.gruplar, unite, k.id)
              const cls = k.id === 'karma' ? 'choice choice-mixed' : 'choice'
              return (
                <button
                  key={k.id}
                  className={cls}
                  onClick={() => setKategori(k.id)}
                  disabled={cnt === 0}
                >
                  <span className="choice-title">{k.ad}</span>
                  <span className="choice-meta">{cnt} olası soru</span>
                  <span className="choice-desc">{k.aciklama}</span>
                </button>
              )
            })}
          </div>

          <div className="back-slot">
            <button className="btn ghost" onClick={backToUniteSecim}>← Ünite değiştir</button>
            {onBack && <button className="btn ghost" onClick={onBack}>Ana menü</button>}
          </div>
        </div>
      </div>
    )
  }

  const contextLabel = `${uniteInfo.kisa} · ${kategoriInfo.ad}`

  // -------- BİTİŞ EKRANI --------
  if (idx >= questions.length && questions.length > 0) {
    const doğru = Object.values(answers).filter(a => a.isCorrect).length
    const yanlış = Object.values(answers).filter(a => !a.isCorrect).length
    const yüzde = questions.length > 0 ? Math.round((doğru / questions.length) * 100) : 0

    return (
      <div className="app">
        <div className="header">
          <h1 className="title">
            <span className="accent">Kültür-Medeniyet</span>
            <span className="title-sep">·</span>
            <span className="title-mode">{contextLabel}</span>
          </h1>
          <div className="header-controls">
            {onBack && <button className="btn ghost" onClick={onBack}>Ana menü</button>}
          </div>
        </div>

        <div className="test-content">
        <div className="test-finish">
          <div className="test-finish-score">
            <span className="finish-percent">%{yüzde}</span>
            <div className="finish-nums">
              <span className="finish-ok">✓ {doğru} doğru</span>
              <span className="finish-err">✗ {yanlış} yanlış</span>
              <span className="finish-total">/ {questions.length} soru</span>
            </div>
          </div>

          <div className="test-finish-actions">
            <button className="btn primary" onClick={restart}>Yeni Tur</button>
            <button className="btn" onClick={backToKategoriSecim}>Deste değiştir</button>
            <button className="btn" onClick={backToUniteSecim}>Ünite değiştir</button>
          </div>

          {yanlış > 0 && (
            <div className="wrong-list">
              <h3 className="wrong-list-title">Yanlış cevapladıkların</h3>
              {questions
                .filter(q => answers[q.id] && !answers[q.id].isCorrect)
                .map(q => (
                  <div key={q.id} className="wrong-item">
                    <div className="wrong-item-q">{q.soru}</div>
                    <div className="wrong-item-a">
                      <span className="wrong-picked">Cevabın: {answers[q.id].picked}</span>
                      <span className="wrong-correct">Doğrusu: {q.dogru}</span>
                    </div>
                    {q.aciklama && (
                      <div className="wrong-item-explain">{q.aciklama}</div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
        </div>
      </div>
    )
  }

  // -------- BOŞ DURUM --------
  if (questions.length === 0) {
    return (
      <div className="app">
        <div className="start-screen">
          <p className="start-sub">Bu seçimde yeterli veri yok.</p>
          <button className="btn primary" onClick={backToKategoriSecim}>Deste değiştir</button>
          <button className="btn" onClick={backToUniteSecim}>Ünite değiştir</button>
        </div>
      </div>
    )
  }

  // -------- TEST EKRANI --------
  const q = questions[idx]
  const cevaplandı = picked != null
  const doğruMuydu = cevaplandı && picked === q.dogru
  const şuAnaKadarDoğru = Object.values(answers).filter(a => a.isCorrect).length
  const şuAnaKadarYanlış = Object.values(answers).filter(a => !a.isCorrect).length

  return (
    <div className="app kultur-test-app">
      <div className="header">
        <h1 className="title">
          <span className="accent">Kültür-Medeniyet</span>
          <span className="title-sep">·</span>
          <span className="title-mode">{contextLabel}</span>
        </h1>
        <div className="header-controls">
          <div className="count-picker" role="group" aria-label="Soru sayısı">
            {COUNT_OPTIONS.map(opt => (
              <button
                key={opt}
                className={opt === count ? 'active' : ''}
                onClick={() => { setCount(opt); restart() }}
              >
                {opt}
              </button>
            ))}
          </div>
          <button className="btn ghost" onClick={restart}>Baştan başla</button>
          <button className="btn ghost" onClick={backToKategoriSecim}>Deste değiştir</button>
          <button className="btn ghost" onClick={backToUniteSecim}>Ünite değiştir</button>
          {onBack && <button className="btn ghost" onClick={onBack}>Ana menü</button>}
        </div>
      </div>

      <div className="test-content">
      <div className="test-progress">
        <div className="test-progress-bar">
          <div
            className="test-progress-fill"
            style={{ width: `${((idx) / questions.length) * 100}%` }}
          />
        </div>
        <div className="test-progress-info">
          <span>Soru {idx + 1} / {questions.length}</span>
          <span className="test-progress-stats">
            <span className="stat ok">✓ {şuAnaKadarDoğru}</span>
            <span className="stat err">✗ {şuAnaKadarYanlış}</span>
          </span>
        </div>
      </div>

      <div className="test-card">
        <div className="test-question">{q.soru}</div>

        <div className="test-options">
          {q.secenekler.map((opt, i) => {
            let cls = 'test-option'
            if (cevaplandı) {
              if (opt === q.dogru) cls += ' correct'
              else if (opt === picked) cls += ' wrong'
              else cls += ' disabled'
            }
            return (
              <button
                key={i}
                className={cls}
                onClick={() => selectOption(opt)}
                disabled={cevaplandı}
              >
                <span className="test-option-letter">{String.fromCharCode(65 + i)}</span>
                <span className="test-option-text">{opt}</span>
              </button>
            )
          })}
        </div>

        <div className="test-actions">
          {cevaplandı && q.aciklama && (
            <button className="btn" onClick={() => toggleReveal(q.id)}>
              {reveals[q.id] ? 'Açıklamayı gizle' : 'Açıklama'}
            </button>
          )}
          <button
            className="btn primary"
            onClick={nextQuestion}
            disabled={!cevaplandı}
          >
            {idx + 1 < questions.length ? 'Sonraki Soru' : 'Sonuçları Gör'}
          </button>
        </div>

        {cevaplandı && reveals[q.id] && q.aciklama && (
          <div className="test-explain">{q.aciklama}</div>
        )}
      </div>
      </div>
    </div>
  )
}
