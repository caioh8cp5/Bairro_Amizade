import type { Timestamp } from 'firebase/firestore';

export type Role = 'resident' | 'admin';

export type Resident = {
  id: string;
  name: string;
  unit: string;
  email: string;
  phone?: string;
  role: Role;
  active: boolean;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  urgent: boolean;
  authorName: string;
  createdAt: Timestamp | null;
};

export type Meeting = {
  id: string;
  title: string;
  description: string;
  location: string;
  date: Timestamp;
  minutes?: string;
  goingCount: number;
};

export type Category = 'chaves' | 'documentos' | 'animais' | 'eletronicos' | 'outros';
export const CATEGORIES = [
  { key: 'chaves', label: 'Chaves', icon: 'key-outline' },
  { key: 'documentos', label: 'Documentos', icon: 'card-outline' },
  { key: 'animais', label: 'Animais', icon: 'paw-outline' },
  { key: 'eletronicos', label: 'Eletrônicos', icon: 'phone-portrait-outline' },
  { key: 'outros', label: 'Outros', icon: 'cube-outline' },
] as const satisfies readonly { key: Category; label: string; icon: string }[];

export type LostItem = {
  id: string;
  title: string;
  description: string;
  category: Category;
  kind: 'perdido' | 'encontrado';
  status: 'aberto' | 'devolvido';
  photoUrl: string | null;
  photoPath: string | null;
  authorId: string;
  authorName: string;
  createdAt: Timestamp | null;
};

export type SuggestionStatus = 'aberta' | 'em_analise' | 'aprovada' | 'recusada';
export const SUGGESTION_STATUS: Record<SuggestionStatus, string> = {
  aberta: 'Aberta para votação',
  em_analise: 'Em análise',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
};

export type Suggestion = {
  id: string;
  title: string;
  description: string;
  status: SuggestionStatus;
  voteCount: number;
  authorId: string;
  authorName: string;
  createdAt: Timestamp | null;
};
