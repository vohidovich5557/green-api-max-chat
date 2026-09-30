import { useMemo, useState } from 'react';
import type { Chat } from '../types';
import type { ConnectionStatus } from '../hooks/useNotificationPolling';
import { formatListTime } from '../utils/format';
import { formatPhone } from '../utils/phone';
import { Avatar } from './Avatar';
import { IconCompose, IconLogout, IconSearch, StatusTicks } from './Icons';

interface Props {
  chats: Chat[];
  activeChatId: string | null;
  idInstance: string;
  connection: ConnectionStatus;
  onSelect: (chatId: string) => void;
  onNewChat: () => void;
  onLogout: () => void;
}

export const chatTitle = (c: Chat) => c.name || (c.phone ? formatPhone(c.phone) : `ID ${c.chatId}`);

export function Sidebar({ chats, activeChatId, idInstance, connection, onSelect, onNewChat, onLogout }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return chats.filter((c) => {
      if (!q) return true;
      return chatTitle(c).toLowerCase().includes(q) || (qDigits && c.phone?.includes(qDigits));
    });
  }, [chats, query]);

  return (
    <aside className="sidebar">
      <header className="sidebar__head">
        <h1>Чаты</h1>
        <button className="icon-btn icon-btn--accent" onClick={onNewChat} aria-label="Новый чат" title="Новый чат">
          <IconCompose />
        </button>
      </header>

      <div className="search">
        <IconSearch width={18} height={18} />
        <input
          type="search"
          placeholder="Поиск"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Поиск по чатам"
        />
      </div>

      <nav className="chat-list" aria-label="Список чатов">
        {chats.length === 0 && (
          <div className="chat-list__empty">
            <p>Здесь появятся ваши диалоги.</p>
            <button className="btn btn--primary" onClick={onNewChat}>
              Начать чат
            </button>
          </div>
        )}
        {chats.length > 0 && filtered.length === 0 && <p className="chat-list__none">Ничего не найдено</p>}
        {filtered.map((c) => {
          const last = c.messages[c.messages.length - 1];
          const title = chatTitle(c);
          return (
            <button
              key={c.chatId}
              className={`chat-item ${c.chatId === activeChatId ? 'is-active' : ''}`}
              onClick={() => onSelect(c.chatId)}
              aria-current={c.chatId === activeChatId}
            >
              <Avatar seed={c.chatId} label={title} />
              <div className="chat-item__body">
                <div className="chat-item__row">
                  <span className="chat-item__title">{title}</span>
                  {last && <time className="chat-item__time">{formatListTime(last.timestamp)}</time>}
                </div>
                <div className="chat-item__row">
                  <span className="chat-item__preview">
                    {last?.direction === 'out' && <StatusTicks status={last.status} />}
                    <span className="chat-item__text">{last ? last.text : 'Нет сообщений'}</span>
                  </span>
                  {c.unread > 0 && <span className="badge">{c.unread > 99 ? '99+' : c.unread}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      <footer className="sidebar__foot">
        <span className={`conn conn--${connection}`}>
          <i />
          {connection === 'online' ? 'В сети' : connection === 'connecting' ? 'Подключение…' : 'Переподключение…'}
          <small>Инстанс {idInstance}</small>
        </span>
        <button className="icon-btn" onClick={onLogout} aria-label="Выйти" title="Выйти">
          <IconLogout width={20} height={20} />
        </button>
      </footer>
    </aside>
  );
}
