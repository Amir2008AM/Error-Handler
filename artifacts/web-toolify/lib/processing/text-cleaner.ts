/**
 * Text Cleaner
 * Cleans OCR output by removing noise/hallucinated characters
 * while preserving valid characters for the selected language script.
 */

const SCRIPT_RANGES: Record<string, RegExp> = {
  latin:      /[\u0041-\u007A\u00C0-\u024F\u1E00-\u1EFF]/,
  arabic:     /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/,
  hebrew:     /[\u0590-\u05FF\uFB1D-\uFB4F]/,
  cyrillic:   /[\u0400-\u04FF\u0500-\u052F]/,
  cjk:        /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/,
  japanese:   /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF65-\uFF9F]/,
  hangul:     /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/,
  devanagari: /[\u0900-\u097F\uA8E0-\uA8FF]/,
  bengali:    /[\u0980-\u09FF]/,
  tamil:      /[\u0B80-\u0BFF]/,
  telugu:     /[\u0C00-\u0C7F]/,
  kannada:    /[\u0C80-\u0CFF]/,
  malayalam:  /[\u0D00-\u0D7F]/,
  gujarati:   /[\u0A80-\u0AFF]/,
  gurmukhi:   /[\u0A00-\u0A7F]/,
  oriya:      /[\u0B00-\u0B7F]/,
  thai:       /[\u0E00-\u0E7F]/,
  lao:        /[\u0E80-\u0EFF]/,
  myanmar:    /[\u1000-\u109F\uAA60-\uAA7F]/,
  khmer:      /[\u1780-\u17FF\u19E0-\u19FF]/,
  georgian:   /[\u10A0-\u10FF\u2D00-\u2D2F]/,
  armenian:   /[\u0530-\u058F\uFB13-\uFB17]/,
  greek:      /[\u0370-\u03FF\u1F00-\u1FFF]/,
  ethiopic:   /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/,
  sinhala:    /[\u0D80-\u0DFF]/,
  mongolian:  /[\u1800-\u18AF]/,
  syriac:     /[\u0700-\u074F]/,
  tibetan:    /[\u0F00-\u0FFF]/,
}

const UNIVERSAL_KEEP = /[\d\s\n\r\t.,!?;:()\[\]{}\-–—"'"""''«»\/\\@#%+&=_~|^*]/

function buildAllowPattern(scripts: string[]): RegExp {
  const parts: string[] = []
  for (const s of scripts) {
    if (SCRIPT_RANGES[s]) {
      const src = SCRIPT_RANGES[s].source
      parts.push(src)
    }
  }
  parts.push(UNIVERSAL_KEEP.source)
  return new RegExp(`[^${parts.join('')}]`, 'gu')
}

const LANGUAGE_TO_SCRIPTS: Record<string, string[]> = {
  ara: ['arabic'],
  fas: ['arabic'],
  urd: ['arabic'],
  pus: ['arabic'],
  snd: ['arabic'],
  uig: ['arabic'],
  div: ['arabic'],
  heb: ['hebrew'],
  yid: ['hebrew'],
  rus: ['cyrillic'],
  ukr: ['cyrillic'],
  bul: ['cyrillic'],
  mkd: ['cyrillic'],
  bel: ['cyrillic'],
  srp: ['cyrillic'],
  kaz: ['cyrillic'],
  kir: ['cyrillic'],
  mon: ['cyrillic'],
  tat: ['cyrillic'],
  tgk: ['cyrillic'],
  uzb: ['cyrillic'],
  uzb_cyrl: ['cyrillic'],
  chi_sim: ['cjk'],
  chi_tra: ['cjk'],
  jpn: ['japanese'],
  jpn_vert: ['japanese'],
  kor: ['hangul', 'cjk'],
  kor_vert: ['hangul', 'cjk'],
  hin: ['devanagari'],
  mar: ['devanagari'],
  nep: ['devanagari'],
  san: ['devanagari'],
  ben: ['bengali'],
  asm: ['bengali'],
  tam: ['tamil'],
  tel: ['telugu'],
  kan: ['kannada'],
  mal: ['malayalam'],
  guj: ['gujarati'],
  pan: ['gurmukhi'],
  ori: ['oriya'],
  tha: ['thai'],
  lao: ['lao'],
  mya: ['myanmar'],
  khm: ['khmer'],
  kat: ['georgian'],
  hye: ['armenian'],
  ell: ['greek'],
  grc: ['greek'],
  amh: ['ethiopic'],
  tir: ['ethiopic'],
  sin: ['sinhala'],
  syr: ['syriac'],
}

const NOISE_PATTERNS = [
  /[\uFFFD\uFFFE\uFFFF]/g,
  /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g,
  /\s{3,}/g,
  /^[\s\r\n]+|[\s\r\n]+$/gm,
]

export function cleanOcrText(text: string, langCode: string): string {
  if (!text) return ''

  const primaryLang = langCode.split('+')[0].trim()
  const scripts = LANGUAGE_TO_SCRIPTS[primaryLang]

  let cleaned = text

  for (const pattern of NOISE_PATTERNS) {
    if (pattern.source === '\\s{3,}') {
      cleaned = cleaned.replace(pattern, '  ')
    } else {
      cleaned = cleaned.replace(pattern, '')
    }
  }

  if (scripts && scripts.length > 0) {
    const noisePattern = buildAllowPattern(scripts)
    cleaned = cleaned.replace(noisePattern, '')
  }

  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim()

  return cleaned
}
