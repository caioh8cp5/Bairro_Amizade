/**
 * API RESTful (Express) da Associação de Moradores do Champs Élysées.
 *
 * Responsável pelas operações que o app não pode fazer direto no banco,
 * porque mexem na whitelist:
 *   POST   /register            -> morador usa o código de convite e cria a conta
 *   GET    /invites             -> (admin) lista convites
 *   POST   /invites             -> (admin) gera convite para um morador
 *   DELETE /invites/:code       -> (admin) cancela convite não usado
 *   PATCH  /residents/:uid      -> (admin) ativa/bloqueia morador ou muda papel
 *   DELETE /me                  -> morador exclui a própria conta e seus dados (LGPD / Google Play)
 */
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { randomInt } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const db = () => getFirestore();

type Role = 'resident' | 'admin';
interface AuthedRequest extends Request {
  uid?: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Sem 0/O/1/I/L para evitar confusão na hora de digitar
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newInviteCode(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `CE-${s.slice(0, 4)}-${s.slice(4)}`;
}
export function normalizeCode(code: string): string {
  const raw = code.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^CE/, '');
  return raw.length === 8 ? `CE-${raw.slice(0, 4)}-${raw.slice(4)}` : '';
}

function str(v: unknown, field: string, min: number, max: number): string {
  if (typeof v !== 'string' || v.trim().length < min || v.trim().length > max) {
    throw new HttpError(400, `Campo "${field}" inválido.`);
  }
  return v.trim();
}

/** Versão da Política de Privacidade aceita no cadastro (LGPD). */
export const TERMS_VERSION = '2026-11';

/** Valida o ID token do Firebase. Com adminOnly, exige também um administrador ativo. */
const authenticate =
  (adminOnly: boolean) => async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      if (!token) throw new HttpError(401, 'Não autenticado.');
      const decoded = await getAuth().verifyIdToken(token, true);
      if (adminOnly) {
        const snap = await db().doc(`residents/${decoded.uid}`).get();
        if (!snap.exists || snap.get('active') !== true || snap.get('role') !== 'admin') {
          throw new HttpError(403, 'Acesso restrito à administração.');
        }
      }
      req.uid = decoded.uid;
      next();
    } catch (e) {
      next(e instanceof HttpError ? e : new HttpError(401, 'Sessão inválida.'));
    }
  };
const requireUser = authenticate(false);
const requireAdmin = authenticate(true);

/** Grava no token de login se a pessoa é moradora ativa (lido pelas regras do Storage). */
export async function setResidentClaims(uid: string, active: boolean, admin: boolean) {
  await getAuth()
    .setCustomUserClaims(uid, { resident: active, admin: active && admin })
    .catch((e) => {
      if ((e as { code?: string }).code !== 'auth/user-not-found') throw e;
    });
}

const wrap =
  (fn: (req: AuthedRequest, res: Response) => Promise<unknown>) =>
  (req: AuthedRequest, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post(
  '/register',
  wrap(async (req, res) => {
    const code = normalizeCode(String(req.body?.code ?? ''));
    // Nome e endereço são preenchidos pelo próprio morador no primeiro acesso
    const name = str(req.body?.name, 'nome', 2, 80);
    const unit = str(req.body?.unit, 'endereço', 2, 80);
    const email = str(req.body?.email, 'email', 5, 120).toLowerCase();
    const password = str(req.body?.password, 'senha', 6, 100);
    if (req.body?.acceptedTerms !== true) {
      throw new HttpError(400, 'É preciso aceitar a Política de Privacidade para criar a conta.');
    }
    if (!code) throw new HttpError(400, 'Código de convite inválido.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'E-mail inválido.');

    const inviteRef = db().doc(`invites/${code}`);
    // Reserva o convite numa transação para que ele só possa ser usado uma vez
    const invite = await db().runTransaction(async (tx) => {
      const snap = await tx.get(inviteRef);
      if (!snap.exists) throw new HttpError(404, 'Código de convite não encontrado.');
      const data = snap.data()!;
      if (data.used || data.claimed) throw new HttpError(409, 'Este convite já foi utilizado.');
      tx.update(inviteRef, { claimed: true });
      return data as { role: Role };
    });

    let uid: string;
    try {
      const user = await getAuth().createUser({ email, password, displayName: name });
      uid = user.uid;
    } catch (e: unknown) {
      await inviteRef.update({ claimed: false });
      const codeErr = (e as { code?: string }).code;
      if (codeErr === 'auth/email-already-exists') throw new HttpError(409, 'Este e-mail já tem cadastro.');
      if (codeErr === 'auth/invalid-password') throw new HttpError(400, 'A senha precisa de ao menos 6 caracteres.');
      throw e;
    }

    const batch = db().batch();
    batch.set(db().doc(`residents/${uid}`), {
      name,
      unit,
      email,
      phone: '',
      role: invite.role === 'admin' ? 'admin' : 'resident',
      active: true,
      inviteCode: code,
      pushToken: null,
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.update(inviteRef, { used: true, usedBy: uid, usedByName: name, usedAt: FieldValue.serverTimestamp() });
    await batch.commit();
    // Já define a marca antes do primeiro login, para o token nascer com ela
    await setResidentClaims(uid, true, invite.role === 'admin');

    res.status(201).json({ ok: true });
  }),
);

app.get(
  '/invites',
  requireAdmin,
  wrap(async (_req, res) => {
    const snap = await db().collection('invites').orderBy('createdAt', 'desc').limit(200).get();
    res.json(
      snap.docs.map((d) => ({
        code: d.id,
        note: d.get('note') ?? '',
        role: d.get('role'),
        used: d.get('used') === true,
        createdAt: d.get('createdAt')?.toMillis?.() ?? null,
      })),
    );
  }),
);

app.post(
  '/invites',
  requireAdmin,
  wrap(async (req, res) => {
    // Observação opcional só para a diretoria lembrar para quem enviou (ex.: "vizinho da casa 12")
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 80) : '';
    const role: Role = req.body?.role === 'admin' ? 'admin' : 'resident';

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newInviteCode();
      try {
        await db().doc(`invites/${code}`).create({
          note,
          role,
          used: false,
          claimed: false,
          createdBy: req.uid,
          createdAt: FieldValue.serverTimestamp(),
        });
        res.status(201).json({ code });
        return;
      } catch {
        // colisão de código (muito rara): tenta outro
      }
    }
    throw new HttpError(500, 'Não foi possível gerar o convite.');
  }),
);

app.delete(
  '/invites/:code',
  requireAdmin,
  wrap(async (req, res) => {
    const code = normalizeCode(String(req.params.code));
    const ref = db().doc(`invites/${code}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, 'Convite não encontrado.');
    if (snap.get('used')) throw new HttpError(409, 'Convite já utilizado; bloqueie o morador em vez disso.');
    await ref.delete();
    res.json({ ok: true });
  }),
);

app.patch(
  '/residents/:uid',
  requireAdmin,
  wrap(async (req, res) => {
    const uid = String(req.params.uid);
    if (uid === req.uid) throw new HttpError(400, 'Você não pode alterar o próprio acesso.');
    const ref = db().doc(`residents/${uid}`);
    if (!(await ref.get()).exists) throw new HttpError(404, 'Morador não encontrado.');

    const update: Record<string, unknown> = {};
    if (typeof req.body?.active === 'boolean') update.active = req.body.active;
    if (req.body?.role === 'admin' || req.body?.role === 'resident') update.role = req.body.role;
    if (Object.keys(update).length === 0) throw new HttpError(400, 'Nada para alterar.');

    await ref.update(update);
    if (update.active === false) {
      // derruba a sessão do morador bloqueado
      await getAuth().updateUser(uid, { disabled: true });
      await getAuth().revokeRefreshTokens(uid);
    } else if (update.active === true) {
      await getAuth().updateUser(uid, { disabled: false });
    }
    res.json({ ok: true });
  }),
);

/** Atualiza a marca "resident" do token (contas criadas antes dela existir). */
app.post(
  '/me/claims',
  requireUser,
  wrap(async (req, res) => {
    const snap = await db().doc(`residents/${req.uid}`).get();
    const active = snap.exists && snap.get('active') === true;
    await setResidentClaims(req.uid!, active, snap.get('role') === 'admin');
    res.json({ resident: active });
  }),
);

/**
 * Exclusão da própria conta (exigência do Google Play e direito do titular na LGPD).
 * Apaga o perfil, o login, os itens do mural (com fotos), votos e presenças.
 * Sugestões e comunicados continuam visíveis, mas sem o nome do autor.
 */
app.delete(
  '/me',
  requireUser,
  wrap(async (req, res) => {
    const uid = req.uid!;
    const meRef = db().doc(`residents/${uid}`);
    const me = await meRef.get();

    if (me.exists && me.get('role') === 'admin' && me.get('active') === true) {
      const admins = await db()
        .collection('residents')
        .where('role', '==', 'admin')
        .where('active', '==', true)
        .get();
      if (admins.size <= 1) {
        throw new HttpError(409, 'Você é o único administrador. Torne outro morador administrador antes de excluir a conta.');
      }
    }

    const writer = db().bulkWriter();
    const [lost, sugs, mine, meetings, anns] = await Promise.all([
      db().collection('lostFound').where('authorId', '==', uid).get(),
      db().collection('suggestions').select().get(),
      db().collection('suggestions').where('authorId', '==', uid).get(),
      db().collection('meetings').select().get(),
      db().collection('announcements').where('authorId', '==', uid).get(),
    ]);
    lost.docs.forEach((d) => writer.delete(d.ref)); // a foto é apagada pelo gatilho cleanupLostFound
    sugs.docs.forEach((d) => writer.delete(d.ref.collection('votes').doc(uid)));
    meetings.docs.forEach((d) => writer.delete(d.ref.collection('rsvps').doc(uid)));
    mine.docs.forEach((d) => writer.update(d.ref, { authorName: 'Ex-morador', authorId: '' }));
    anns.docs.forEach((d) => writer.update(d.ref, { authorName: 'Diretoria', authorId: '' }));
    if (me.exists) writer.delete(meRef);
    await writer.close();

    await getAuth().deleteUser(uid);
    res.json({ ok: true });
  }),
);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Erro interno. Tente novamente.' });
});
