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

// Bir grup içinde: aynı varlığın aynı tipte kaç özelliği var?
function countOzellikByTip(varlik, tip) {
  return varlik.ozellikler.filter(o => o.tip === tip).length
}

// Bir gruptaki tüm özellik değerlerini tip bazında topla (çeldirici havuzu)
function collectValuesByTip(gruplar) {
  const map = new Map() // tip -> Set of degerler
  for (const g of gruplar) {
    for (const v of g.varliklar) {
      for (const o of v.ozellikler) {
        if (!map.has(o.tip)) map.set(o.tip, new Set())
        map.get(o.tip).add(o.deger)
      }
    }
  }
  return map
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

function formatOzellikAd(grup, ozellik) {
  const d = ozellik.deger
  switch (grup.id) {
    case 'turk_islam_bilim_insanlari':
      if (ozellik.tip === 'unvan') return `"${d}" hangi bilim insanının unvanıdır?`
      if (ozellik.tip === 'eser')  return `"${d}" adlı eseri hangi bilim insanı yazmıştır?`
      return `${d}\n\nBu bilgi hangi bilim insanına aittir?`

    case 'osmanli_bilim_insanlari':
      if (ozellik.tip === 'unvan') return `"${d}" hangi Osmanlı bilim insanının unvanıdır?`
      if (ozellik.tip === 'eser')  return `"${d}" adlı eseri hangi Osmanlı bilim insanı yazmıştır?`
      return `${d}\n\nBu bilgi hangi Osmanlı bilim insanına aittir?`

    case 'ilk_turk_islam_yazarlari':
      if (ozellik.tip === 'eser')  return `"${d}" adlı eserin yazarı kimdir?`
      return `${d}\n\nBu bilgi hangi yazara aittir?`

    case 'saray_gorevlileri':
      if (ozellik.tip === 'gorev') return `${d}\n\nBu görevi yapan saray görevlisi kimdir?`
      return `${d}\n\nBu bilgi hangi saray görevlisine aittir?`

    case 'devlet_gorevlileri':
      if (ozellik.tip === 'gorev') return `${d}\n\nBu görevi yapan devlet görevlisi kimdir?`
      return `${d}\n\nBu bilgi hangi devlet görevlisine aittir?`

    case 'divanlar':
      if (ozellik.tip === 'gorev')   return `${d}\n\nBu görevi yapan divan hangisidir?`
      if (ozellik.tip === 'gorevli') return `"${d}" hangi divanın başındaki görevlidir?`
      return `${d}\n\nBu bilgi hangi divana aittir?`

    case 'osmanli_toprak_yonetimi':
      return `${d}\n\nBu tanıma uyan toprak çeşidi hangisidir?`

    case 'osmanli_ekonomi_kavramlar':
      return `${d}\n\nBu tanıma uyan kavram hangisidir?`

    case 'osmanli_vergiler':
      return `${d}\n\nBu tanıma uyan vergi hangisidir?`

    case 'islamiyet_oncesi_kurucular':
      if (ozellik.tip === 'devlet') return `${d.replace(/\s*Devleti$/, '')} devletinin kurucusu kimdir?`
      return `${d}\n\nBu bilgi hangi hükümdara aittir?`

    case 'islamiyet_oncesi_hukumdarlar':
      if (ozellik.tip === 'devlet') return `${d.replace(/\s*Devleti$/, '')} devleti en güçlü / en parlak dönemini hangi hükümdar zamanında yaşamıştır?`
      return `${d}\n\nBu bilgi hangi hükümdara aittir?`

    case 'islamiyet_oncesi_ozel_bilgiler':
      return `${d}\n\nBu bilgi kime / hangisine aittir?`

    case 'islamiyet_oncesi_destanlar':
      if (ozellik.tip === 'topluluk') return `${d} topluluğuna ait destan aşağıdakilerden hangisidir?`
      return `${d}\n\nBu bilgi hangi destana aittir?`

    case 'ilk_musluman_kurucular':
      if (ozellik.tip === 'devlet') return `${d} devletinin kurucusu kimdir?`
      return `${d}\n\nBu bilgi hangi hükümdara aittir?`

    case 'ilk_musluman_ozel_bilgiler':
      return `${d}\n\nBu bilgi kime / hangisine aittir?`

    case 'anadolu_beylikleri_eserleri':
      // Her eser bir beyliğe ait; birden çok eser aynı beyliğe ait olduğu için
      // "hangi eser bu beyliğe aittir?" sorusu jeneratörde otomatik olarak
      // atlanır (değer benzersizlik kontrolü). Şablon güvenlik için burada.
      return `${d} beyliğine ait eser aşağıdakilerden hangisidir?`

    case 'anadolu_selcuklu_olaylar':
      if (ozellik.tip === 'hukumdar') return `${d} döneminde yaşanan olaylardan biri aşağıdakilerden hangisidir?`
      return `${d}\n\nBu bilgi hangi hükümdara aittir?`

    default:
      return `${d}\n\nBu bilgi kime aittir?`
  }
}

function formatAdOzellik(grup, varlik, ozellik) {
  const ad = varlik.ad
  switch (grup.id) {
    case 'saray_gorevlileri':
      return `${ad} adlı saray görevlisi ne iş yapmıştır?`

    case 'devlet_gorevlileri':
      return `${ad} adlı devlet görevlisi ne iş yapmıştır?`

    case 'divanlar':
      if (ozellik.tip === 'gorev')   return `${ad} adlı divanın görevi nedir?`
      if (ozellik.tip === 'gorevli') return `${ad} adlı divanın başındaki görevli kimdir?`
      return `${ad} hakkında aşağıdakilerden hangisi doğrudur?`

    case 'osmanli_toprak_yonetimi':
      return `${ad} adlı toprak çeşidinin tanımı nedir?`

    case 'osmanli_ekonomi_kavramlar':
      return `${ad} adlı kavram ne anlama gelir?`

    case 'osmanli_vergiler':
      return `${ad} adlı vergi ne anlama gelir?`

    case 'islamiyet_oncesi_kurucular':
      if (ozellik.tip === 'devlet') return `${ad} hangi devletin kurucusudur?`
      return `${ad} hakkında aşağıdakilerden hangisi doğrudur?`

    case 'islamiyet_oncesi_hukumdarlar':
      if (ozellik.tip === 'devlet') return `${ad} hangi devletin en güçlü / en parlak dönem hükümdarıdır?`
      return `${ad} hakkında aşağıdakilerden hangisi doğrudur?`

    case 'islamiyet_oncesi_ozel_bilgiler':
      return `${ad} ile ilgili aşağıdakilerden hangisi doğrudur?`

    case 'islamiyet_oncesi_destanlar':
      if (ozellik.tip === 'topluluk') return `${ad} hangi Türk topluluğuna aittir?`
      return `${ad} hakkında aşağıdakilerden hangisi doğrudur?`

    case 'ilk_musluman_kurucular':
      if (ozellik.tip === 'devlet') return `${ad} hangi devletin kurucusudur?`
      return `${ad} hakkında aşağıdakilerden hangisi doğrudur?`

    case 'ilk_musluman_ozel_bilgiler':
      return `${ad} ile ilgili aşağıdakilerden hangisi doğrudur?`

    case 'anadolu_beylikleri_eserleri':
      if (ozellik.tip === 'beylik') return `${ad} hangi Anadolu beyliğine aittir?`
      return `${ad} hakkında aşağıdakilerden hangisi doğrudur?`

    case 'anadolu_selcuklu_olaylar':
      if (ozellik.tip === 'hukumdar') return `${ad}\n\nBu olay hangi Anadolu Selçuklu hükümdarı döneminde yaşanmıştır?`
      return `${ad} hakkında aşağıdakilerden hangisi doğrudur?`

    default:
      return `${ad} hakkında aşağıdakilerden hangisi doğrudur?`
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
function buildAnswerAndPool(cand, allGruplar, sameCatGruplar) {
  const { grup, varlik, ozellik, yon } = cand

  // Sınıflandırma: doğru cevap da çeldiriciler de varlık adlarıdır.
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
    const pinned = partnersOf(grup, correct)

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
  // Aynı grup içinde aynı tipteki diğer özellik değerleri
  const primary = []
  for (const v of grup.varliklar) {
    if (v.ad === varlik.ad) continue
    for (const o of v.ozellikler) {
      if (o.tip === ozellik.tip && o.deger !== correct
          && !pinned.includes(o.deger) && !primary.includes(o.deger)) {
        primary.push(o.deger)
      }
    }
  }
  // Fallback: aynı özellik tipinden değerler. Önce seçili gruplar, sonra
  // tüm gruplar (küçük gruplarda soru 2 şıkta kalmasın diye ünite sınırı aşılır).
  const digerTipDegerleri = (gruplar, haric) => {
    const out = []
    for (const g of gruplar) {
      if (g.id === grup.id) continue
      for (const v of g.varliklar) {
        for (const o of v.ozellikler) {
          if (o.tip !== ozellik.tip || o.deger === correct) continue
          if (pinned.includes(o.deger) || primary.includes(o.deger)) continue
          if (haric.includes(o.deger) || out.includes(o.deger)) continue
          out.push(o.deger)
        }
      }
    }
    return out
  }
  const secondary = digerTipDegerleri(sameCatGruplar, [])
  const tertiary = digerTipDegerleri(allGruplar, secondary)

  return { correct, tiers: [pinned, primary, secondary, tertiary] }
}

// Ana fonksiyon: seçilen ünite + destede N soru üret
export function generateQuestions(allGruplar, unite, kategori, count) {
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
    const key = `${c.grup.id}::${c.varlik.ad}`
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
    )
    // 3 çeldiriciyi katman sırasına göre topla: üst katman tükenmeden alta inilmez.
    const distractors = []
    for (const tier of tiers) {
      if (distractors.length >= 3) break
      const uygun = shuffle(tier.filter(x => x !== correct && !distractors.includes(x)))
      distractors.push(...uygun.slice(0, 3 - distractors.length))
    }
    // Havuz yine yetmiyorsa (küçük grup), soruyu yine de üretiriz ama 2-3 şık olur.
    const secenekler = shuffle([correct, ...distractors])

    questions.push({
      id: i,
      soru: formatQuestion(cand),
      dogru: correct,
      secenekler,
      aciklama: cand.ozellik.aciklama || null,
      grupAd: cand.grup.ad,
      varlikAd: cand.varlik.ad,
      ozellikTip: cand.ozellik.tip,
      yon: cand.yon,
    })
  }

  return questions
}
