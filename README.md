# App da Associação de Moradores do Champs Élysées

Aplicativo comunitário privado (TCC — PAC VII/VIII, Católica SC) para os moradores do loteamento Champs Élysées, Bairro Amizade, Jaraguá do Sul/SC.

## Estrutura

```
Bairro_Amizade/
├── app/                    # App móvel (React Native + Expo + TypeScript)
│   └── src/
│       ├── app/            # Telas (Expo Router: cada arquivo é uma tela)
│       │   ├── login.tsx, cadastro.tsx         # Controle de acesso
│       │   ├── (tabs)/index.tsx                # Mural de Comunicados
│       │   ├── (tabs)/agenda.tsx, reuniao/     # Agenda + presença + atas
│       │   ├── (tabs)/achados.tsx, achado/     # Achados e Perdidos
│       │   ├── (tabs)/ideias.tsx, ideia/       # Sugestões com votação
│       │   └── admin/                          # Convites e moradores (whitelist)
│       ├── lib/            # Firebase, API, autenticação, tipos
│       └── ui/             # Componentes visuais acessíveis
├── functions/              # Back-end: Node.js + Express (Cloud Functions)
│   └── src/api.ts          # API REST: /register, /invites, /residents
├── firestore.rules         # Security Rules (whitelist aplicada no servidor)
├── storage.rules           # Regras das fotos
└── firestore.indexes.json  # Índices da busca do mural
```

## Como funciona a whitelist (código de convite)

1. Um administrador gera, no app, um convite para o morador (nome + endereço/lote). A API cria um código único, ex. `CE-7KQ2-M9XA`.
2. O admin compartilha o código (WhatsApp, SMS...).
3. O morador toca em **Primeiro acesso com convite**, digita o código, e-mail e senha.
4. A API (`POST /register`) valida o código numa transação (uso único), cria a conta e o perfil em `residents/{uid}` com `active: true`.
5. As **Firebase Security Rules** só liberam leitura/escrita se `residents/{uid}` existir com `active == true`. Se o admin bloquear o morador, a API desativa a conta e derruba a sessão.

## Configuração do Firebase (passo a passo, você faz uma vez)

> Eu não consigo criar o projeto por você: ele fica na **sua** conta Google.

1. Acesse https://console.firebase.google.com e clique em **Criar projeto** (ex.: `champs-elysees`). Pode desativar o Google Analytics.
2. **Plano Blaze**: no canto inferior esquerdo, *Upgrade* → Blaze. Depois, no Google Cloud Console → *Faturamento → Orçamentos e alertas*, crie um alerta (ex.: R$ 10). Para o uso de um bairro, o consumo deve ficar dentro da cota gratuita.
3. **Authentication** → *Vamos começar* → ative **E-mail/senha**.
4. **Firestore Database** → *Criar banco de dados* → modo **produção** → local **`southamerica-east1 (São Paulo)`**.
5. **Storage** → *Vamos começar* → modo produção → mesma região.
6. **Configurações do projeto** (engrenagem) → *Seus apps* → ícone **Web `</>`** → registre o app (ex.: "app-moradores"). Copie os valores do `firebaseConfig`.
7. Em `app/`, copie `.env.example` para `.env` e cole os valores.

### Publicar regras, índices e a API

Instale e faça login no Firebase CLI (abre o navegador para você entrar):

```bash
npm install -g firebase-tools
```

```bash
firebase login
```

Na pasta `Bairro_Amizade`:

```bash
firebase use --add
```

```bash
firebase deploy
```

Isso publica `firestore.rules`, `storage.rules`, os índices e as Cloud Functions (API Express + gatilhos de votos/presenças/busca).

### Criar o primeiro administrador

Como só admins geram convites, o primeiro convite é criado à mão:

1. Firestore → **Iniciar coleção** → ID `invites`.
2. ID do documento: `CE-ADMN-0001`
3. Campos: `name` (string) = seu nome · `unit` (string) = seu endereço · `role` (string) = `admin` · `used` (boolean) = `false`
4. No app, use **Primeiro acesso com convite** com o código `CE-ADMN-0001`.

## Rodar o app no celular (desenvolvimento)

```bash
cd app
npm install
npx expo start
```

Instale o **Expo Go** no Android e leia o QR code. (Se algum recurso nativo não abrir no Expo Go, gere um build de desenvolvimento com `npx eas-cli@latest build --profile development --platform android`.)

## Publicar na Google Play

1. Crie uma conta em https://expo.dev (gratuita) e rode `npx eas-cli@latest login` e `npx eas-cli@latest build:configure` dentro de `app/`.
2. Gere o pacote: `npx eas-cli@latest build --platform android --profile production` (gera um `.aab` na nuvem, sem precisar de Android Studio).
3. Crie a conta de desenvolvedor no Google Play Console (taxa única de US$ 25).
4. **Atenção:** contas pessoais novas precisam fazer um **teste fechado com pelo menos 12 testadores por 14 dias seguidos** antes de liberar para produção. Isso casa bem com a etapa de testes com moradores (SUS) do cronograma.
5. A Play Store exige uma **Política de Privacidade** (URL pública) e o formulário de *Segurança dos dados* — o app coleta nome, e-mail, endereço e fotos.
6. Como o app é fechado por convite, informe na revisão do Google um **código de convite de teste** para o revisor conseguir entrar.

## Requisitos do TCC atendidos

| Requisito | Onde |
|---|---|
| RF01 – admin cadastra chaves de acesso na whitelist | `admin/convite-novo.tsx` + `POST /invites` |
| RF02 – bloquear quem não está na whitelist | `firestore.rules`, `storage.rules`, `lib/auth.tsx` |
| RF03 – itens perdidos com título, descrição, categoria e status | `achado-novo.tsx`, `achado/[id].tsx` |
| RF04 – sugestões com voto unitário por morador | `ui/vote-button.tsx` (`votes/{uid}`) + gatilho `onVoteCreated` |
| RNF01 – dados validados em nuvem | Security Rules + API Express com Admin SDK |
| RNF02 – resposta < 2 s | Firestore em tempo real, região São Paulo |
| RNF03 – acessibilidade | `ui/theme.ts` (fonte 18+, alto contraste, botões 56px, rótulos de acessibilidade) |
| Seção 3.2 – busca indexada + paginação | `(tabs)/achados.tsx` + `functions/src/keywords.ts` |
