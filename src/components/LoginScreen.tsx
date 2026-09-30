import { useState, type FormEvent } from 'react';
import { greenApi, GreenApiError } from '../api/greenApi';
import type { Credentials } from '../types';
import { IconEye, IconEyeOff, MaxLogo } from './Icons';

const STATE_HINTS: Record<string, string> = {
  notAuthorized: 'Инстанс не авторизован в MAX. Отсканируйте QR-код в личном кабинете GREEN-API и попробуйте снова.',
  blocked: 'Аккаунт MAX на этом инстансе заблокирован.',
  starting: 'Инстанс запускается. Подождите минуту и попробуйте снова.',
  yellowCard: 'Отправка с инстанса временно ограничена (yellowCard).',
};

export function LoginScreen({ initial, onLogin }: { initial?: Credentials | null; onLogin: (c: Credentials) => void }) {
  const [apiUrl, setApiUrl] = useState(initial?.apiUrl ?? 'https://api.green-api.com');
  const [idInstance, setIdInstance] = useState(initial?.idInstance ?? '');
  const [apiTokenInstance, setToken] = useState(initial?.apiTokenInstance ?? '');
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = idInstance.trim() && apiTokenInstance.trim() && apiUrl.trim() && !loading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const creds: Credentials = { apiUrl: apiUrl.trim(), idInstance: idInstance.trim(), apiTokenInstance: apiTokenInstance.trim() };
    setLoading(true);
    setError(null);
    try {
      const state = await greenApi.getStateInstance(creds);
      if (state !== 'authorized') {
        setError(STATE_HINTS[state] ?? `Инстанс в состоянии «${state}». Для работы нужен статус authorized.`);
        return;
      }
      onLogin(creds);
    } catch (err) {
      setError(err instanceof GreenApiError ? err.message : 'Не удалось подключиться к GREEN-API.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <form className="login__card" onSubmit={handleSubmit} noValidate>
        <div className="login__brand">
          <MaxLogo size={56} />
          <h1>Вход в MAX Chat</h1>
          <p>Введите данные инстанса из личного кабинета GREEN-API</p>
        </div>

        <label className="field">
          <span>idInstance</span>
          <input
            inputMode="numeric"
            autoComplete="off"
            placeholder="3100000001"
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value.replace(/\s/g, ''))}
            autoFocus
            required
          />
        </label>

        <label className="field">
          <span>apiTokenInstance</span>
          <div className="field__with-action">
            <input
              type={showToken ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              placeholder="d75b3a66374942c5b3c019c698abc2067e151558acbd..."
              value={apiTokenInstance}
              onChange={(e) => setToken(e.target.value.trim())}
              required
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
            >
              {showToken ? <IconEyeOff width={18} height={18} /> : <IconEye width={18} height={18} />}
            </button>
          </div>
        </label>

        <details className="login__advanced">
          <summary>apiUrl инстанса</summary>
          <label className="field">
            <span>apiUrl</span>
            <input
              type="url"
              spellCheck={false}
              placeholder="https://3100.api.green-api.com"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <small>Указан в личном кабинете рядом с idInstance. Для большинства инстансов подходит значение по умолчанию.</small>
          </label>
        </details>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn--primary btn--block" type="submit" disabled={!canSubmit}>
          {loading ? 'Проверяем инстанс…' : 'Войти'}
        </button>

        <p className="login__foot">
          Нет инстанса?{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            Создайте его в консоли GREEN-API
          </a>
        </p>
      </form>
    </main>
  );
}
