import { router, useFocusEffect } from 'expo-router';
import { collection, orderBy, query } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { api, Invite } from '@/lib/api';
import { shareInvite } from '@/lib/share';
import { useResident } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { errorMessage } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import type { Resident } from '@/lib/types';
import { Badge, Button, Card, Chip, Empty, ErrorBox, IconText, Loading, s, Screen } from '@/ui/components';
import { colors, space } from '@/ui/theme';

/** Gestão da whitelist (RF01): convites pendentes e moradores cadastrados. */
export default function Admin() {
  const me = useResident();
  const [tab, setTab] = useState<'convites' | 'moradores'>('convites');
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const residents = useLiveQuery<Resident>(() => query(collection(db, 'residents'), orderBy('name')), []);

  const loadInvites = useCallback(() => {
    setError(null);
    api
      .listInvites()
      .then(setInvites)
      .catch((e) => {
        setInvites([]);
        setError(errorMessage(e));
      });
  }, []);
  useFocusEffect(loadInvites);

  function cancelar(inv: Invite) {
    Alert.alert('Cancelar convite?', inv.code, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar convite',
        style: 'destructive',
        onPress: () =>
          api
            .deleteInvite(inv.code)
            .then(loadInvites)
            .catch((e) => Alert.alert('Erro', errorMessage(e))),
      },
    ]);
  }

  function alterar(r: Resident, change: { active?: boolean; role?: 'resident' | 'admin' }, msg: string) {
    Alert.alert(msg, r.name, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: () => api.updateResident(r.id, change).catch((e) => Alert.alert('Erro', errorMessage(e))),
      },
    ]);
  }

  const pending = (invites ?? []).filter((i) => !i.used);

  return (
    <Screen>
      <View style={s.row}>
        <Chip label={`Convites pendentes (${pending.length})`} selected={tab === 'convites'} onPress={() => setTab('convites')} />
        <Chip
          label={`Moradores (${residents.items.length})`}
          selected={tab === 'moradores'}
          onPress={() => setTab('moradores')}
        />
      </View>
      <ErrorBox text={error ?? residents.error} />

      {tab === 'convites' && (
        <>
          <Button label="Gerar convite" icon="ticket-outline" onPress={() => router.push('/admin/convite-novo')} />
          {invites === null && <Loading />}
          {invites !== null && pending.length === 0 && <Empty icon="ticket-outline" text="Nenhum convite pendente." />}
          {pending.map((inv) => (
            <Card key={inv.code}>
              {inv.role === 'admin' && (
                <Badge label="ADMIN" icon="shield-checkmark" color={colors.primary} bg={colors.primaryLight} />
              )}
              <Text selectable style={{ fontSize: 24, fontWeight: '800', letterSpacing: 2 }}>
                {inv.code}
              </Text>
              {!!inv.note && <IconText icon="document-text-outline">{inv.note}</IconText>}
              <View style={{ flexDirection: 'row', gap: space(1), marginTop: space(1) }}>
                <Button
                  label="Enviar"
                  icon="share-social-outline"
                  variant="secondary"
                  onPress={() => shareInvite(inv.code)}
                  style={{ flex: 1 }}
                />
                <Button label="Cancelar" variant="ghost" onPress={() => cancelar(inv)} style={{ flex: 1 }} />
              </View>
            </Card>
          ))}
        </>
      )}

      {tab === 'moradores' &&
        (residents.loading ? (
          <Loading />
        ) : (
          residents.items.map((r) => (
            <Card key={r.id} style={!r.active && { opacity: 0.65 }}>
              <View style={{ flexDirection: 'row', gap: space(1) }}>
                {r.role === 'admin' && (
                  <Badge label="ADMIN" icon="shield-checkmark" color={colors.primary} bg={colors.primaryLight} />
                )}
                {!r.active && <Badge label="BLOQUEADO" icon="lock-closed" color={colors.danger} bg={colors.dangerLight} />}
              </View>
              <Text style={s.cardTitle}>{r.name}</Text>
              <IconText icon="home-outline">{r.unit}</IconText>
              <IconText icon="mail-outline">{r.email}</IconText>
              {r.id !== me.id && (
                <View style={{ flexDirection: 'row', gap: space(1), marginTop: space(1) }}>
                  {r.active ? (
                    <Button
                      label="Bloquear"
                      variant="danger"
                      style={{ flex: 1 }}
                      onPress={() => alterar(r, { active: false }, 'Bloquear acesso deste morador?')}
                    />
                  ) : (
                    <Button
                      label="Reativar"
                      style={{ flex: 1 }}
                      onPress={() => alterar(r, { active: true }, 'Reativar acesso deste morador?')}
                    />
                  )}
                  <Button
                    label={r.role === 'admin' ? 'Tirar admin' : 'Tornar admin'}
                    variant="ghost"
                    style={{ flex: 1 }}
                    onPress={() =>
                      alterar(
                        r,
                        { role: r.role === 'admin' ? 'resident' : 'admin' },
                        r.role === 'admin' ? 'Remover permissão de administrador?' : 'Dar permissão de administrador?',
                      )
                    }
                  />
                </View>
              )}
            </Card>
          ))
        ))}
    </Screen>
  );
}
