import { useEffect, useState } from 'react';
import { initDatabase } from '../services/storageService';

/** 共享数据库初始化，供各 Tab 页面复用 */
export function useDatabase(): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    initDatabase()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((e: unknown) => {
        if (active) {
          const message = e instanceof Error ? e.message : String(e);
          setError(message);
        }
      });
    return () => { active = false; };
  }, []);

  return { ready, error };
}
