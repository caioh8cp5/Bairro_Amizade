import { buildKeywords, normalize } from '../src/keywords';

describe('normalize', () => {
  it('remove acentos e deixa tudo minúsculo', () => {
    expect(normalize('Ação Élysées CHAVE')).toBe('acao elysees chave');
  });
});

describe('buildKeywords (busca do mural)', () => {
  it('gera a palavra e seus prefixos a partir de 3 letras', () => {
    expect(buildKeywords('Chave')).toEqual(['cha', 'chav', 'chave']);
  });

  it('ignora palavras com menos de 3 letras e pontuação', () => {
    expect(buildKeywords('um pé, de gato!')).toEqual(['gat', 'gato']);
  });

  it('junta título e descrição sem repetir termos', () => {
    const k = buildKeywords('Carteira preta', 'carteira de couro');
    expect(k).toContain('carteira');
    expect(k).toContain('couro');
    expect(k.filter((w) => w === 'carteira')).toHaveLength(1);
  });

  it('busca sem acento encontra texto com acento', () => {
    expect(buildKeywords('Óculos')).toContain('oculos');
  });

  it('limita palavras muito longas a 20 letras', () => {
    const k = buildKeywords('a'.repeat(50));
    expect(Math.max(...k.map((w) => w.length))).toBe(20);
  });

  it('para de gerar termos depois de ~300 para não estourar o documento', () => {
    const texto = Array.from({ length: 200 }, (_, i) => `palavra${i}xyz`).join(' ');
    expect(buildKeywords(texto).length).toBeLessThanOrEqual(320);
  });
});
