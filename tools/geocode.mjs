/**
 * madenler.json içindeki saha/tesis yerlerinin koordinatlarını bulur.
 *
 * Kaynak: OpenStreetMap Nominatim (saniyede 1 istek sınırına uyulur).
 * Sonuç src/data/koordinatlar.json içine yazılır ve bir daha sorgulanmaz;
 * yani bu script yalnızca yeni yer eklendiğinde çalıştırılır.
 *
 * Nominatim'in yanlış yeri bulduğu durumlar için tools/koordinat-elle.json
 * kullanılır; oradaki değerler her zaman önceliklidir.
 *
 * Kullanım: node tools/geocode.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const KOK = new URL('../', import.meta.url)
const MADEN_YOLU = new URL('src/data/madenler.json', KOK)
const CIKTI_YOLU = new URL('src/data/koordinatlar.json', KOK)
const ELLE_YOLU = new URL('tools/koordinat-elle.json', KOK)

const oku = (url, varsayilan) => (existsSync(url) ? JSON.parse(readFileSync(url, 'utf8')) : varsayilan)

const veri = JSON.parse(readFileSync(MADEN_YOLU, 'utf8'))
const elle = oku(ELLE_YOLU, {})
const mevcut = oku(CIKTI_YOLU, {})

/** Bir nokta için sabit anahtar: "Emet|Kütahya" */
export const anahtar = (n) => `${n.yer}|${n.il}`

// Tüm noktaları topla (saha + tesis)
const noktalar = new Map()
for (const maden of veri.madenler) {
  for (const n of [...maden.sahalar, ...(maden.tesisler || [])]) {
    noktalar.set(anahtar(n), n.arama || `${n.yer}, ${n.il}`)
  }
}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms))

async function bul(sorgu) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'tr')
  url.searchParams.set('q', sorgu)
  const cevap = await fetch(url, { headers: { 'User-Agent': 'kpss-cografya-calisma-uygulamasi/1.0' } })
  if (!cevap.ok) throw new Error(`HTTP ${cevap.status}`)
  const sonuc = await cevap.json()
  if (!sonuc.length) return null
  return {
    lat: Number(Number(sonuc[0].lat).toFixed(4)),
    lng: Number(Number(sonuc[0].lon).toFixed(4)),
    kaynak: sonuc[0].display_name,
  }
}

const cikti = { ...mevcut }
let yeni = 0
let hata = 0

for (const [key, sorgu] of noktalar) {
  if (elle[key]) {
    cikti[key] = { ...elle[key], kaynak: 'elle' }
    continue
  }
  if (cikti[key] && cikti[key].kaynak !== 'elle') continue // zaten var
  try {
    const sonuc = await bul(sorgu)
    if (sonuc) {
      cikti[key] = sonuc
      yeni++
      console.log(`  ✓ ${key.padEnd(34)} ${sonuc.lat}, ${sonuc.lng}`)
    } else {
      hata++
      console.log(`  ✗ ${key.padEnd(34)} BULUNAMADI ("${sorgu}")`)
    }
  } catch (e) {
    hata++
    console.log(`  ! ${key.padEnd(34)} ${e.message}`)
  }
  await bekle(1100) // Nominatim kullanım şartı: en fazla 1 istek/saniye
}

// Artık kullanılmayan anahtarları temizle
for (const key of Object.keys(cikti)) {
  if (!noktalar.has(key)) delete cikti[key]
}

const sirali = Object.fromEntries(Object.keys(cikti).sort((a, b) => a.localeCompare(b, 'tr')).map((k) => [k, cikti[k]]))
writeFileSync(CIKTI_YOLU, JSON.stringify(sirali, null, 2) + '\n', 'utf8')
console.log(`\ntoplam nokta: ${noktalar.size}  |  yeni: ${yeni}  |  bulunamayan: ${hata}`)
if (hata) console.log('Bulunamayanlar için tools/koordinat-elle.json dosyasına { "Yer|İl": { "lat": 00.00, "lng": 00.00 } } ekleyip tekrar çalıştır.')
