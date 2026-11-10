import { Share } from 'react-native';

export function shareInvite(code: string, name: string) {
  return Share.share({
    message:
      `Olá, ${name}! Seu convite para o app da Associação de Moradores do Champs Élysées:\n\n` +
      `Código: ${code}\n\n` +
      `Abra o app, toque em "Primeiro acesso com convite" e digite o código. Ele só pode ser usado uma vez.`,
  });
}
