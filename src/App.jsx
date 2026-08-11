import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core'

import data from './data/islahatlar.json'
import { IslahatCard } from './components/IslahatCard.jsx'
import { PadisahBox } from './components/PadisahBox.jsx'
import { FanusDroppable } from './components/FanusDroppable.jsx'

const COUNT_OPTIONS = [10, 25, 50, 75, 100, 'Tümü']
const MIN_TO_CHECK = 5
const BALANCED_SAMPLING_THRESHOLD = 50
const MIN_PER_PADISAH = 2

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// JSON'daki mevcut yüzyıllar
const availableYys = Array.from(new Set(data.islahatlar.map(i => i.yy))).sort((a, b) => a - b)

export default function App() {
  // null = başlangıç ekranı, number = tek yüzyıl, 'all' = karma
  const [selectedYy, setSelectedYy] = useState(null)
  const [selectedCount, setSelectedCount] = useState(10)
  const [sessionKey, setSessionKey] = useState(0)

  // Bu turda kullanılacak ıslahat havuzu (yüzyıla göre filtreli)
  const initialPool = useMemo(() => {
    if (selectedYy == null) return []
    const filtered = selectedYy === 'all'
      ? data.islahatlar
      : data.islahatlar.filter(i => i.yy === selectedYy)
    const total = selectedCount === 'Tümü'
      ? filtered.length
      : Math.min(selectedCount, filtered.length)

    // 50+ turda her padişahtan min N ıslahat garanti et
    if (total >= BALANCED_SAMPLING_THRESHOLD && total < filtered.length) {
      const byPadisah = new Map()
      for (const item of filtered) {
        if (!byPadisah.has(item.padisahId)) byPadisah.set(item.padisahId, [])
        byPadisah.get(item.padisahId).push(item)
      }
      const guaranteed = []
      const rest = []
      for (const items of byPadisah.values()) {
        const s = shuffle(items)
        const take = Math.min(MIN_PER_PADISAH, s.length)
        guaranteed.push(...s.slice(0, take))
        rest.push(...s.slice(take))
      }
      if (guaranteed.length >= total) {
        return shuffle(guaranteed).slice(0, total).map(i => i.id)
      }
      const filler = shuffle(rest).slice(0, total - guaranteed.length)
      return shuffle([...guaranteed, ...filler]).map(i => i.id)
    }

    return shuffle(filtered).slice(0, total).map(i => i.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYy, selectedCount, sessionKey])

  const activeIslahatlar = useMemo(() => {
    const set = new Set(initialPool)
    return data.islahatlar.filter(i => set.has(i.id))
  }, [initialPool])

  const activePadisahlar = useMemo(() => {
    const ids = new Set(activeIslahatlar.map(i => i.padisahId))
    return data.padisahlar
      .filter(p => ids.has(p.id))
      .sort((a, b) => a.yy - b.yy)
  }, [activeIslahatlar])

  const groupsByYy = useMemo(() => {
    const map = new Map()
    for (const p of activePadisahlar) {
      if (!map.has(p.yy)) map.set(p.yy, [])
      map.get(p.yy).push(p)
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [activePadisahlar])

  const [fanus, setFanus] = useState([])
  const [placements, setPlacements] = useState({})
  const [activeDragId, setActiveDragId] = useState(null)
  const [checked, setChecked] = useState(false)
  const [results, setResults] = useState({})
  const [revealed, setRevealed] = useState(new Set())

  useEffect(() => {
    setFanus(initialPool)
    setPlacements({})
    setResults({})
    setChecked(false)
    setActiveDragId(null)
    setRevealed(new Set())
  }, [initialPool])

  const islahatById = useMemo(() => {
    const m = new Map()
    for (const i of data.islahatlar) m.set(i.id, i)
    return m
  }, [])

  const padisahById = useMemo(() => {
    const m = new Map()
    for (const p of data.padisahlar) m.set(p.id, p)
    return m
  }, [])

  function correctPadisahNameFor(islahatId) {
    const isl = islahatById.get(islahatId)
    if (!isl) return ''
    return padisahById.get(isl.padisahId)?.ad || ''
  }

  function toggleReveal(id) {
    setRevealed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const currentCardId = fanus.length > 0 ? fanus[fanus.length - 1] : null
  const currentCard = currentCardId != null ? islahatById.get(currentCardId) : null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 120, tolerance: 6 } }),
  )

  function findLocation(islahatId) {
    if (fanus.includes(islahatId)) return { type: 'fanus' }
    for (const [pid, list] of Object.entries(placements)) {
      if (list.includes(islahatId)) return { type: 'box', padisahId: pid }
    }
    return null
  }

  function handleDragStart(e) {
    if (checked) return
    setActiveDragId(e.active.data.current?.islahatId ?? null)
  }

  function handleDragEnd(e) {
    setActiveDragId(null)
    if (checked) return
    const { active, over } = e
    if (!over) return
    const islahatId = active.data.current?.islahatId
    if (islahatId == null) return

    const from = findLocation(islahatId)
    const overData = over.data.current || {}
    const toIsFanus = overData.back === true
    const toBoxId = overData.padisahId || null
    if (!toIsFanus && !toBoxId) return

    if (from?.type === 'fanus' && toIsFanus) return
    if (from?.type === 'box' && from.padisahId === toBoxId) return

    let newFanus = fanus
    let newPlacements = { ...placements }
    if (from?.type === 'fanus') {
      newFanus = fanus.filter(id => id !== islahatId)
    } else if (from?.type === 'box') {
      newPlacements[from.padisahId] = (newPlacements[from.padisahId] || []).filter(id => id !== islahatId)
    }

    if (toIsFanus) {
      newFanus = [...newFanus, islahatId]
    } else {
      newPlacements[toBoxId] = [...(newPlacements[toBoxId] || []), islahatId]
    }

    setFanus(newFanus)
    setPlacements(newPlacements)
  }

  function handleSkip() {
    if (fanus.length === 0) return
    const top = fanus[fanus.length - 1]
    const rest = fanus.slice(0, -1)
    setFanus([top, ...rest])
  }

  // Mobil için: üstteki karti tap ile bir padişah kutusuna yerleştir
  function placeCurrentInto(padisahId) {
    if (checked) return
    if (fanus.length === 0) return
    const top = fanus[fanus.length - 1]
    setFanus(fanus.slice(0, -1))
    setPlacements(prev => ({
      ...prev,
      [padisahId]: [...(prev[padisahId] || []), top],
    }))
  }

  const placedCount = useMemo(
    () => Object.values(placements).reduce((s, arr) => s + arr.length, 0),
    [placements]
  )

  const canCheck = !checked && placedCount >= MIN_TO_CHECK

  function handleCheck() {
    if (!canCheck) return
    const r = {}
    for (const [pid, arr] of Object.entries(placements)) {
      for (const id of arr) {
        const isl = islahatById.get(id)
        r[id] = isl?.padisahId === pid ? 'correct' : 'wrong'
      }
    }
    setResults(r)
    setChecked(true)

    const reordered = {}
    for (const [pid, arr] of Object.entries(placements)) {
      const wrongs = arr.filter(id => r[id] === 'wrong')
      const corrects = arr.filter(id => r[id] === 'correct')
      reordered[pid] = [...wrongs, ...corrects]
    }
    setPlacements(reordered)
  }

  function handleRestart() {
    setSessionKey(k => k + 1)
  }

  function handleChangeYy() {
    setSelectedYy(null)
  }

  const correctCount = Object.values(results).filter(v => v === 'correct').length
  const wrongCount = Object.values(results).filter(v => v === 'wrong').length
  const activeCard = activeDragId != null ? islahatById.get(activeDragId) : null

  // Padişah başı D/Y sayısı
  const perPadisahStats = useMemo(() => {
    const stats = {}
    for (const [pid, arr] of Object.entries(placements)) {
      let d = 0, y = 0
      for (const id of arr) {
        if (results[id] === 'correct') d++
        else if (results[id] === 'wrong') y++
      }
      stats[pid] = { d, y }
    }
    return stats
  }, [placements, results])

  // -------- BAŞLANGIÇ EKRANI --------
  if (selectedYy == null) {
    return (
      <div className="app">
        <div className="start-screen">
          <h1 className="start-title">
            <span className="accent">Fanus</span> — Islahat Eşleştirme
          </h1>
          <p className="start-sub">
            Hangi yüzyılın ıslahatları üzerinde çalışmak istersin?
          </p>

          <div className="start-choices">
            {availableYys.map(yy => {
              const count = data.islahatlar.filter(i => i.yy === yy).length
              return (
                <button
                  key={yy}
                  className="choice"
                  onClick={() => setSelectedYy(yy)}
                >
                  <span className="choice-title">{yy}. Yüzyıl</span>
                  <span className="choice-meta">{count} ıslahat</span>
                </button>
              )
            })}

            <button
              className="choice choice-mixed"
              onClick={() => setSelectedYy('all')}
            >
              <span className="choice-title">Karma</span>
              <span className="choice-meta">
                Tüm yüzyıllar · {data.islahatlar.length} ıslahat
              </span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // -------- OYUN EKRANI --------
  const yyLabel = selectedYy === 'all' ? 'Karma' : `${selectedYy}. yy`

  return (
    <div className="app">
      <div className="header">
        <h1 className="title">
          <span className="accent">Fanus</span>
          <span className="title-sep">·</span>
          <span className="title-mode">{yyLabel}</span>
        </h1>
        <div className="header-controls">
          <div className="count-picker" role="group" aria-label="Islahat sayısı">
            {COUNT_OPTIONS.map(opt => (
              <button
                key={opt}
                className={opt === selectedCount ? 'active' : ''}
                onClick={() => setSelectedCount(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <button className="btn ghost" onClick={handleRestart}>Baştan başla</button>
          <button className="btn ghost" onClick={handleChangeYy}>Yüzyıl değiştir</button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const pointer = pointerWithin(args)
          return pointer.length > 0 ? pointer : rectIntersection(args)
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="fanus">
          <div className="fanus-head">
            <span className="fanus-label">Fanus</span>
            <div className="fanus-stats">
              <span className="stat count">Kalan: {fanus.length}</span>
              <span className="stat">Yerleştirilen: {placedCount}</span>
              {checked && <span className="stat ok">Doğru: {correctCount}</span>}
              {checked && <span className="stat err">Yanlış: {wrongCount}</span>}
            </div>
          </div>

          {checked ? (
            <div className="result-banner">
              <div className="result-scores">
                <span className="score ok">✓ {correctCount} doğru</span>
                <span className="score err">! {wrongCount} yanlış</span>
              </div>
              <div className="result-hint">
                Doğru cevabı görmek için yanlış (kırmızı) kartlara tıklayın.
              </div>
            </div>
          ) : (
            <>
              <FanusDroppable>
                {currentCard ? (
                  <IslahatCard islahat={currentCard} size="big" />
                ) : (
                  <div className="fanus-empty">
                    Fanus boş. Kartları padişah kutularına yerleştirdikten sonra <b>Kontrol Et</b>'e bas.
                  </div>
                )}
              </FanusDroppable>
              {currentCard && (
                <>
                  <div className="tap-picker" aria-label="Padişah seç">
                    {groupsByYy.map(([yy, list]) => (
                      <div key={yy} className="tap-row">
                        {list.map(p => (
                          <button
                            key={p.id}
                            className="tap-btn"
                            onClick={() => placeCurrentInto(p.id)}
                          >
                            <span className="tap-btn-name">{p.ad}</span>
                            <span className="tap-btn-yy">{p.yy}. yy</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="skip-row">
                    <button className="btn" onClick={handleSkip}>Boş bırak (sona at)</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {groupsByYy.map(([yy, list]) => (
          <div className="yy-group" key={yy}>
            <h2 className="yy-title">{yy}. Yüzyıl</h2>
            <div className="boxes">
              {list.map(p => (
                <PadisahBox
                  key={p.id}
                  padisah={p}
                  items={(placements[p.id] || []).map(id => islahatById.get(id)).filter(Boolean)}
                  results={results}
                  checked={checked}
                  revealed={revealed}
                  onToggleReveal={toggleReveal}
                  correctPadisahNameFor={correctPadisahNameFor}
                  stats={perPadisahStats[p.id]}
                />
              ))}
            </div>
          </div>
        ))}

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div className="overlay-card">{activeCard.ad}</div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="check-bar">
        {!checked ? (
          <>
            <span className="hint">
              En az {MIN_TO_CHECK} ıslahat yerleştir · Yerleştirilen: <b>{placedCount}</b>
            </span>
            <button
              className="btn primary"
              onClick={handleCheck}
              disabled={!canCheck}
            >
              Kontrol Et
            </button>
          </>
        ) : (
          <>
            <span className="hint">
              Skor: <b style={{ color: 'var(--ok-text)' }}>{correctCount} ✓</b> · <b style={{ color: 'var(--err-text)' }}>{wrongCount} !</b>
            </span>
            <button className="btn primary" onClick={handleRestart}>
              Yeni Tur
            </button>
          </>
        )}
      </div>
    </div>
  )
}
