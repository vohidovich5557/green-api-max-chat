import type { Credentials } from '../types';
import type { ChatState } from './chatReducer';

const CREDS_KEY = 'max-chat:credentials';
const chatsKey = (idInstance: string) => `max-chat:chats:${idInstance}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or disabled — the app keeps working in memory */
  }
}

export const storage = {
  loadCredentials: () => read<Credentials>(CREDS_KEY),
  saveCredentials: (c: Credentials) => write(CREDS_KEY, c),
  clearCredentials: () => {
    try {
      localStorage.removeItem(CREDS_KEY);
    } catch {
      /* ignore */
    }
  },
  loadChats: (idInstance: string): ChatState | null => {
    const state = read<ChatState>(chatsKey(idInstance));
    if (!state?.chats) return null;
    // Messages that were "pending" when the tab closed never got a result — mark them failed so they can be retried
    for (const chat of Object.values(state.chats)) {
      chat.messages = chat.messages.map((m) =>
        m.status === 'pending' ? { ...m, status: 'failed', error: 'Отправка прервана' } : m,
      );
    }
    return state;
  },
  saveChats: (idInstance: string, state: ChatState) => write(chatsKey(idInstance), state),
};
