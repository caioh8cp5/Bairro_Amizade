/**
 * Política de Privacidade (LGPD — Lei 13.709/2018).
 * O mesmo texto é publicado em site/privacidade.html para a Google Play.
 * Ao alterar o conteúdo, atualize também TERMS_VERSION em functions/src/api.ts.
 */
export const PRIVACY_VERSION = '2026-11';
export const PRIVACY_URL = 'https://champs-elysees-64bb8.web.app/privacidade.html';

export const PRIVACY_SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Quem somos',
    body:
      'Este aplicativo é mantido pela Associação de Moradores do Champs Élysées (Bairro Amizade, Jaraguá do Sul/SC), ' +
      'que é a controladora dos dados pessoais tratados nele. O acesso é restrito a moradores convidados pela associação.',
  },
  {
    title: 'Quais dados coletamos',
    body:
      '• Cadastro: nome, endereço (rua e número), e-mail e, se você quiser, telefone.\n' +
      '• Conteúdo que você publica: itens de achados e perdidos (texto e foto), sugestões, votos e confirmações de presença.\n' +
      '• Dados técnicos: identificador da conta e, se você permitir, um código do aparelho para receber notificações.\n' +
      'Não coletamos localização, contatos nem dados de pagamento.',
  },
  {
    title: 'Para que usamos',
    body:
      'Para confirmar que você é morador (lista de permissões), mostrar comunicados, reuniões, achados e perdidos e sugestões ' +
      'aos demais moradores, contar votos e presenças sem duplicidade e enviar avisos da associação. ' +
      'A base legal é o seu consentimento e o legítimo interesse da associação na comunicação com os moradores.',
  },
  {
    title: 'Quem pode ver',
    body:
      'Somente moradores com acesso ativo veem o conteúdo do app. Seu nome aparece junto ao que você publica; seu endereço e ' +
      'e-mail aparecem apenas para a diretoria (administradores). Os dados ficam armazenados no Google Firebase, em servidores ' +
      'localizados em São Paulo (Brasil). As notificações são entregues pelo serviço de push do Expo e do Google. ' +
      'Não vendemos nem compartilhamos dados com terceiros para publicidade.',
  },
  {
    title: 'Por quanto tempo guardamos',
    body:
      'Enquanto sua conta estiver ativa. Ao excluir a conta, apagamos seu cadastro, login, itens do mural (com fotos), votos e ' +
      'presenças. Sugestões e comunicados que você publicou permanecem, mas sem o seu nome.',
  },
  {
    title: 'Seus direitos',
    body:
      'Você pode, a qualquer momento: consultar e corrigir seus dados (tela Perfil), revogar o consentimento e excluir sua conta ' +
      '(Perfil → Excluir minha conta) e pedir informações sobre o tratamento dos seus dados à diretoria da associação, ' +
      'conforme o art. 18 da LGPD.',
  },
  {
    title: 'Segurança',
    body:
      'O acesso ao banco de dados é bloqueado no servidor para quem não está na lista de moradores ativos. As senhas são ' +
      'guardadas pelo Firebase Authentication e nunca ficam visíveis para a associação.',
  },
  {
    title: 'Contato e alterações',
    body:
      'Dúvidas ou pedidos sobre seus dados: procure a diretoria da Associação de Moradores do Champs Élysées. ' +
      'Se esta política mudar, avisaremos pelo mural de comunicados. Versão de novembro de 2026.',
  },
];
