'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Integration {
  id: string;
  name: string;
  description: string;
  type: 'oauth' | 'api_key';
  category: 'email' | 'calendar' | 'enrichment' | 'ai';
  status: 'connected' | 'disconnected' | 'error';
  connectedEmail?: string;
  connectedAt?: string;
  icon: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Send and receive emails through your Gmail account',
    type: 'oauth',
    category: 'email',
    status: 'disconnected',
    icon: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    description: 'Send and receive emails through your Outlook account',
    type: 'oauth',
    category: 'email',
    status: 'disconnected',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync meetings and schedule events with Google Calendar',
    type: 'oauth',
    category: 'calendar',
    status: 'disconnected',
    icon: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z',
  },
  {
    id: 'apollo',
    name: 'Apollo.io',
    description: 'Enrich leads and find contact information',
    type: 'api_key',
    category: 'enrichment',
    status: 'disconnected',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Power AI-driven features with GPT models',
    type: 'api_key',
    category: 'ai',
    status: 'disconnected',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  email: 'Email',
  calendar: 'Calendar',
  enrichment: 'Data Enrichment',
  ai: 'AI & Automation',
};

export function IntegrationsContent() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/v1/integrations');
      const data = await response.json();

      if (response.ok && data.success && data.data) {
        // Merge server data with static integration info
        const updatedIntegrations = INTEGRATIONS.map((integration) => {
          const serverData = data.data.find((s: { id: string }) => s.id === integration.id);
          if (serverData) {
            return {
              ...integration,
              status: serverData.status,
              connectedEmail: serverData.connectedEmail,
              connectedAt: serverData.connectedAt,
            };
          }
          return integration;
        });
        setIntegrations(updatedIntegrations);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      // Keep default disconnected state if API fails
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthConnect = async (integration: Integration) => {
    try {
      const response = await fetch(`/api/v1/integrations/${integration.id}/auth-url`, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok && data.success && data.data?.authUrl) {
        // Redirect to OAuth provider
        window.location.href = data.data.authUrl;
      } else {
        toast.error('Connection failed', data.error?.message || 'Failed to initiate OAuth flow');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      toast.error('Connection failed', 'Could not connect to server');
    }
  };

  const handleApiKeyConnect = (integration: Integration) => {
    setSelectedIntegration(integration);
    setApiKey('');
    setShowApiKeyModal(true);
  };

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntegration) return;

    setIsConnecting(true);

    try {
      const response = await fetch(`/api/v1/integrations/${selectedIntegration.id}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Integration connected', `${selectedIntegration.name} has been connected`);
        setShowApiKeyModal(false);
        setApiKey('');
        fetchIntegrations();
      } else {
        toast.error('Connection failed', data.error?.message || 'Invalid API key');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      toast.error('Connection failed', 'Could not connect to server');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    if (!confirm(`Are you sure you want to disconnect ${integration.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/integrations/${integration.id}/disconnect`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Disconnected', `${integration.name} has been disconnected`);
        fetchIntegrations();
      } else {
        toast.error('Disconnect failed', data.error?.message || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.error('Disconnect failed', 'Could not connect to server');
    }
  };

  const handleTestConnection = async (integration: Integration) => {
    try {
      const response = await fetch(`/api/v1/integrations/${integration.id}/test`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Connection verified', `${integration.name} is working correctly`);
      } else {
        toast.error('Connection test failed', data.error?.message || 'Integration is not responding');
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      toast.error('Test failed', 'Could not connect to server');
    }
  };

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Integrations</h1>
          <p className="text-sm text-text-muted mt-1">Connect your tools and services</p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} padding="lg">
              <div className="animate-pulse flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Integrations</h1>
        <p className="text-sm text-text-muted mt-1">
          Connect your tools and services to power Bevyly
        </p>
      </div>

      {/* Integration Categories */}
      {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
        <div key={category} className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">
            {CATEGORY_LABELS[category] || category}
          </h2>
          <div className="grid gap-4">
            {categoryIntegrations.map((integration) => (
              <Card key={integration.id} padding="lg">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-text-muted"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d={integration.icon} />
                      </svg>
                    </div>

                    {/* Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-text-primary">{integration.name}</h3>
                        {integration.status === 'connected' ? (
                          <Badge variant="success">
                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                        ) : integration.status === 'error' ? (
                          <Badge variant="danger">
                            <XCircleIcon className="w-3 h-3 mr-1" />
                            Error
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-text-muted mt-0.5">{integration.description}</p>
                      {integration.connectedEmail && (
                        <p className="text-xs text-text-muted mt-1">
                          Connected as: {integration.connectedEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {integration.status === 'connected' ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleTestConnection(integration)}
                        >
                          <ArrowPathIcon className="w-4 h-4 mr-1" />
                          Test
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDisconnect(integration)}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          integration.type === 'oauth'
                            ? handleOAuthConnect(integration)
                            : handleApiKeyConnect(integration)
                        }
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* API Key Modal */}
      <Modal
        open={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        title={`Connect ${selectedIntegration?.name}`}
        size="md"
      >
        <form onSubmit={handleApiKeySubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              API Key *
            </label>
            <Input
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-text-muted">
              You can find your API key in your {selectedIntegration?.name} dashboard
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowApiKeyModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isConnecting}>
              Connect
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
