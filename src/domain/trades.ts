// Mots qu'un client tape pour désigner un métier, en français et en arabe. Tapé seul,
// un de ces mots choisit le métier dans la recherche (« plombier » → Plomberie) : la base
// ne cherche le mot que dans le nom, la description, les spécialités et le slug du métier,
// or un plombier n'écrit pas forcément « plombier » sur sa fiche.

import type { CategorySlug } from './search'

// Écrits comme on les tape ; la comparaison passe par fold(). Un mot n'appartient qu'à un
// métier (tests/unit/trades.test.ts). Chaque nouveau métier doit avoir sa liste (le type l'exige).
const WORDS: Record<Exclude<CategorySlug, 'autre'>, readonly string[]> = {
  plomberie: ['plombier', 'plombiers', 'plomberie', 'chauffagiste', 'fuite', 'fuite d’eau', 'سباك', 'سباكة', 'ترصيص'],
  electricite: ['électricien', 'électriciens', 'électricité', 'كهربائي', 'كهرباء'],
  climatisation: ['climatisation', 'clim', 'climatiseur', 'climatiseurs', 'frigoriste', 'تكييف', 'مكيف', 'مكيفات', 'تبريد'],
  serrurerie: ['serrurier', 'serrurerie', 'serrure', 'clé', 'clés', 'verrou', 'porte bloquée', 'أقفال', 'قفل', 'مفتاح'],
  peinture: ['peintre', 'peintres', 'peinture', 'دهان', 'صباغ', 'صباغة', 'طلاء'],
  menage: ['ménage', 'femme de ménage', 'nettoyage', 'تنظيف', 'منظفة'],
  maconnerie: ['maçon', 'maçons', 'maçonnerie', 'بناء'],
  menuiserie: ['menuisier', 'menuiserie', 'aluminium', 'alu', 'pvc', 'نجار', 'نجارة', 'ألمنيوم'],
  electromenager: ['électroménager', 'frigo', 'réfrigérateur', 'machine à laver', 'lave-linge', 'lave-vaisselle', 'ثلاجة', 'غسالة', 'أجهزة منزلية'],
  carrelage: ['carreleur', 'carrelage', 'faïence', 'zellige', 'بلاط', 'تبليط', 'زليج'],
  ferronnerie: ['ferronnier', 'ferronnerie', 'soudeur', 'soudure', 'portail', 'حداد', 'حدادة', 'لحام', 'تلحيم'],
  etancheite: ['étanchéité', 'étancheur', 'infiltration', 'infiltrations', 'عزل', 'عزل مائي'],
  parabole: ['parabole', 'antenne', 'caméra', 'caméras', 'vidéosurveillance', 'هوائي', 'بارابول', 'كاميرا', 'كاميرات'],
  demenagement: ['déménagement', 'déménageur', 'déménageurs', 'نقل الأثاث', 'ترحيل'],
  jardinage: ['jardinier', 'jardinage', 'jardin', 'بستاني', 'بستنة', 'حديقة'],
}

/** Forme simple pour comparer : minuscules, sans accents ; en arabe, sans hamza sur l'alif, sans voyelles ni tatweel. */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ٱ/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/’/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export const TRADE_WORDS: ReadonlyMap<string, CategorySlug> = new Map(
  Object.entries(WORDS).flatMap(([slug, words]) => words.map(word => [fold(word), slug as CategorySlug] as const)),
)

/** Le métier que désigne la recherche quand elle n'est faite que d'un mot de métier. */
export function tradeFromQuery(q: string | undefined): CategorySlug | undefined {
  return q ? TRADE_WORDS.get(fold(q)) : undefined
}

/** Nombre total de mots, doublons compris : sert au test qui vérifie qu'un mot n'a qu'un métier. */
export const TRADE_WORD_COUNT = Object.values(WORDS).reduce((sum, words) => sum + words.length, 0)
