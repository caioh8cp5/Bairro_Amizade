import { Share } from 'react-native';

export function shareInvite(code: string) {
  return Share.share({
    message:
      `Olá! Este é o seu convite para o app da Associação de Moradores do Champs Élysées.\n\n` +
      `Código: ${code}\n\n` +
      `Abra o app, toque em "Primeiro acesso com convite" e digite o código. Ele só pode ser usado uma vez.`,
  });
}

/**
 * Máscara do código de convite enquanto o morador digita: ele só digita as
 * 8 letras/números e o app coloca o hífen sozinho (ex.: "7KQ2M9XA" -> "7KQ2-M9XA").
 * O prefixo "CE-" fica fixo na tela. Colar o código inteiro também funciona.
 */
export function maskInviteCode(text: string): string {
  let raw = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.length > 8 && raw.startsWith('CE')) raw = raw.slice(2);
  raw = raw.slice(0, 8);
  return raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}
