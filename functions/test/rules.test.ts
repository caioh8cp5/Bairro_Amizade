/**
 * Testes das Firebase Security Rules (firestore.rules): a whitelist aplicada no servidor.
 * Cada teste simula o app logado como um tipo de usuário e confere o que é permitido.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, setLogLevel, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  // As negações de permissão são esperadas aqui; sem isso o SDK imprime um aviso para cada uma
  setLogLevel('error');
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
  env = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT,
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'), host, port: Number(port) },
  });
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore();
    await setDoc(doc(fs, 'residents/morador'), { name: 'Morador', unit: 'Rua 1', role: 'resident', active: true });
    await setDoc(doc(fs, 'residents/admin'), { name: 'Admin', unit: 'Rua 2', role: 'admin', active: true });
    await setDoc(doc(fs, 'residents/bloqueado'), { name: 'Bloq', unit: 'Rua 3', role: 'resident', active: false });
    await setDoc(doc(fs, 'announcements/a1'), { title: 'Aviso', body: 'Texto' });
    await setDoc(doc(fs, 'invites/CE-ABCD-EFGH'), { role: 'resident', used: false });
    await setDoc(doc(fs, 'suggestions/s1'), { title: 'Ideia', status: 'aberta', voteCount: 0, authorId: 'morador' });
    await setDoc(doc(fs, 'lostFound/l1'), { title: 'Chave', status: 'aberto', authorId: 'morador' });
  });
});

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

describe('whitelist', () => {
  it('morador ativo lê o mural', async () => {
    await assertSucceeds(getDoc(doc(as('morador'), 'announcements/a1')));
  });

  it('visitante, conta fora da lista e morador bloqueado não leem nada', async () => {
    await assertFails(getDoc(doc(as(null), 'announcements/a1')));
    await assertFails(getDoc(doc(as('estranho'), 'announcements/a1')));
    await assertFails(getDoc(doc(as('bloqueado'), 'announcements/a1')));
  });

  it('convites nunca são acessíveis pelo app, nem para admin', async () => {
    await assertFails(getDoc(doc(as('admin'), 'invites/CE-ABCD-EFGH')));
  });
});

describe('perfil (residents)', () => {
  it('morador edita nome, endereço e telefone do próprio perfil', async () => {
    await assertSucceeds(updateDoc(doc(as('morador'), 'residents/morador'), { name: 'Novo Nome', phone: '999' }));
  });

  it('morador não pode se promover a admin nem editar outro perfil', async () => {
    await assertFails(updateDoc(doc(as('morador'), 'residents/morador'), { role: 'admin' }));
    await assertFails(updateDoc(doc(as('morador'), 'residents/admin'), { name: 'Hacker' }));
  });

  it('ninguém cria perfil pelo app (só via convite na API)', async () => {
    await assertFails(setDoc(doc(as('estranho'), 'residents/estranho'), { name: 'X', role: 'resident', active: true }));
  });
});

describe('comunicados', () => {
  const novo = (authorId: string) => ({
    title: 'Falta de água',
    body: 'Amanhã das 8h às 12h',
    urgent: true,
    authorId,
    authorName: 'Admin',
    createdAt: serverTimestamp(),
  });

  it('só administrador publica', async () => {
    await assertSucceeds(setDoc(doc(as('admin'), 'announcements/novo'), novo('admin')));
    await assertFails(setDoc(doc(as('morador'), 'announcements/novo'), novo('morador')));
  });

  it('admin não pode publicar em nome de outra pessoa', async () => {
    await assertFails(setDoc(doc(as('admin'), 'announcements/novo'), novo('morador')));
  });
});

describe('achados e perdidos', () => {
  const item = (over: Record<string, unknown> = {}) => ({
    title: 'Molho de chaves',
    description: 'Perto da praça',
    category: 'chaves',
    kind: 'encontrado',
    status: 'aberto',
    photoUrl: null,
    photoPath: null,
    authorId: 'morador',
    authorName: 'Morador',
    createdAt: serverTimestamp(),
    ...over,
  });

  it('morador publica um item válido', async () => {
    await assertSucceeds(setDoc(doc(as('morador'), 'lostFound/novo'), item()));
  });

  it('recusa categoria inválida, palavras-chave enviadas pelo app e status inicial errado', async () => {
    await assertFails(setDoc(doc(as('morador'), 'lostFound/novo'), item({ category: 'carros' })));
    await assertFails(setDoc(doc(as('morador'), 'lostFound/novo'), item({ keywords: ['x'] })));
    await assertFails(setDoc(doc(as('morador'), 'lostFound/novo'), item({ status: 'devolvido' })));
  });

  it('só o autor ou admin marca como devolvido, e só o status pode mudar', async () => {
    await assertSucceeds(updateDoc(doc(as('morador'), 'lostFound/l1'), { status: 'devolvido' }));
    await assertSucceeds(updateDoc(doc(as('admin'), 'lostFound/l1'), { status: 'aberto' }));
    await assertFails(updateDoc(doc(as('morador'), 'lostFound/l1'), { title: 'Outro' }));
  });

  it('outro morador não apaga o item', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'residents/vizinho'), { name: 'V', unit: 'Rua 4', role: 'resident', active: true }),
    );
    await assertFails(deleteDoc(doc(as('vizinho'), 'lostFound/l1')));
    await assertSucceeds(deleteDoc(doc(as('admin'), 'lostFound/l1')));
  });
});

describe('votos nas sugestões', () => {
  it('morador vota "gostei" ou "não gostei" com o próprio id', async () => {
    await assertSucceeds(
      setDoc(doc(as('morador'), 'suggestions/s1/votes/morador'), { value: -1, createdAt: serverTimestamp() }),
    );
  });

  it('não pode votar por outra pessoa nem com valor inválido', async () => {
    await assertFails(setDoc(doc(as('morador'), 'suggestions/s1/votes/admin'), { value: 1, createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as('morador'), 'suggestions/s1/votes/morador'), { value: 5, createdAt: serverTimestamp() }));
  });

  it('o app não altera o total de votos diretamente', async () => {
    await assertFails(updateDoc(doc(as('morador'), 'suggestions/s1'), { voteCount: 100 }));
  });
});
