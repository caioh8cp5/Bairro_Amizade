/**
 * Gera as palavras-chave indexadas usadas na busca do mural de Achados e Perdidos.
 * Cada palavra (sem acento, minúscula) entra junto com seus prefixos a partir de
 * 3 letras, permitindo que a busca "cha" encontre "chave" direto no servidor
 * com uma consulta array-contains, sem baixar todos os documentos no celular.
 */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function buildKeywords(...texts: string[]): string[] {
  const set = new Set<string>();
  for (const word of normalize(texts.join(' ')).split(/[^a-z0-9]+/)) {
    if (word.length < 3) continue;
    const w = word.slice(0, 20);
    for (let i = 3; i <= w.length; i++) set.add(w.slice(0, i));
    if (set.size > 300) break;
  }
  return [...set];
}
