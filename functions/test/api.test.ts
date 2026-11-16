import { getAuth } from 'firebase-admin/auth';
import request from 'supertest';
import { app, normalizeCode, setResidentClaims, TERMS_VERSION } from '../src/api';
import { createResident, db, idToken, resetEmulators } from './helpers';

beforeEach(resetEmulators);

/** Cria um convite direto no banco, como a diretoria faria. */
async function seedInvite(code: string, role: 'resident' | 'admin' = 'resident', extra = {}) {
  await db().doc(`invites/${code}`).set({ role, used: false, claimed: false, note: '', ...extra });
}

const body = (over: Record<string, unknown> = {}) => ({
  code: 'CE-ABCD-EFGH',
  name: 'Maria Silva',
  unit: 'Rua das Flores, 10',
  email: 'maria@teste.com',
  password: 'segredo123',
  acceptedTerms: true,
  ...over,
});

describe('normalizeCode', () => {
  it('aceita o código com ou sem hífens e em minúsculas', () => {
    expect(normalizeCode('ce-abcd-efgh')).toBe('CE-ABCD-EFGH');
    expect(normalizeCode('CEABCDEFGH')).toBe('CE-ABCD-EFGH');
    expect(normalizeCode('ABCD EFGH')).toBe('CE-ABCD-EFGH');
  });
  it('rejeita códigos de tamanho errado', () => {
    expect(normalizeCode('CE-ABC')).toBe('');
  });
});

describe('GET /health', () => {
  it('responde ok', async () => {
    await request(app).get('/health').expect(200, { ok: true });
  });
});

describe('POST /register (primeiro acesso com convite)', () => {
  it('cria a conta, o perfil na whitelist e marca o convite como usado', async () => {
    await seedInvite('CE-ABCD-EFGH');
    await request(app).post('/register').send(body()).expect(201);

    const user = await getAuth().getUserByEmail('maria@teste.com');
    const resident = (await db().doc(`residents/${user.uid}`).get()).data();
    expect(resident).toMatchObject({
      name: 'Maria Silva',
      unit: 'Rua das Flores, 10',
      role: 'resident',
      active: true,
      termsVersion: TERMS_VERSION,
    });
    expect((await db().doc('invites/CE-ABCD-EFGH').get()).data()).toMatchObject({ used: true, usedBy: user.uid });
    // a marca do token já nasce com a conta (usada pelas regras do Storage)
    expect(user.customClaims).toEqual({ resident: true, admin: false });
  });

  it('convite de administrador cria um admin', async () => {
    await seedInvite('CE-ABCD-EFGH', 'admin');
    await request(app).post('/register').send(body()).expect(201);
    const user = await getAuth().getUserByEmail('maria@teste.com');
    expect((await db().doc(`residents/${user.uid}`).get()).get('role')).toBe('admin');
  });

  it('exige aceitar a política de privacidade', async () => {
    await seedInvite('CE-ABCD-EFGH');
    const res = await request(app).post('/register').send(body({ acceptedTerms: false })).expect(400);
    expect(res.body.error).toMatch(/Privacidade/);
  });

  it('não deixa usar o mesmo convite duas vezes', async () => {
    await seedInvite('CE-ABCD-EFGH');
    await request(app).post('/register').send(body()).expect(201);
    await request(app).post('/register').send(body({ email: 'outra@teste.com' })).expect(409);
  });

  it('recusa código inexistente ou mal formatado', async () => {
    await request(app).post('/register').send(body()).expect(404);
    await request(app).post('/register').send(body({ code: 'XYZ' })).expect(400);
  });

  it('valida nome, e-mail e senha', async () => {
    await seedInvite('CE-ABCD-EFGH');
    await request(app).post('/register').send(body({ name: 'A' })).expect(400);
    await request(app).post('/register').send(body({ email: 'sem-arroba' })).expect(400);
    await request(app).post('/register').send(body({ password: '123' })).expect(400);
    await request(app).post('/register').send(body({ unit: undefined })).expect(400);
  });

  it('e-mail já cadastrado devolve o convite para uso', async () => {
    await createResident('maria@teste.com');
    await seedInvite('CE-ABCD-EFGH');
    const res = await request(app).post('/register').send(body()).expect(409);
    expect(res.body.error).toMatch(/e-mail/);
    expect((await db().doc('invites/CE-ABCD-EFGH').get()).get('claimed')).toBe(false);
  });
});

describe('convites (somente administração)', () => {
  let adminToken: string;
  let residentToken: string;

  beforeEach(async () => {
    await createResident('admin@teste.com', { role: 'admin' });
    await createResident('morador@teste.com');
    adminToken = await idToken('admin@teste.com');
    residentToken = await idToken('morador@teste.com');
  });

  it('bloqueia quem não está logado ou não é admin', async () => {
    await request(app).get('/invites').expect(401);
    await request(app).get('/invites').set('Authorization', 'Bearer token-falso').expect(401);
    await request(app).get('/invites').set('Authorization', `Bearer ${residentToken}`).expect(403);
  });

  it('gera, lista e cancela um convite', async () => {
    const created = await request(app)
      .post('/invites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'resident', note: 'casa 12' })
      .expect(201);
    const code: string = created.body.code;
    // sem 0/O/1/I/L para não confundir na digitação
    expect(code).toMatch(/^CE-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);

    const list = await request(app).get('/invites').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(list.body).toEqual([expect.objectContaining({ code, note: 'casa 12', role: 'resident', used: false })]);

    await request(app).delete(`/invites/${code}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect((await db().doc(`invites/${code}`).get()).exists).toBe(false);
  });

  it('não cancela convite já usado nem inexistente', async () => {
    await seedInvite('CE-ABCD-EFGH', 'resident', { used: true });
    await request(app).delete('/invites/CE-ABCD-EFGH').set('Authorization', `Bearer ${adminToken}`).expect(409);
    await request(app).delete('/invites/CE-ZZZZ-ZZZZ').set('Authorization', `Bearer ${adminToken}`).expect(404);
  });

  it('admin bloqueado perde o acesso à API', async () => {
    const { uid } = await getAuth().getUserByEmail('admin@teste.com');
    await db().doc(`residents/${uid}`).update({ active: false });
    await request(app).get('/invites').set('Authorization', `Bearer ${adminToken}`).expect(403);
  });
});

describe('PATCH /residents/:uid (bloquear, reativar, tornar admin)', () => {
  let adminToken: string;
  let adminUid: string;
  let moradorUid: string;

  beforeEach(async () => {
    adminUid = await createResident('admin@teste.com', { role: 'admin' });
    moradorUid = await createResident('morador@teste.com');
    adminToken = await idToken('admin@teste.com');
  });

  const patch = (uid: string, data: object) =>
    request(app).patch(`/residents/${uid}`).set('Authorization', `Bearer ${adminToken}`).send(data);

  it('bloquear desativa o perfil e o login', async () => {
    await patch(moradorUid, { active: false }).expect(200);
    expect((await db().doc(`residents/${moradorUid}`).get()).get('active')).toBe(false);
    expect((await getAuth().getUser(moradorUid)).disabled).toBe(true);
  });

  it('reativar libera de novo', async () => {
    await patch(moradorUid, { active: false }).expect(200);
    await patch(moradorUid, { active: true }).expect(200);
    expect((await getAuth().getUser(moradorUid)).disabled).toBe(false);
  });

  it('muda o papel para administrador', async () => {
    await patch(moradorUid, { role: 'admin' }).expect(200);
    expect((await db().doc(`residents/${moradorUid}`).get()).get('role')).toBe('admin');
  });

  it('não permite alterar a si mesmo, pedido vazio ou morador inexistente', async () => {
    await patch(adminUid, { active: false }).expect(400);
    await patch(moradorUid, { qualquer: 1 }).expect(400);
    await patch('nao-existe', { active: false }).expect(404);
  });
});

describe('POST /me/claims', () => {
  it('atualiza a marca de morador no token de quem já tinha conta', async () => {
    const uid = await createResident('antigo@teste.com');
    const token = await idToken('antigo@teste.com');
    const res = await request(app).post('/me/claims').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toEqual({ resident: true });
    expect((await getAuth().getUser(uid)).customClaims).toEqual({ resident: true, admin: false });
  });

  it('setResidentClaims ignora usuário que não existe mais', async () => {
    await expect(setResidentClaims('nao-existe', true, false)).resolves.toBeUndefined();
  });
});

describe('DELETE /me (excluir minha conta)', () => {
  it('apaga perfil, login, itens do mural, votos e presenças e anonimiza o resto', async () => {
    const uid = await createResident('sai@teste.com', { name: 'Fulano' });
    const outro = await createResident('fica@teste.com');
    await db().doc('lostFound/l1').set({ authorId: uid, title: 'Chave' });
    await db().doc('lostFound/l2').set({ authorId: outro, title: 'Gato' });
    await db().doc('suggestions/s1').set({ authorId: uid, authorName: 'Fulano' });
    await db().doc(`suggestions/s1/votes/${uid}`).set({ value: 1 });
    await db().doc('meetings/m1').set({ title: 'Assembleia' });
    await db().doc(`meetings/m1/rsvps/${uid}`).set({ name: 'Fulano' });
    await db().doc('announcements/a1').set({ authorId: uid, authorName: 'Fulano' });

    const token = await idToken('sai@teste.com');
    await request(app).delete('/me').set('Authorization', `Bearer ${token}`).expect(200);

    expect((await db().doc(`residents/${uid}`).get()).exists).toBe(false);
    await expect(getAuth().getUser(uid)).rejects.toThrow();
    expect((await db().doc('lostFound/l1').get()).exists).toBe(false);
    expect((await db().doc('lostFound/l2').get()).exists).toBe(true);
    expect((await db().doc(`suggestions/s1/votes/${uid}`).get()).exists).toBe(false);
    expect((await db().doc(`meetings/m1/rsvps/${uid}`).get()).exists).toBe(false);
    expect((await db().doc('suggestions/s1').get()).data()).toMatchObject({ authorName: 'Ex-morador', authorId: '' });
    expect((await db().doc('announcements/a1').get()).data()).toMatchObject({ authorName: 'Diretoria' });
  });

  it('o único administrador não pode excluir a conta', async () => {
    await createResident('admin@teste.com', { role: 'admin' });
    const token = await idToken('admin@teste.com');
    const res = await request(app).delete('/me').set('Authorization', `Bearer ${token}`).expect(409);
    expect(res.body.error).toMatch(/único administrador/);
  });

  it('admin pode excluir se houver outro admin', async () => {
    await createResident('admin1@teste.com', { role: 'admin' });
    await createResident('admin2@teste.com', { role: 'admin' });
    const token = await idToken('admin1@teste.com');
    await request(app).delete('/me').set('Authorization', `Bearer ${token}`).expect(200);
  });
});
