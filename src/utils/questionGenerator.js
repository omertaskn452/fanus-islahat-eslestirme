// Soru üreticisi - varlık ve özelliklerden 4 şıklı test soruları üretir.
// Çeldiriciler aynı grup içinden çekilir; havuz küçükse aynı kategori (deste) taranır.

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Soru kökünde bilgi cümlesi olarak kullanılan metin: sonunda noktalama yoksa
// nokta eklenir, böylece "…mıştır\n\nYukarıdaki bilgi…" yerine düzgün cümle çıkar.
function cumle(s) {
  const t = String(s).trim()
  return /[.!?…]$/.test(t) ? t : `${t}.`
}

// Bir grup içinde: aynı varlığın aynı tipte kaç özelliği var?
function countOzellikByTip(varlik, tip) {
  return varlik.ozellikler.filter(o => o.tip === tip).length
}

// Gruptaki tüm varlık adlarını topla
function collectVarlikAdlari(gruplar) {
  const s = new Set()
  for (const g of gruplar) for (const v of g.varliklar) s.add(v.ad)
  return s
}

// Sınıflandırma grubunda: sınıf değeri -> o sınıfa ait varlık adları
function collectSiniflar(grup) {
  const map = new Map()
  for (const v of grup.varliklar) {
    for (const o of v.ozellikler) {
      if (o.tip !== 'sinif') continue
      if (!map.has(o.deger)) map.set(o.deger, [])
      map.get(o.deger).push(v.ad)
    }
  }
  return map
}

// Sınıflandırma grubu için adaylar.
// 'sinif-olan'    -> "Hangisi X arasında yer alır?"  doğru: X üyesi, çeldiriciler: X dışından
// 'sinif-olmayan' -> "Hangisi X arasında yer almaz?" doğru: X dışından, çeldiriciler: X üyeleri
function collectSiniflandirmaCandidates(grup) {
  const cands = []
  const siniflar = collectSiniflar(grup)

  for (const varlik of grup.varliklar) {
    const sinifOz = varlik.ozellikler.find(o => o.tip === 'sinif')
    if (!sinifOz) continue
    const kendiSinif = sinifOz.deger

    // "hangisi X'tir?" -> diğer sınıflarda en az 3 çeldirici olmalı
    const disUyeSayisi = [...siniflar.entries()]
      .filter(([s]) => s !== kendiSinif)
      .reduce((n, [, uyeler]) => n + uyeler.length, 0)
    if (disUyeSayisi >= 3) {
      cands.push({ grup, varlik, ozellik: sinifOz, yon: 'sinif-olan', sorulanSinif: kendiSinif })
    }

    // "hangisi Y değildir?" -> Y'nin en az 3 üyesi olmalı (3 çeldirici için)
    for (const [sinif, uyeler] of siniflar) {
      if (sinif === kendiSinif) continue
      if (uyeler.length < 3) continue
      cands.push({ grup, varlik, ozellik: sinifOz, yon: 'sinif-olmayan', sorulanSinif: sinif })
    }
  }
  return cands
}

// Aday soru = { grup, varlik, ozellik, yon }
// yon: 'ozellik-ad' (özellik verilir, ad sorulur) veya 'ad-ozellik' (ad verilir, özellik sorulur)
function collectCandidates(gruplar) {
  const cands = []
  for (const grup of gruplar) {
    if (grup.tip === 'siniflandirma') {
      cands.push(...collectSiniflandirmaCandidates(grup))
      continue
    }
    for (const varlik of grup.varliklar) {
      for (const ozellik of varlik.ozellikler) {
        // ozellik -> ad: yalnızca bu (tip, deger) çifti grup içinde eşsizse güvenli.
        // (Değer başka varlıklarda da geçiyorsa, "bu değere sahip varlık kim?" belirsiz olur.)
        const valueOccurrences = grup.varliklar.reduce((cnt, vv) => cnt + vv.ozellikler.filter(oo => oo.tip === ozellik.tip && oo.deger === ozellik.deger).length, 0)
        if (valueOccurrences === 1) {
          cands.push({ grup, varlik, ozellik, yon: 'ozellik-ad' })
        }

        // ad -> ozellik: yalnızca terim grubu VE bu varlığın bu tipte tek özelliği varsa güvenli
        if (grup.tip === 'terim' && countOzellikByTip(varlik, ozellik.tip) === 1) {
          cands.push({ grup, varlik, ozellik, yon: 'ad-ozellik' })
        }
      }
    }
  }
  return cands
}

// Soru metnini üret. Şablonlar gruba özel — Türkçe dilbilgisi ekleri sabit yazılır.
function formatQuestion(cand) {
  const { grup, varlik, ozellik, yon } = cand

  // Sınıflandırma soruları: şıklarda anlam/ipucu verilmez, sadece kavram adları listelenir.
  if (yon === 'sinif-olan') {
    return `${grup.soruOnEki} aşağıdakilerden hangisi ${cand.sorulanSinif} arasında yer alır?`
  }
  if (yon === 'sinif-olmayan') {
    return `${grup.soruOnEki} aşağıdakilerden hangisi ${cand.sorulanSinif} arasında yer almaz?`
  }

  if (yon === 'ozellik-ad') return formatOzellikAd(grup, ozellik)
  return formatAdOzellik(grup, varlik, ozellik)
}

// Özellik verilir, varlığın adı sorulur.
function formatOzellikAd(grup, ozellik) {
  const d = ozellik.deger
  switch (grup.id) {
    case 'turk_islam_bilim_insanlari':
      if (ozellik.tip === 'unvan') return `"${d}" unvanı hangi bilim insanına aittir?`
      if (ozellik.tip === 'eser')  return `"${d}" adlı eser hangi bilim insanı tarafından yazılmıştır?`
      return `${cumle(d)}\n\nYukarıda hakkında bilgi verilen bilim insanı aşağıdakilerden hangisidir?`

    case 'osmanli_bilim_insanlari':
      if (ozellik.tip === 'unvan') return `"${d}" unvanı hangi Osmanlı bilim insanına aittir?`
      if (ozellik.tip === 'eser')  return `"${d}" adlı eser hangi Osmanlı bilim insanı tarafından yazılmıştır?`
      return `${cumle(d)}\n\nYukarıda hakkında bilgi verilen Osmanlı bilim insanı aşağıdakilerden hangisidir?`

    case 'ilk_turk_islam_yazarlari':
      if (ozellik.tip === 'eser')  return `"${d}" adlı eserin yazarı aşağıdakilerden hangisidir?`
      return `${cumle(d)}\n\nYukarıda hakkında bilgi verilen yazar aşağıdakilerden hangisidir?`

    case 'saray_gorevlileri':
      if (ozellik.tip === 'gorev') return `${cumle(d)}\n\nYukarıda görevi belirtilen saray görevlisi aşağıdakilerden hangisidir?`
      return `${cumle(d)}\n\nYukarıda hakkında bilgi verilen saray görevlisi aşağıdakilerden hangisidir?`

    case 'devlet_gorevlileri':
      return `${cumle(d)}\n\nYukarıda tanıtılan devlet görevlisi aşağıdakilerden hangisidir?`

    case 'divanlar':
      if (ozellik.tip === 'gorev')   return `${cumle(d)}\n\nYukarıda görevi belirtilen divan aşağıdakilerden hangisidir?`
      if (ozellik.tip === 'gorevli') return `"${d}", hangi divanın başında bulunan görevlidir?`
      return `${cumle(d)}\n\nYukarıda hakkında bilgi verilen divan aşağıdakilerden hangisidir?`

    case 'osmanli_toprak_yonetimi':
      return `${cumle(d)}\n\nYukarıda tanımı verilen toprak çeşidi aşağıdakilerden hangisidir?`

    case 'osmanli_ekonomi_kavramlar':
      return `${cumle(d)}\n\nYukarıda tanımı verilen kavram aşağıdakilerden hangisidir?`

    case 'osmanli_vergiler':
      return `${cumle(d)}\n\nYukarıda tanımı verilen vergi aşağıdakilerden hangisidir?`

    case 'islamiyet_oncesi_hukumdarlik_sembolleri':
      return `${cumle(d)}\n\nYukarıda tanımı verilen hükümdarlık sembolü aşağıdakilerden hangisidir?`

    case 'islamiyet_oncesi_kurucular':
    case 'ilk_musluman_kurucular':
      if (ozellik.tip === 'devlet') return `${d}, hangi hükümdar tarafından kurulmuştur?`
      return `${cumle(d)}\n\nYukarıda hakkında bilgi verilen hükümdar aşağıdakilerden hangisidir?`

    case 'islamiyet_oncesi_hukumdarlar':
      if (ozellik.tip === 'devlet') return `${d}, en parlak dönemini hangi hükümdar zamanında yaşamıştır?`
      return `${cumle(d)}\n\nYukarıda hakkında bilgi verilen hükümdar aşağıdakilerden hangisidir?`

    case 'islamiyet_oncesi_ozel_bilgiler':
    case 'ilk_musluman_ozel_bilgiler':
      return `${cumle(d)}\n\nYukarıda verilen bilgi aşağıdakilerden hangisine aittir?`

    case 'islamiyet_oncesi_destanlar':
      if (ozellik.tip === 'topluluk') return `${d} topluluğuna ait destan aşağıdakilerden hangisidir?`
      return `${cumle(d)}\n\nYukarıda hakkında bilgi verilen destan aşağıdakilerden hangisidir?`

    case 'misir_turk_islam_devletleri':
      return `${cumle(d)}\n\nYukarıda verilen bilgi, aşağıdaki Türk-İslam devletlerinden hangisine aittir?`

    case 'anadolu_beylikleri_eserleri':
      // Her eser bir beyliğe ait; birden çok eser aynı beyliğe ait olduğu için
      // "hangi eser bu beyliğe aittir?" sorusu jeneratörde otomatik olarak
      // atlanır (değer benzersizlik kontrolü). Şablon güvenlik için burada.
      return `${d} Beyliği'nden günümüze kalan eser aşağıdakilerden hangisidir?`

    case 'anadolu_selcuklu_olaylar':
      if (ozellik.tip === 'hukumdar') return `${d} döneminde yaşanan gelişmelerden biri aşağıdakilerden hangisidir?`
      return `${cumle(d)}\n\nYukarıda verilen bilgi hangi hükümdara aittir?`

    default:
      return `${cumle(d)}\n\nYukarıda verilen bilgi aşağıdakilerden hangisine aittir?`
  }
}

// Varlığın adı verilir, özelliği sorulur.
function formatAdOzellik(grup, varlik, ozellik) {
  const ad = varlik.ad
  switch (grup.id) {
    case 'saray_gorevlileri':
      if (ozellik.tip === 'gorev') return `Saray teşkilatında ${ad}, hangi görevi yerine getirmiştir?`
      return `${ad} ile ilgili aşağıdakilerden hangisi doğrudur?`

    case 'devlet_gorevlileri':
      return `İlk Müslüman Türk devletlerinde ${ad} ne anlama gelmektedir?`

    case 'divanlar':
      if (ozellik.tip === 'gorev')   return `${ad} adlı divan hangi işlerden sorumlu olmuştur?`
      if (ozellik.tip === 'gorevli') return `${ad} adlı divanın başında bulunan görevli aşağıdakilerden hangisidir?`
      return `${ad} ile ilgili aşağıdakilerden hangisi doğrudur?`

    case 'osmanli_toprak_yonetimi':
      return `Osmanlı toprak sisteminde ${ad} ne anlama gelmektedir?`

    case 'osmanli_ekonomi_kavramlar':
      return `Osmanlı ekonomisinde ${ad} ne anlama gelmektedir?`

    case 'osmanli_vergiler':
      return `Osmanlı Devleti'nde ${ad} ne anlama gelmektedir?`

    case 'islamiyet_oncesi_hukumdarlik_sembolleri':
      return `İslamiyet öncesi Türk devletlerinde ${ad} ne anlama gelmektedir?`

    case 'islamiyet_oncesi_kurucular':
    case 'ilk_musluman_kurucular':
      if (ozellik.tip === 'devlet') return `${ad}, aşağıdaki Türk devletlerinden hangisinin kurucusudur?`
      return `${ad} ile ilgili aşağıdakilerden hangisi doğrudur?`

    case 'islamiyet_oncesi_hukumdarlar':
      if (ozellik.tip === 'devlet') return `${ad}, aşağıdakilerden hangisinin en parlak dönem hükümdarıdır?`
      return `${ad} ile ilgili aşağıdakilerden hangisi doğrudur?`

    case 'islamiyet_oncesi_ozel_bilgiler':
    case 'ilk_musluman_ozel_bilgiler':
    case 'misir_turk_islam_devletleri':
      return `${ad} ile ilgili aşağıdakilerden hangisi doğrudur?`

    case 'islamiyet_oncesi_destanlar':
      if (ozellik.tip === 'topluluk') return `${ad}, hangi Türk topluluğuna aittir?`
      return `${ad} ile ilgili aşağıdakilerden hangisi doğrudur?`

    case 'anadolu_beylikleri_eserleri':
      if (ozellik.tip === 'beylik') return `${ad} hangi Anadolu beyliğinden günümüze kalmıştır?`
      return `${ad} ile ilgili aşağıdakilerden hangisi doğrudur?`

    case 'anadolu_selcuklu_olaylar':
      if (ozellik.tip === 'hukumdar') return `${cumle(ad)}\n\nYukarıda verilen gelişme, hangi Anadolu Selçuklu hükümdarı döneminde yaşanmıştır?`
      return `${ad} ile ilgili aşağıdakilerden hangisi doğrudur?`

    default:
      return `${ad} ile ilgili aşağıdakilerden hangisi doğrudur?`
  }
}

// Karıştırılan varlıklar: grubun "birlikteSorulanlar" listesinde aynı sette
// yer alan adlar, biri doğru cevap olduğunda diğerleri mutlaka şıklara girer.
// Böylece ayırt etmesi zor kişiler hep yan yana görülür.
function partnersOf(grup, varlikAd) {
  const setler = grup.birlikteSorulanlar || []
  const out = []
  for (const set of setler) {
    if (!set.includes(varlikAd)) continue
    for (const ad of set) if (ad !== varlikAd) out.push(ad)
  }
  return out
}

// Grup sınırı tanımayan eşler (kultur.json kökündeki "birlikteGelenler").
// Hem varlık adları hem de özellik değerleri için çalışır: ör. "I. Göktürk
// Devleti" cevabı hangi grupta çıkarsa çıksın "II. Göktürk (Kutluk) Devleti"
// de şıklara girer.
function globalPartnersOf(setler, deger) {
  const out = []
  for (const set of setler || []) {
    if (!set.includes(deger)) continue
    for (const x of set) if (x !== deger && !out.includes(x)) out.push(x)
  }
  return out
}

// Bir özellik tipinin tüm gruplardaki geçerli değerleri (global eşleri doğrulamak için)
function valuesOfTip(gruplar, tip) {
  const s = new Set()
  for (const g of gruplar) for (const v of g.varliklar) {
    for (const o of v.ozellikler) if (o.tip === tip) s.add(o.deger)
  }
  return s
}

// Bir varlığın cevap türü: varlık kendi 'tur' alanıyla grubu ezebilir.
// (Karışık gruplarda, ör. hükümdar + topluluk aynı grupta.)
function turOf(grup, varlik) {
  return varlik.tur || grup.cevapTuru || null
}

// Doğru cevap ve katmanlı çeldirici havuzu üret.
// tiers: öncelik sırasına göre havuzlar; şıklar baştan doldurulur.
//   1) pinned    - karıştırılan eşler, her zaman girer
//   2) aynı grup + aynı tür
//   3) seçili gruplar arasında aynı cevap türü
//   4) tüm gruplar arasında aynı cevap türü (ünite farketmez)
//   5) aynı grup, farklı tür
//   6) son çare: seçili gruplardan herhangi bir ad
// Tür uyumu grup yakınlığından önce gelir: bir seyyah sorusuna hükümdar
// çeldirici koymaktansa başka gruptaki bilim insanlarını kullanmak daha iyi.
function buildAnswerAndPool(cand, allGruplar, sameCatGruplar, birlikteGelenler) {
  const { grup, varlik, ozellik, yon } = cand

  // Sınıflandırma: doğru cevap da çeldiriciler de varlık adlarıdır.
  // Havuz yalnızca bu grubun sınıflarından gelir; başka konular karışmaz.
  if (yon === 'sinif-olan' || yon === 'sinif-olmayan') {
    const correct = varlik.ad
    const siniflar = collectSiniflar(grup)
    const havuz = []
    if (yon === 'sinif-olan') {
      // Çeldiriciler sorulan sınıfın DIŞINDAN gelir
      for (const [sinif, uyeler] of siniflar) {
        if (sinif === cand.sorulanSinif) continue
        for (const u of uyeler) if (u !== correct) havuz.push(u)
      }
    } else {
      // Çeldiriciler sorulan sınıfın ÜYELERİDİR (doğru cevap o sınıfa ait değil)
      for (const u of siniflar.get(cand.sorulanSinif) || []) {
        if (u !== correct) havuz.push(u)
      }
    }
    return { correct, tiers: [havuz] }
  }

  if (yon === 'ozellik-ad') {
    // Cevap = varlık adı
    const correct = varlik.ad
    const hedefTur = turOf(grup, varlik)

    // Karıştırılan eşler: grup içi liste + kök seviyedeki global liste
    const gecerliAdlar = collectVarlikAdlari(allGruplar)
    const pinned = [...partnersOf(grup, correct)]
    for (const ad of globalPartnersOf(birlikteGelenler, correct)) {
      if (gecerliAdlar.has(ad) && ad !== correct && !pinned.includes(ad)) pinned.push(ad)
    }

    // Aynı grup: önce aynı tür, sonra farklı tür
    const ayniGrupAyniTur = []
    const ayniGrupFarkliTur = []
    for (const v of grup.varliklar) {
      if (v.ad === correct) continue
      ;(turOf(grup, v) === hedefTur ? ayniGrupAyniTur : ayniGrupFarkliTur).push(v.ad)
    }

    // Diğer gruplar: yalnızca cevap türü uyanlar
    const turUyanAdlar = (gruplar) => {
      const out = []
      for (const g of gruplar) {
        if (g.id === grup.id) continue
        for (const v of g.varliklar) {
          if (v.ad === correct) continue
          if (turOf(g, v) === hedefTur) out.push(v.ad)
        }
      }
      return out
    }
    const secili = hedefTur ? turUyanAdlar(sameCatGruplar) : []
    const tumu = hedefTur ? turUyanAdlar(allGruplar) : []

    // Son çare: tür bilgisi olmayan/uymayan adlar (soru şıksız kalmasın)
    const sonCare = []
    for (const g of sameCatGruplar) {
      if (g.id === grup.id) continue
      for (const v of g.varliklar) if (v.ad !== correct) sonCare.push(v.ad)
    }

    return {
      correct,
      tiers: [pinned, ayniGrupAyniTur, secili, tumu, ayniGrupFarkliTur, sonCare],
    }
  }

  // ad -> ozellik: Cevap = özellik değeri
  const correct = ozellik.deger
  // Karıştırılan eşin aynı tipteki özellikleri her zaman şıklara girer
  const esAdlari = partnersOf(grup, varlik.ad)
  const pinned = []
  for (const v of grup.varliklar) {
    if (!esAdlari.includes(v.ad)) continue
    for (const o of v.ozellikler) {
      if (o.tip === ozellik.tip && o.deger !== correct && !pinned.includes(o.deger)) {
        pinned.push(o.deger)
      }
    }
  }
  // Global eşler: doğru cevabın kendisi bir değerse (ör. "I. Göktürk Devleti"),
  // eşi de aynı tipte gerçekten var olduğu sürece şıklara sabitlenir.
  const gecerliDegerler = valuesOfTip(allGruplar, ozellik.tip)
  for (const dg of globalPartnersOf(birlikteGelenler, correct)) {
    if (gecerliDegerler.has(dg) && dg !== correct && !pinned.includes(dg)) pinned.push(dg)
  }
  // Aynı grup içinde aynı tipteki diğer özellik değerleri.
  // Kaynak varlığın türü de eşleşsin: bir hükümdar sorusuna "…devletidir"
  // diye biten bir topluluk özelliği çeldirici olursa dilbilgisiyle elenir.
  const hedefTur = turOf(grup, varlik)
  const primary = []
  const primaryFarkliTur = []
  for (const v of grup.varliklar) {
    if (v.ad === varlik.ad) continue
    const hedef = turOf(grup, v) === hedefTur ? primary : primaryFarkliTur
    for (const o of v.ozellikler) {
      if (o.tip === ozellik.tip && o.deger !== correct
          && !pinned.includes(o.deger)
          && !primary.includes(o.deger) && !primaryFarkliTur.includes(o.deger)) {
        hedef.push(o.deger)
      }
    }
  }
  // Fallback: aynı özellik tipinden değerler. Önce seçili gruplar, sonra
  // tüm gruplar (küçük gruplarda soru 2 şıkta kalmasın diye ünite sınırı aşılır).
  const digerTipDegerleri = (gruplar, haric, turEslesmeli) => {
    const out = []
    for (const g of gruplar) {
      if (g.id === grup.id) continue
      for (const v of g.varliklar) {
        if (turEslesmeli && turOf(g, v) !== hedefTur) continue
        for (const o of v.ozellikler) {
          if (o.tip !== ozellik.tip || o.deger === correct) continue
          if (pinned.includes(o.deger) || primary.includes(o.deger)) continue
          if (primaryFarkliTur.includes(o.deger)) continue
          if (haric.includes(o.deger) || out.includes(o.deger)) continue
          out.push(o.deger)
        }
      }
    }
    return out
  }
  // Önce tür eşleşen havuzlar, sonra tür gözetmeyenler
  const secondary = digerTipDegerleri(sameCatGruplar, [], true)
  const tertiary = digerTipDegerleri(allGruplar, secondary, true)
  const gevsek = digerTipDegerleri(allGruplar, [...secondary, ...tertiary], false)

  return {
    correct,
    tiers: [pinned, primary, secondary, tertiary, primaryFarkliTur, gevsek],
  }
}

// Bir adayın "aynı bilgiyi ölçen" kardeşlerinden ayırt edilmesini sağlayan anahtar.
// Sınıflandırma gruplarında anahtar SINIF'tır: "devletin dört unsuru"ndan da
// "törenin dört kuralı"ndan da tek soru çıkar. (Aksi hâlde aynı listeden
// 4-5 soru üretilip neredeyse bütün şıklar tek tek cevap oluyordu.)
function dedupeKey(cand) {
  if (cand.yon === 'sinif-olan' || cand.yon === 'sinif-olmayan') {
    return `${cand.grup.id}::sinif::${cand.sorulanSinif}`
  }
  return `${cand.grup.id}::${cand.varlik.ad}`
}

// "hangisi X değildir?" sorusunda açıklama, doğru cevabın değil sorulan
// sınıfın açıklaması olmalı.
function aciklamaOf(cand) {
  if (cand.yon === 'sinif-olmayan') {
    for (const v of cand.grup.varliklar) {
      for (const o of v.ozellikler) {
        if (o.tip === 'sinif' && o.deger === cand.sorulanSinif && o.aciklama) return o.aciklama
      }
    }
  }
  return cand.ozellik.aciklama || null
}

// Ana fonksiyon: seçilen ünite + destede N soru üret
export function generateQuestions(allGruplar, unite, kategori, count, birlikteGelenler = []) {
  // unite: 'karma' | ünite tam adı
  // kategori: 'kisiler' | 'terimler' | 'karma'
  let selectedGruplar = allGruplar
  if (unite && unite !== 'karma') {
    selectedGruplar = selectedGruplar.filter(g => g.unite === unite)
  }
  if (kategori && kategori !== 'karma') {
    selectedGruplar = selectedGruplar.filter(g => g.kategori === kategori)
  }

  if (selectedGruplar.length === 0) return []

  const cands = collectCandidates(selectedGruplar)
  const shuffled = shuffle(cands)

  // Aynı varlık (terim/kişi) hakkında birden fazla soru sorulmasın:
  // farklı yönlerden (ör. "tanım -> kavram" ve "kavram -> tanım") aynı bilgiyi
  // ölçen sorular tekrar yaratıyor. Her varlıktan yalnızca bir aday tut.
  const uniqueByVarlik = []
  const seenVarlik = new Set()
  for (const c of shuffled) {
    const key = dedupeKey(c)
    if (seenVarlik.has(key)) continue
    seenVarlik.add(key)
    uniqueByVarlik.push(c)
  }

  const total = count === 'Tümü' ? uniqueByVarlik.length : Math.min(count, uniqueByVarlik.length)
  const picked = uniqueByVarlik.slice(0, total)

  const questions = []
  for (let i = 0; i < picked.length; i++) {
    const cand = picked[i]
    const { correct, tiers } = buildAnswerAndPool(
      cand,
      allGruplar,
      selectedGruplar,
      birlikteGelenler,
    )
    // 3 çeldiriciyi katman sırasına göre topla: üst katman tükenmeden alta inilmez.
    const distractors = []
    for (const tier of tiers) {
      if (distractors.length >= 3) break
      const uygun = shuffle(tier.filter(x => x !== correct && !distractors.includes(x)))
      distractors.push(...uygun.slice(0, 3 - distractors.length))
    }
    // Kök listedeki eşler şıklarda hep birlikte görünsün. Yukarıdaki "pinned"
    // katmanı yalnızca DOĞRU CEVABIN eşini garanti eder; burada eşlerden biri
    // çeldirici olarak girdiyse diğerini de içeri alıyoruz. Yer açmak için
    // eş listesinde adı geçmeyen serbest bir çeldirici feda edilir.
    const havuzSet = new Set(tiers.flat())
    for (const opt of [correct, ...distractors]) {
      for (const es of globalPartnersOf(birlikteGelenler, opt)) {
        if (es === correct || distractors.includes(es) || !havuzSet.has(es)) continue
        const yeri = distractors.findIndex(x => globalPartnersOf(birlikteGelenler, x).length === 0)
        if (yeri === -1) continue
        distractors[yeri] = es
      }
    }

    // Havuz yine yetmiyorsa (küçük grup), soruyu yine de üretiriz ama 2-3 şık olur.
    const secenekler = shuffle([correct, ...distractors])

    questions.push({
      id: i,
      soru: formatQuestion(cand),
      dogru: correct,
      secenekler,
      aciklama: aciklamaOf(cand),
      grupAd: cand.grup.ad,
      varlikAd: cand.varlik.ad,
      ozellikTip: cand.ozellik.tip,
      yon: cand.yon,
    })
  }

  return questions
}

// Ekranlardaki "N olası soru" sayacı: üretilen soru sayısıyla aynı kuralı kullanır.
export function countPossibleQuestions(allGruplar, unite, kategori) {
  let filt = allGruplar
  if (unite && unite !== 'karma') filt = filt.filter(g => g.unite === unite)
  if (kategori && kategori !== 'karma') filt = filt.filter(g => g.kategori === kategori)

  const keys = new Set()
  for (const c of collectCandidates(filt)) keys.add(dedupeKey(c))
  return keys.size
}
