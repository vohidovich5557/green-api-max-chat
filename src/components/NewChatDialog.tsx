import { useEffect, useRef, useState, type FormEvent } from 'react';
import { greenApi, GreenApiError } from '../api/greenApi';
import type { Credentials } from '../types';
import { isValidPhone, toDigits } from '../utils/phone';
import { IconClose } from './Icons';

interface Props {
  credentials: Credentials;
  onClose: () => void;
  onCreated: (chatId: string, phone: string) => void;
}

export function NewChatDialog({ credentials, onClose, onCreated }: Props) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone)) {
      setError('Введите номер в международном формате, например +7 999 123 45 67.');
      return;
    }
    const digits = toDigits(phone);
    setLoading(true);
    setError(null);
    try {
      // In MAX a chat is addressed by chatId, so resolve it from the phone first
      const { chatId, exist } = await greenApi.checkAccount(credentials, digits);
      if (!exist || !chatId) {
        setError('На этот номер не зарегистрирован аккаунт MAX, или он скрыт настройками приватности.');
        return;
      }
      onCreated(chatId, digits);
    } catch (err) {
      setError(err instanceof GreenApiError ? err.message : 'Не удалось проверить номер.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="new-chat-title" onSubmit={handleSubmit}>
        <header className="dialog__head">
          <h2 id="new-chat-title">Новый чат</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <IconClose />
          </button>
        </header>
        <label className="field">
          <span>Номер телефона получателя</span>
          <input
            ref={inputRef}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 999 123 45 67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn--primary btn--block" type="submit" disabled={loading || !phone.trim()}>
          {loading ? 'Ищем в MAX…' : 'Создать чат'}
        </button>
      </form>
    </div>
  );
}
