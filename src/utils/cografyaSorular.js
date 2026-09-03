// Maden sorularını üretir. Soru objesi KulturApp'teki formatla aynıdır
// ({ id, soru, secenekler, dogru, aciklama }); ek olarak opsiyonel bir
// `harita` alanı taşır: { isaretler } -> TurkiyeHaritasi bileşenine verilir.
//
// ÖNEMLİ: Soru köklerinde kullanılan bütün maden özellikleri madenler.json'dan
// birebir gelir. Buraya elle bilgi/özellik yazılmaz.
//
// Soru tipleri (deste = haritalı / haritasız):
//   HARİTALI
//     harita-maden  Haritada bir madenin sahaları işaretli -> "hangi maden?"
//     numarali      Haritada I-IV numaralı yerler -> "hangisinde X çıkarılır?"
//     eksik-maden   Haritada 3 madenin yerleri -> "hangisi gösterilmemiştir?"
//   HARİTASIZ
//     bilgi-maden   Madenin özellikleri verilir -> "hangi maden?"
//     maden-saha    Maden verilir -> "hangi sahada çıkarılır?"
//     tesis-il      "X tesisi hangi ildedir?"
//     tesis-neden   "X tesisi hangi faktöre göre kurulmuştur?"

import koordinatlar from '../data/koordinatlar.json'

const ISARET = '#f87171'

/** Tesis yer seçimi faktörleri (madenler.json'daki `neden` alanı). */
const NEDEN_METNI = {
  hammadde: 'Ham maddeye yakınlık',
  ulasim: 'Ulaşım kolaylığı',
  enerji: 'Enerji kaynağına yakınlık',
}
const NEDEN_CELDIRICI = 'Pazara yakınlık'

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const rastgele = (arr) => arr[Math.floor(Math.random() * arr.length)]

/** "Emet|Kütahya" -> { lat, lng } */
export function konumBul(nokta) {
  return koordinatlar[`${nokta.yer}|${nokta.il}`] || null
}

/** Şıkta ve etikette görünen ad. `ad` verilmişse o kullanılır. */
export function sahaEtiketi(saha) {
  if (saha.ad) return saha.ad
  return saha.yer === saha.il ? saha.il : `${saha.yer} (${saha.il})`
}

const illeriniAl = (maden) => new Set(maden.sahalar.map((s) => s.il))

const KONUMLU = (n) => !!konumBul(n)

/**
 * Madenin "asıl" çıkarıldığı, genelgeçer olarak bilinen yerleri (ör. fosfat ->
 * Mazıdağı, barit -> Alanya). Harita soruları ve doğru cevaplar bunlardan
 * seçilir; ikincil sahalar yalnızca keşif ekranında ve açıklamalarda görünür.
 * Hiçbiri işaretlenmemişse bütün sahalar kullanılır.
 */
function asilSahalar(maden) {
  const asil = maden.sahalar.filter((s) => s.asil && KONUMLU(s))
  return asil.length ? asil : maden.sahalar.filter(KONUMLU)
}

const sahaIsaretleri = (maden, { etiket = false, renk = ISARET, sadeceAsil = false } = {}) =>
  (sadeceAsil ? asilSahalar(maden) : maden.sahalar)
    .map((s) => {
      const k = konumBul(s)
      return k ? { ...k, renk, etiket: etiket ? sahaEtiketi(s) : null } : null
    })
    .filter(Boolean)

const tesisIsaretleri = (maden, { etiket = false } = {}) =>
  (maden.tesisler || [])
    .map((t) => {
      const k = konumBul(t)
      return k ? { ...k, tip: 'tesis', renk: '#a3a3a3', etiket: etiket ? t.ad : null } : null
    })
    .filter(Boolean)

/** Madenin sahalarını "Emet (Kütahya), Bigadiç (Balıkesir)" biçiminde yazar. */
const sahaListesi = (maden) => maden.sahalar.map(sahaEtiketi).join(', ')

// --- çeldirici havuzları --------------------------------------------------

/** İki madenin çıkarıldığı iller birebir aynı mı? */
function ayniIllerdeMi(a, b) {
  const A = illeriniAl(a)
  const B = illeriniAl(b)
  return A.size === B.size && [...A].every((il) => B.has(il))
}

/**
 * Çeldirici maden adları.
 * `haritaSorusu` verildiğinde hedefle aynı illerde çıkarılan madenler elenir:
 * harita ikisini de gösterdiği için soru iki doğru cevaplı olurdu.
 */
function madenCeldiricileri(hedef, tumMadenler, adet = 3, haritaSorusu = false) {
  const uygun = tumMadenler.filter(
    (m) => m.id !== hedef.id && (!haritaSorusu || !ayniIllerdeMi(hedef, m)),
  )
  return shuffle(uygun).slice(0, adet)
}

/**
 * Hedef madenin çıkarılmadığı sahalar. "Yanlış" şık gerçekten yanlış olmalı:
 * hedefin sahasının bulunduğu illerden hiçbiri çeldirici olamaz.
 */
function sahaCeldiricileri(hedef, tumMadenler, adet = 3) {
  const yasakIller = illeriniAl(hedef)
  const uygun = (s) => !yasakIller.has(s.il) && KONUMLU(s)

  // Çeldiriciler de tanınan yerler olsun: önce diğer madenlerin asıl sahaları
  // denenir, havuz yetmezse ikincil sahalara inilir.
  const asilHavuz = []
  const digerHavuz = []
  for (const m of tumMadenler) {
    if (m.id === hedef.id) continue
    const asilAdlari = new Set(asilSahalar(m).map((s) => s.yer))
    for (const s of m.sahalar) {
      if (!uygun(s)) continue
      ;(asilAdlari.has(s.yer) ? asilHavuz : digerHavuz).push(s)
    }
  }

  const secilen = []
  const kullanilanIl = new Set()
  for (const havuz of [shuffle(asilHavuz), shuffle(digerHavuz)]) {
    for (const s of havuz) {
      if (secilen.length >= adet) break
      if (kullanilanIl.has(s.il)) continue // iki şık aynı ilden olmasın
      kullanilanIl.add(s.il)
      secilen.push(s)
    }
  }
  return secilen
}

// --- soru üreticileri -----------------------------------------------------

function soruHaritaMaden(maden, tumMadenler) {
  const isaretler = sahaIsaretleri(maden, { sadeceAsil: true })
  if (isaretler.length === 0) return null
  const celdiriciler = madenCeldiricileri(maden, tumMadenler, 3, true)
  if (celdiriciler.length < 3) return null

  return {
    tip: 'harita-maden',
    haritali: true,
    soru: 'Yukarıdaki haritada çıkarıldığı başlıca alanlar işaretlenen maden aşağıdakilerden hangisidir?',
    dogru: maden.ad,
    secenekler: shuffle([maden.ad, ...celdiriciler.map((m) => m.ad)]),
    aciklama: `${maden.ad}: ${sahaListesi(maden)}.`,
    harita: { isaretler },
  }
}

function soruBilgiMaden(maden, tumMadenler) {
  if (!maden.bilgiler || maden.bilgiler.length < 2) return null
  const celdiriciler = madenCeldiricileri(maden, tumMadenler)
  if (celdiriciler.length < 3) return null

  const govde = shuffle(maden.bilgiler)
    .slice(0, 3)
    .map((b) => `• ${b}`)
    .join('\n')

  return {
    tip: 'bilgi-maden',
    haritali: false,
    soru: `${govde}\n\nYukarıda özellikleri verilen maden aşağıdakilerden hangisidir?`,
    dogru: maden.ad,
    secenekler: shuffle([maden.ad, ...celdiriciler.map((m) => m.ad)]),
    aciklama: `${maden.ad}: ${sahaListesi(maden)}.`,
    harita: null,
  }
}

function soruMadenSaha(maden, tumMadenler) {
  const celdiriciler = sahaCeldiricileri(maden, tumMadenler)
  if (celdiriciler.length < 3) return null
  const dogruSaha = rastgele(asilSahalar(maden))
  if (!dogruSaha) return null

  // İpucu cümlesi hiçbir yer adı geçirmesin: doğru sahayı söylerse cevabı
  // verir, başka bir sahayı söylerse öğrenci onu şıklarda arar.
  const yerAdlari = [...maden.sahalar, ...(maden.tesisler || [])].flatMap((s) => [s.yer, s.il])
  const uygunBilgiler = (maden.bilgiler || []).filter(
    (b) => !yerAdlari.some((yer) => b.includes(yer)),
  )
  const ipucu = uygunBilgiler.length ? `${rastgele(uygunBilgiler)}.\n\n` : ''

  return {
    tip: 'maden-saha',
    haritali: false,
    soru: `${ipucu}${maden.ad} madeni aşağıdaki sahaların hangisinde çıkarılır?`,
    dogru: sahaEtiketi(dogruSaha),
    secenekler: shuffle([dogruSaha, ...celdiriciler].map(sahaEtiketi)),
    aciklama: `${maden.ad} başlıca şu alanlarda çıkarılır: ${sahaListesi(maden)}.`,
    harita: null,
  }
}

/** Numaralı noktalar üst üste binerse harita okunmaz olur. */
function noktalarAyriMi(sahalar) {
  const konumlar = sahalar.map(konumBul)
  for (let i = 0; i < konumlar.length; i++) {
    for (let j = i + 1; j < konumlar.length; j++) {
      const dl = Math.abs(konumlar[i].lat - konumlar[j].lat)
      const dg = Math.abs(konumlar[i].lng - konumlar[j].lng)
      if (dl < 0.7 && dg < 0.7) return false
    }
  }
  return true
}

function soruNumarali(maden, tumMadenler) {
  const dogruSaha = rastgele(asilSahalar(maden))
  if (!dogruSaha) return null

  // Çeldiriciler rastgele seçildiği için ilk deneme üst üste binen noktalar
  // verebilir; birkaç kez yeniden denenir.
  let celdiriciler = null
  for (let deneme = 0; deneme < 8; deneme++) {
    const aday = sahaCeldiricileri(maden, tumMadenler)
    if (aday.length < 3) return null
    if (noktalarAyriMi([dogruSaha, ...aday])) {
      celdiriciler = aday
      break
    }
  }
  if (!celdiriciler) return null

  const noktalar = shuffle([
    { saha: dogruSaha, dogru: true },
    ...celdiriciler.map((s) => ({ saha: s, dogru: false })),
  ])

  const ROMEN = ['I', 'II', 'III', 'IV']
  const isaretler = noktalar.map((n, i) => ({ ...konumBul(n.saha), numara: i, renk: ISARET }))
  const dogruIndex = noktalar.findIndex((n) => n.dogru)

  return {
    tip: 'numarali',
    haritali: true,
    soru: `Yukarıdaki haritada numaralandırılmış yerlerden hangisinde ${maden.ad.toLocaleLowerCase('tr')} çıkarılır?`,
    dogru: ROMEN[dogruIndex],
    secenekler: ROMEN.slice(),
    aciklama: `Doğru cevap ${ROMEN[dogruIndex]} numaralı ${sahaEtiketi(dogruSaha)}. ${maden.ad}: ${sahaListesi(maden)}.`,
    harita: { isaretler },
  }
}

function soruEksikMaden(maden, tumMadenler) {
  // maden = haritada GÖSTERİLMEYEN (doğru cevap) olan.
  const yasakIller = illeriniAl(maden)
  const uygun = tumMadenler.filter(
    (m) =>
      m.id !== maden.id &&
      m.sahalar.some(KONUMLU) &&
      ![...illeriniAl(m)].some((il) => yasakIller.has(il)),
  )
  if (uygun.length < 3) return null

  // Gösterilen üç maden birbirinden de ayrı illerde olsun ki harita okunaklı kalsın
  const gosterilen = []
  const kullanilanIl = new Set(yasakIller)
  for (const m of shuffle(uygun)) {
    if (gosterilen.length >= 3) break
    const iller = illeriniAl(m)
    if ([...iller].some((il) => kullanilanIl.has(il))) continue
    iller.forEach((il) => kullanilanIl.add(il))
    gosterilen.push(m)
  }
  if (gosterilen.length < 3) return null

  return {
    tip: 'eksik-maden',
    haritali: true,
    soru:
      'Yukarıdaki haritada üç madenin çıkarıldığı başlıca alanlar işaretlenmiştir.\n\n' +
      'Buna göre, aşağıdaki madenlerden hangisinin çıkarıldığı alanlar haritada gösterilmemiştir?',
    dogru: maden.ad,
    secenekler: shuffle([maden.ad, ...gosterilen.map((m) => m.ad)]),
    aciklama:
      `Haritada gösterilenler: ${gosterilen.map((m) => `${m.ad} (${asilSahalar(m).map(sahaEtiketi).join(', ')})`).join('; ')}. ` +
      `${maden.ad} ise şu alanlarda çıkarılır: ${sahaListesi(maden)}.`,
    harita: { isaretler: gosterilen.flatMap((m) => sahaIsaretleri(m, { sadeceAsil: true })) },
  }
}

function soruTesisIl(maden, tumMadenler) {
  const tesisler = (maden.tesisler || []).filter(KONUMLU)
  if (tesisler.length === 0) return null
  const tesis = rastgele(tesisler)

  // Çeldirici iller: hedef madenin hiçbir sahasının/tesisinin bulunmadığı iller
  const yasak = new Set([...illeriniAl(maden), ...(maden.tesisler || []).map((t) => t.il)])
  const havuz = []
  for (const m of tumMadenler) {
    for (const n of [...m.sahalar, ...(m.tesisler || [])]) {
      if (!yasak.has(n.il) && !havuz.includes(n.il)) havuz.push(n.il)
    }
  }
  if (havuz.length < 3) return null

  return {
    tip: 'tesis-il',
    haritali: false,
    soru: `${tesis.ad} aşağıdaki illerden hangisinde bulunur?`,
    dogru: tesis.il,
    secenekler: shuffle([tesis.il, ...shuffle(havuz).slice(0, 3)]),
    aciklama: `${tesis.ad} ${tesis.il}'dedir. ${maden.ad}: ${sahaListesi(maden)}.`,
    harita: null,
  }
}

function soruTesisNeden(maden) {
  const tesisler = (maden.tesisler || []).filter((t) => NEDEN_METNI[t.neden])
  if (tesisler.length === 0) return null
  const tesis = rastgele(tesisler)
  const dogru = NEDEN_METNI[tesis.neden]
  const celdiriciler = [...Object.values(NEDEN_METNI).filter((x) => x !== dogru), NEDEN_CELDIRICI]

  return {
    tip: 'tesis-neden',
    haritali: false,
    soru: `${tesis.ad}, aşağıdaki yer seçimi faktörlerinden hangisine göre kurulmuştur?`,
    dogru,
    secenekler: shuffle([dogru, ...shuffle(celdiriciler).slice(0, 3)]),
    aciklama: `${tesis.ad} — ${dogru}.`,
    harita: null,
  }
}

const URETICILER = [
  {
    tip: 'harita-maden',
    haritali: true,
    fn: soruHaritaMaden,
    sayilir: (m, tum) => m.sahalar.some(KONUMLU) && tum.length >= 4,
  },
  {
    tip: 'numarali',
    haritali: true,
    fn: soruNumarali,
    sayilir: (m, tum) => m.sahalar.some(KONUMLU) && sahaCeldiricileri(m, tum).length >= 3,
  },
  {
    tip: 'eksik-maden',
    haritali: true,
    fn: soruEksikMaden,
    sayilir: (m, tum) => {
      const yasak = illeriniAl(m)
      return (
        tum.filter(
          (x) =>
            x.id !== m.id &&
            x.sahalar.some(KONUMLU) &&
            ![...illeriniAl(x)].some((il) => yasak.has(il)),
        ).length >= 3
      )
    },
  },
  {
    tip: 'bilgi-maden',
    haritali: false,
    fn: soruBilgiMaden,
    sayilir: (m, tum) => (m.bilgiler?.length ?? 0) >= 2 && tum.length >= 4,
  },
  {
    tip: 'maden-saha',
    haritali: false,
    fn: soruMadenSaha,
    sayilir: (m, tum) => m.sahalar.some(KONUMLU) && sahaCeldiricileri(m, tum).length >= 3,
  },
  {
    tip: 'tesis-il',
    haritali: false,
    fn: soruTesisIl,
    sayilir: (m) => (m.tesisler || []).some(KONUMLU),
  },
  {
    tip: 'tesis-neden',
    haritali: false,
    fn: soruTesisNeden,
    sayilir: (m) => (m.tesisler || []).some((t) => NEDEN_METNI[t.neden]),
  },
]

/**
 * Desteler. Her deste hangi soru tiplerinin sorulacağını belirler; `tipler`
 * verilmemişse bütün tipler kullanılır. Ekrandaki kartlar da bu listeden gelir.
 */
export const DESTELER = [
  {
    id: 'haritadan-maden',
    ad: 'Haritadan Maden Bul',
    aciklama: 'Tek tip soru: haritada çıkarıldığı yerler işaretli, "hangi maden?" diye sorulur',
    tipler: ['harita-maden'],
  },
  {
    id: 'haritali',
    ad: 'Haritalı Sorular',
    aciklama: 'İşaretli alanlar, numaralandırılmış yerler ve haritada gösterilmeyen maden',
    tipler: ['harita-maden', 'numarali', 'eksik-maden'],
  },
  {
    id: 'haritasiz',
    ad: 'Haritasız Sorular',
    aciklama: 'Özelliklerinden madeni bulma, çıkarıldığı saha ve işleme tesisi soruları',
    tipler: ['bilgi-maden', 'maden-saha', 'tesis-il', 'tesis-neden'],
  },
  { id: 'karma', ad: 'Karışık', aciklama: 'Bütün soru tipleri birlikte' },
]

const ureticileriSuz = (desteId) => {
  const tipler = DESTELER.find((d) => d.id === desteId)?.tipler
  return tipler ? URETICILER.filter((u) => tipler.includes(u.tip)) : URETICILER
}

/**
 * Test için soru üretir.
 * Çeldiriciler her zaman tüm madenlerden seçilir; deste yalnızca soru tipini
 * (haritalı / haritasız) belirler.
 */
export function madenSorulariUret(veri, deste, adet) {
  const madenler = veri.madenler
  const ureticiler = ureticileriSuz(deste)
  if (madenler.length === 0 || ureticiler.length === 0) return []

  // Her (maden, tip) çifti bir aday. Karıştırılıp sırayla denenir; üretilemeyen
  // adaylar (yeterli çeldirici yok, koordinat yok...) sessizce atlanır.
  const adaylar = shuffle(madenler.flatMap((m) => ureticiler.map((u) => ({ maden: m, ...u }))))

  // Sorular madenlere olabildiğince eşit dağılsın: az soru istendiğinde her
  // madenden 1, çok istendiğinde daha derine inilir. ("Tümü" = sınır yok.)
  const madenBasinaSinir =
    adet === 'Tümü' ? ureticiler.length : Math.max(1, Math.ceil(adet / madenler.length))

  const sorular = []
  const madenSayaci = new Map()
  const kullanilanTipler = new Set()

  for (const aday of adaylar) {
    if (adet !== 'Tümü' && sorular.length >= adet) break
    const sayi = madenSayaci.get(aday.maden.id) || 0
    if (sayi >= madenBasinaSinir) continue

    const anahtar = `${aday.maden.id}::${aday.tip}`
    if (kullanilanTipler.has(anahtar)) continue

    const soru = aday.fn(aday.maden, madenler)
    if (!soru) continue

    kullanilanTipler.add(anahtar)
    madenSayaci.set(aday.maden.id, sayi + 1)
    sorular.push({ id: sorular.length, madenId: aday.maden.id, ...soru })
  }

  return sorular
}

/** Ekranlardaki "N olası soru" sayacı. */
export function olasiSoruSayisi(veri, deste) {
  let n = 0
  for (const maden of veri.madenler) {
    for (const u of ureticileriSuz(deste)) {
      if (u.sayilir(maden, veri.madenler)) n++
    }
  }
  return n
}

/** Keşif ekranı: bir madenin haritada gösterilecek tüm işaretleri. */
export function madenIsaretleri(maden) {
  return [...sahaIsaretleri(maden, { etiket: true }), ...tesisIsaretleri(maden, { etiket: true })]
}
