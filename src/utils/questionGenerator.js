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

// Aday soru = { grup, varlik, ozellik, yon }
// yon: 'ozellik-ad' (özellik verilir, ad sorulur) veya 'ad-ozellik' (ad verilir, özellik sorulur)
function collectCandidates(gruplar) {
  const cands = []
  for (const grup of gruplar) {
    for (const varlik of grup.varliklar) {
      for (const ozellik of varlik.ozellikler) {
        // ozellik -> ad: her zaman güvenli (her özellik değeri benzersizdir)
        cands.push({ grup, varlik, ozellik, yon: 'ozellik-ad' })

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

    default:
      return `${ad} hakkında aşağıdakilerden hangisi doğrudur?`
  }
}

// Doğru cevap ve çeldirici havuzu üret
function buildAnswerAndPool(cand, allGruplar, sameCatGruplar) {
  const { grup, varlik, ozellik, yon } = cand

  if (yon === 'ozellik-ad') {
    // Cevap = varlık adı
    const correct = varlik.ad
    // Öncelik: aynı grup içindeki diğer varlık adları
    const primary = grup.varliklar
      .map(v => v.ad)
      .filter(a => a !== correct)
    // Fallback: aynı kategori (deste) içindeki diğer gruplar
    const secondary = []
    for (const g of sameCatGruplar) {
      if (g.id === grup.id) continue
      for (const v of g.varliklar) {
        if (v.ad !== correct && !primary.includes(v.ad)) secondary.push(v.ad)
      }
    }
    return { correct, primary, secondary }
  }

  // ad -> ozellik: Cevap = özellik değeri
  const correct = ozellik.deger
  // Aynı grup içinde aynı tipteki diğer özellik değerleri
  const primary = []
  for (const v of grup.varliklar) {
    if (v.ad === varlik.ad) continue
    for (const o of v.ozellikler) {
      if (o.tip === ozellik.tip && o.deger !== correct && !primary.includes(o.deger)) {
        primary.push(o.deger)
      }
    }
  }
  // Fallback: kategori içinden aynı tip
  const secondary = []
  for (const g of sameCatGruplar) {
    if (g.id === grup.id) continue
    for (const v of g.varliklar) {
      for (const o of v.ozellikler) {
        if (o.tip === ozellik.tip && o.deger !== correct
            && !primary.includes(o.deger) && !secondary.includes(o.deger)) {
          secondary.push(o.deger)
        }
      }
    }
  }
  return { correct, primary, secondary }
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
    const { correct, primary, secondary } = buildAnswerAndPool(
      cand,
      allGruplar,
      selectedGruplar,
    )
    // 3 çeldirici seç
    let distractors = shuffle(primary).slice(0, 3)
    if (distractors.length < 3) {
      const need = 3 - distractors.length
      distractors = distractors.concat(shuffle(secondary).slice(0, need))
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
