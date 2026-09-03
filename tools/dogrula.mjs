/**
 * koordinatlar.json içindeki her noktanın, veride yazan ilin sınırları
 * içinde kalıp kalmadığını il poligonlarıyla test eder.
 *
 * Yanlış geocode edilmiş bir yer (ör. aynı adlı başka bir köy) buradan
 * yakalanır. Kullanım: node tools/dogrula.mjs
 */
import { readFileSync } from 'node:fs'

const KOK = new URL('../', import.meta.url)
const geo = JSON.parse(readFileSync(new URL('tools/tr-cities.geojson', KOK), 'utf8'))
const koord = JSON.parse(readFileSync(new URL('src/data/koordinatlar.json', KOK), 'utf8'))

const AD_DUZELT = { Afyon: 'Afyonkarahisar' }

function halkaIcinde(nokta, halka) {
  const [x, y] = nokta
  let ic = false
  for (let i = 0, j = halka.length - 1; i < halka.length; j = i++) {
    const [xi, yi] = halka[i]
    const [xj, yj] = halka[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ic = !ic
  }
  return ic
}

function poligonIcinde(nokta, poligon) {
  if (!halkaIcinde(nokta, poligon[0])) return false
  for (let i = 1; i < poligon.length; i++) if (halkaIcinde(nokta, poligon[i])) return false
  return true
}

function hangiIl(lat, lng) {
  for (const f of geo.features) {
    const liste = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    for (const p of liste) {
      if (poligonIcinde([lng, lat], p)) return AD_DUZELT[f.properties.name] ?? f.properties.name
    }
  }
  return null
}

// Kaynak GeoJSON'da bulunmayan adalar: bu noktalar hiçbir il poligonuna
// düşmez ama doğrudur (harita adaları build-map.mjs ile ayrıca çizer).
const ADA_ISTISNA = new Set(['Marmara Adası|Balıkesir'])

let hata = 0
for (const [key, deger] of Object.entries(koord)) {
  if (ADA_ISTISNA.has(key)) continue
  const beklenen = key.split('|')[1]
  const bulunan = hangiIl(deger.lat, deger.lng)
  if (bulunan !== beklenen) {
    hata++
    console.log(`✗ ${key.padEnd(34)} -> ${bulunan ?? 'sınır dışı / denizde'}`)
    console.log(`   ${deger.lat}, ${deger.lng}  |  ${deger.kaynak}`)
  }
}
console.log(hata === 0 ? `\nTüm ${Object.keys(koord).length} nokta doğru ilde.` : `\n${hata} nokta yanlış ilde.`)
