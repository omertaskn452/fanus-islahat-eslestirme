/**
 * tr-cities.geojson -> src/data/turkiyeHarita.js
 *
 * Ham il sınırlarını (WGS84) basit bir eş dikdörtgen izdüşümle SVG koordinatına
 * çevirir, Douglas-Peucker ile sadeleştirir ve hazır <path d="..."> stringleri
 * üretir. Uygulama çalışırken projeksiyon hesabı yapmaz; aynı formülle
 * lat/lng -> x/y çeviren `projeksiyon` bilgisi de dosyaya yazılır.
 *
 * Kullanım: node tools/build-map.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'

const GEN = 1000 // hedef genişlik (viewBox birimi)
const TOLERANS = 0.55 // sadeleştirme toleransı (viewBox birimi)
const MIN_ALAN = 1.2 // bundan küçük adacıkları at (viewBox birimi kare)

const geo = JSON.parse(readFileSync(new URL('./tr-cities.geojson', import.meta.url), 'utf8'))

const AD_DUZELT = { Afyon: 'Afyonkarahisar' }

// --- sınırlar ---
let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90
const herNokta = (fn) => {
  for (const f of geo.features) {
    const pl = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    for (const poly of pl) for (const ring of poly) for (const p of ring) fn(p)
  }
}
herNokta(([lon, lat]) => {
  if (lon < minLon) minLon = lon
  if (lon > maxLon) maxLon = lon
  if (lat < minLat) minLat = lat
  if (lat > maxLat) maxLat = lat
})

const lat0 = (minLat + maxLat) / 2
const k = Math.cos((lat0 * Math.PI) / 180) // boylam daralması
const olcek = GEN / ((maxLon - minLon) * k)
const yuk = (maxLat - minLat) * olcek

const izdusum = ([lon, lat]) => [(lon - minLon) * k * olcek, (maxLat - lat) * olcek]

// --- Douglas-Peucker ---
const mesafe2 = (p, a, b) => {
  let [x, y] = p, [x1, y1] = a, [x2, y2] = b
  let dx = x2 - x1, dy = y2 - y1
  if (dx !== 0 || dy !== 0) {
    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    if (t > 1) { x1 = x2; y1 = y2 } else if (t > 0) { x1 += dx * t; y1 += dy * t }
  }
  dx = x - x1; dy = y - y1
  return dx * dx + dy * dy
}
const sadelestir = (pts, tol) => {
  if (pts.length < 4) return pts
  const t2 = tol * tol
  const tut = new Array(pts.length).fill(false)
  tut[0] = tut[pts.length - 1] = true
  const yigin = [[0, pts.length - 1]]
  while (yigin.length) {
    const [i, j] = yigin.pop()
    let enUzak = 0, idx = -1
    for (let m = i + 1; m < j; m++) {
      const d = mesafe2(pts[m], pts[i], pts[j])
      if (d > enUzak) { enUzak = d; idx = m }
    }
    if (enUzak > t2) { tut[idx] = true; yigin.push([i, idx], [idx, j]) }
  }
  return pts.filter((_, i) => tut[i])
}

const alan = (pts) => {
  let a = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
    a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1])
  return Math.abs(a / 2)
}

const yuvarla = (n) => Math.round(n * 10) / 10

// Kaynak GeoJSON yalnızca il sınırlarını içeriyor; adalar veride yok.
// Kitaplardaki dilsiz haritalarda göründükleri ve üzerlerinde maden/işaret
// bulunabildiği için (ör. Marmara Adası - mermer) elle ekleniyor.
const ADALAR = [
  { ad: 'Marmara Adası', lat: 40.605, lng: 27.6, rLat: 0.045, rLng: 0.13 },
  { ad: 'Avşa Adası', lat: 40.5, lng: 27.48, rLat: 0.025, rLng: 0.04 },
  { ad: 'Gökçeada', lat: 40.17, lng: 25.9, rLat: 0.05, rLng: 0.11 },
  { ad: 'Bozcaada', lat: 39.83, lng: 26.04, rLat: 0.025, rLng: 0.045 },
]
const adaYolu = (ada) => {
  const n = 20
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    pts.push(izdusum([ada.lng + Math.cos(a) * ada.rLng, ada.lat + Math.sin(a) * ada.rLat]))
  }
  return 'M' + pts.map(([x, y]) => `${yuvarla(x)} ${yuvarla(y)}`).join('L') + 'Z'
}

const iller = []
for (const f of geo.features) {
  const ad = AD_DUZELT[f.properties.name] ?? f.properties.name
  const polyList = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  const parcalar = []
  for (const poly of polyList) {
    for (const ring of poly) {
      let pts = ring.map(izdusum)
      // ardışık tekrarları at
      pts = pts.filter((p, i) => i === 0 || Math.abs(p[0] - pts[i - 1][0]) > 1e-9 || Math.abs(p[1] - pts[i - 1][1]) > 1e-9)
      if (alan(pts) < MIN_ALAN) continue
      pts = sadelestir(pts, TOLERANS)
      if (pts.length < 3) continue
      parcalar.push('M' + pts.map(([x, y]) => `${yuvarla(x)} ${yuvarla(y)}`).join('L') + 'Z')
    }
  }
  // merkez: en büyük parçanın ağırlık merkezi yerine bbox merkezi yeterli
  iller.push({ ad, d: parcalar.join('') })
}
iller.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))

const cikti = `// OTOMATIK URETILDI - elle duzenlemeyin.
// Kaynak: tools/tr-cities.geojson  |  Uretici: tools/build-map.mjs
// Yeniden uretmek icin: node tools/build-map.mjs

/** SVG viewBox olculeri */
export const GORUNUM = { genislik: ${GEN}, yukseklik: ${Math.round(yuk)} }

/** Enlem/boylami harita koordinatina cevirir (build ile ayni izdusum). */
export function konumdanXY(lat, lng) {
  const x = (lng - ${minLon.toFixed(6)}) * ${k.toFixed(9)} * ${olcek.toFixed(6)}
  const y = (${maxLat.toFixed(6)} - lat) * ${olcek.toFixed(6)}
  return { x, y }
}

/** 81 il: { ad, d } - d dogrudan <path d> icinde kullanilir. */
export const ILLER = ${JSON.stringify(iller, null, 0).replace(/\},\{/g, '},\n{')}

/** Kaynak veride bulunmayan, elle eklenen adalar. */
export const ADALAR = ${JSON.stringify(ADALAR.map((a) => ({ ad: a.ad, d: adaYolu(a) })), null, 0).replace(/\},\{/g, '},\n{')}
`
writeFileSync(new URL('../src/data/turkiyeHarita.js', import.meta.url), cikti, 'utf8')
console.log(`il: ${iller.length}  viewBox: ${GEN}x${Math.round(yuk)}  boyut: ${(cikti.length / 1024).toFixed(1)} KB`)
