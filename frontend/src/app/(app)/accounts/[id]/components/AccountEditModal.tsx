'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import type { Account } from '@/lib/api/server';

interface AccountEditModalProps {
  account: Account;
  open: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
}

type Tab = 'basic' | 'location' | 'social';

export function AccountEditModal({
  account,
  open,
  onClose,
  onSave,
}: AccountEditModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: account.name || '',
    domain: account.domain || '',
    website: account.website || '',
    industry: account.industry || '',
    employeeCount: account.employeeCount?.toString() || '',
    annualRevenue: account.annualRevenue ? (account.annualRevenue / 100).toString() : '',
    status: account.status || 'prospect',
    address: account.address || '',
    city: account.city || '',
    state: account.state || '',
    country: account.country || '',
    postalCode: account.postalCode || '',
    linkedinUrl: account.linkedinUrl || '',
    twitterUrl: account.twitterUrl || '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/v1/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          domain: formData.domain || undefined,
          website: formData.website || undefined,
          industry: formData.industry || undefined,
          employeeCount: formData.employeeCount ? parseInt(formData.employeeCount) : undefined,
          annualRevenue: formData.annualRevenue ? parseInt(formData.annualRevenue) * 100 : undefined,
          status: formData.status,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          country: formData.country || undefined,
          postalCode: formData.postalCode || undefined,
          linkedinUrl: formData.linkedinUrl || undefined,
          twitterUrl: formData.twitterUrl || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Account updated', 'Changes saved successfully');
        await onSave();
        onClose();
      } else {
        toast.error('Update failed', data.error?.message || 'Failed to update account');
      }
    } catch (error) {
      console.error('Failed to update account:', error);
      toast.error('Update failed', 'Could not connect to server');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'basic' as Tab, label: 'Basic Info' },
    { id: 'location' as Tab, label: 'Location' },
    { id: 'social' as Tab, label: 'Social' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Edit Account" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-700 dark:text-primary-500'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Company Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Domain
                  </label>
                  <Input
                    value={formData.domain}
                    onChange={(e) => handleChange('domain', e.target.value)}
                    placeholder="example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Website
                  </label>
                  <Input
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Industry
                  </label>
                  <Input
                    value={formData.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    placeholder="Technology"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Status
                  </label>
                  <select
                    className="w-full h-11 px-4 rounded-md border border-border bg-surface text-text-primary"
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                  >
                    <option value="prospect">Prospect</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="churned">Churned</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Employees
                  </label>
                  <Input
                    type="number"
                    value={formData.employeeCount}
                    onChange={(e) => handleChange('employeeCount', e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Annual Revenue (USD)
                  </label>
                  <Input
                    type="number"
                    value={formData.annualRevenue}
                    onChange={(e) => handleChange('annualRevenue', e.target.value)}
                    placeholder="1000000"
                  />
                </div>
              </div>
            </>
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Address
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    City
                  </label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="San Francisco"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    State/Province
                  </label>
                  <Input
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="CA"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Country
                  </label>
                  <Input
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    placeholder="United States"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Postal Code
                  </label>
                  <Input
                    value={formData.postalCode}
                    onChange={(e) => handleChange('postalCode', e.target.value)}
                    placeholder="94102"
                  />
                </div>
              </div>
            </>
          )}

          {/* Social Tab */}
          {activeTab === 'social' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  LinkedIn URL
                </label>
                <Input
                  value={formData.linkedinUrl}
                  onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                  placeholder="https://linkedin.com/company/example"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Twitter/X URL
                </label>
                <Input
                  value={formData.twitterUrl}
                  onChange={(e) => handleChange('twitterUrl', e.target.value)}
                  placeholder="https://twitter.com/example"
                />
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
