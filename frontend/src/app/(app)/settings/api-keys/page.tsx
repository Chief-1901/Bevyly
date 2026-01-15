import { Suspense } from 'react';
import { apiKeysApi, type ApiKey } from '@/lib/api/server';
import { ApiKeysContent } from './ApiKeysContent';

export const dynamic = 'force-dynamic';

async function fetchApiKeys() {
  const result = await apiKeysApi.list();

  if (!result.success || !result.data) {
    return { apiKeys: [] };
  }

  return {
    apiKeys: Array.isArray(result.data) ? result.data : [],
  };
}

export default async function ApiKeysPage() {
  const { apiKeys } = await fetchApiKeys();

  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <ApiKeysContent apiKeys={apiKeys} />
    </Suspense>
  );
}

