import { useEffect, useRef, useState } from 'react'
import { ILLER, ADALAR, GORUNUM, konumdanXY } from '../data/turkiyeHarita.js'

// viewBox'a küçük bir pay: kenardaki işaretler kırpılmasın.
const PAY = 12
const VIEWBOX = `${-PAY} ${-PAY} ${GORUNUM.genislik + PAY * 2} ${GORUNUM.yukseklik + PAY * 2}`

const ROMEN = ['I', 'II', 'III', 'IV', 'V', 'VI']

/**
 * Etiketleri çakışmayacak biçimde yerleştirir.
 *
 * Madenlerin sahaları çoğu zaman tek bir bölgede kümelendiği için (ör. bor:
 * hepsi Güney Marmara'da) etiketler doğrudan noktanın yanına yazılırsa üst
 * üste biner. Burada her etiket, boş bir yer bulana kadar dikeyde kaydırılır;
 * kaydırıldıysa noktaya ince bir çizgiyle bağlanır.
 */
function etiketleriYerlestir(etiketler, harfGenislik, satirYuksek, haritaGenislik) {
  const yerlesim = []
  const dolu = []

  const cakisiyor = (kutu) =>
    dolu.some((d) => !(kutu.x2 < d.x1 || kutu.x1 > d.x2 || kutu.y2 < d.y1 || kutu.y1 > d.y2))

  // Yukarıdan aşağıya yerleştir: sıra sabit olsun ki her render aynı görünsün.
  const sirali = etiketler.slice().sort((a, b) => a.y - b.y || a.x - b.x)

  for (const e of sirali) {
    const genislik = e.metin.length * harfGenislik
    // Haritanın sağ kenarına yakınsa etiket sola yazılır, taşmasın.
    const solda = e.x + e.bosluk + genislik > haritaGenislik
    const ankraX = solda ? e.x - e.bosluk : e.x + e.bosluk

    const kutuIcin = (y) => ({
      x1: solda ? ankraX - genislik : ankraX,
      x2: solda ? ankraX : ankraX + genislik,
      y1: y - satirYuksek / 2,
      y2: y + satirYuksek / 2,
    })

    let y = e.y
    if (cakisiyor(kutuIcin(y))) {
      // Önce aşağı, sonra yukarı doğru boş satır ara
      const adim = satirYuksek + satirYuksek * 0.12
      let bulundu = false
      for (let i = 1; i <= 12 && !bulundu; i++) {
        for (const aday of [e.y + adim * i, e.y - adim * i]) {
          if (!cakisiyor(kutuIcin(aday))) {
            y = aday
            bulundu = true
            break
          }
        }
      }
    }

    dolu.push(kutuIcin(y))
    yerlesim.push({ ...e, ankraX, etiketY: y, solda, kaydi: Math.abs(y - e.y) > satirYuksek * 0.3 })
  }
  return yerlesim
}

/**
 * Bağlantı çizgileri ve yazılar ayrı katmanlarda çizilir: aynı <g> içinde
 * olsalardı sonraki yazının halesi önceki çizgiyi siliyordu.
 */
function Etiketler({ veriler, px }) {
  return (
    <g className="harita-etiketler">
      <g className="etiket-cizgiler">
        {veriler
          .filter((e) => e.kaydi)
          .map((e, i) => (
            // Çizgi iki kez çizilir: altta koyu kalın bir hale, üstte ince
            // çizginin kendisi. Aksi hâlde yazının üstünden geçerken kayboluyor.
            <g key={i}>
              <line className="hale" x1={e.x} y1={e.y} x2={e.ankraX} y2={e.etiketY} strokeWidth={px(3)} />
              <line x1={e.x} y1={e.y} x2={e.ankraX} y2={e.etiketY} strokeWidth={px(1.2)} />
            </g>
          ))}
      </g>
      {veriler.map((e, i) => (
        <text
          key={i}
          x={e.ankraX}
          y={e.etiketY + px(4)}
          fontSize={px(12)}
          strokeWidth={px(3)}
          textAnchor={e.solda ? 'end' : 'start'}
        >
          {e.metin}
        </text>
      ))}
    </g>
  )
}

/**
 * Dilsiz Türkiye haritası.
 *
 * isaretler: [{ lat, lng, renk, buyuk, tip: 'saha'|'tesis', etiket, numara }]
 * lejant:    [{ renk, ad }] - harita altında renk açıklaması
 *
 * Not: işaret ve yazı boyutları ekranda sabit piksel görünecek şekilde
 * ölçeklenir. viewBox birimi kullanılsaydı telefonda noktalar iğne başı,
 * geniş ekranda kocaman görünürdü.
 */
export default function TurkiyeHaritasi({ isaretler = [], lejant = [], etiketGoster = false }) {
  const kutuRef = useRef(null)
  const [genislikPx, setGenislikPx] = useState(900)

  useEffect(() => {
    const el = kutuRef.current
    if (!el) return
    const olc = () => setGenislikPx(el.clientWidth || 900)
    olc()
    const gozlemci = new ResizeObserver(olc)
    gozlemci.observe(el)
    return () => gozlemci.disconnect()
  }, [])

  // px -> viewBox birimi
  const k = (GORUNUM.genislik + PAY * 2) / Math.max(genislikPx, 1)
  const px = (n) => n * k

  // Telefon genişliğinde yazılar haritayı kaplıyor; etiketler yalnızca yeterli
  // yer varsa çizilir. (Dar ekranda saha listesi zaten haritanın altında.)
  const dar = genislikPx < 470
  const etiketler = etiketGoster && !dar

  // Sabit piksel boyu dar ekranda haritaya göre iri kalıyor; biraz küçültülür.
  // Düz saha noktaları, numaralı yuvarlaklarla aynı boyutta.
  const boy = dar ? { numara: 9, saha: 9, tesis: 1.4 } : { numara: 11, saha: 11, tesis: 1.7 }

  return (
    <div className="harita-kutu" ref={kutuRef}>
      <svg className="harita" viewBox={VIEWBOX} role="img" aria-label="Türkiye haritası">
        <g className="harita-iller">
          {ILLER.map((il) => (
            <path key={il.ad} d={il.d} strokeWidth={px(0.6)} />
          ))}
          {ADALAR.map((ada) => (
            <path key={ada.ad} d={ada.d} strokeWidth={px(0.6)} />
          ))}
        </g>

        <g className="harita-isaretler">
          {isaretler.map((m, i) => {
            const { x, y } = konumdanXY(m.lat, m.lng)
            const renk = m.renk || 'var(--isaret)'

            if (m.numara != null) {
              return (
                <g key={i} className="harita-numara">
                  <circle cx={x} cy={y} r={px(boy.numara)} fill={renk} strokeWidth={px(1.5)} />
                  <text x={x} y={y} fontSize={px(boy.numara * 1.1)} dy={px(boy.numara * 0.38)}>
                    {ROMEN[m.numara] ?? m.numara + 1}
                  </text>
                </g>
              )
            }

            if (m.tip === 'tesis') {
              const s = px(boy.tesis)
              return (
                <g key={i} transform={`translate(${x} ${y}) scale(${s})`} className="harita-tesis">
                  <path d="M-6 4 L-6 -1 L-2.5 1.5 L-2.5 -1 L1 1.5 L1 -4 L6 -4 L6 4 Z" fill={renk} strokeWidth={1.2} />
                </g>
              )
            }

            return (
              <circle
                key={i}
                className={m.vurgu ? 'harita-saha vurgu' : 'harita-saha'}
                cx={x}
                cy={y}
                r={px(boy.saha)}
                fill={renk}
                strokeWidth={px(1.2)}
              />
            )
          })}
        </g>

        {etiketler && (
          <Etiketler
            veriler={etiketleriYerlestir(
              isaretler
                .filter((m) => m.etiket)
                .map((m) => {
                  const { x, y } = konumdanXY(m.lat, m.lng)
                  return { x, y, metin: m.etiket, bosluk: px(boy.saha + 4) }
                }),
              px(12) * 0.52,
              px(12) * 1.25,
              GORUNUM.genislik,
            )}
            px={px}
          />
        )}
      </svg>

      {lejant.length > 0 && (
        <div className="harita-lejant">
          {lejant.map((l) => (
            <span key={l.ad} className="lejant-oge">
              <span
                className={l.tip === 'tesis' ? 'lejant-kare' : 'lejant-nokta'}
                style={{ background: l.renk }}
              />
              {l.ad}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
