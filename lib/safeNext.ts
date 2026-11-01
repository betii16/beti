// Retour à la page d'origine après connexion : uniquement un chemin interne
// (jamais un autre site). Fonction pure : prend la valeur brute de ?next.
export function safeNext(raw: string | null | undefined): string {
  const n = raw || ''
  if (n.length > 2048) return ''
  // Les navigateurs suppriment tab/retour ligne dans une URL : « /\t/evil.com » deviendrait « //evil.com ».
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(n)) return ''
  if (!n.startsWith('/') || n.startsWith('//') || n.startsWith('/auth/')) return ''
  return n
}
