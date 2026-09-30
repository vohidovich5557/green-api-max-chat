import { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { Messenger } from './components/Messenger';
import { storage } from './store/storage';
import type { Credentials } from './types';

export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(() => storage.loadCredentials());

  if (!credentials) {
    return (
      <LoginScreen
        onLogin={(c) => {
          storage.saveCredentials(c);
          setCredentials(c);
        }}
      />
    );
  }

  return (
    <Messenger
      key={credentials.idInstance}
      credentials={credentials}
      onLogout={() => {
        storage.clearCredentials();
        setCredentials(null);
      }}
    />
  );
}
