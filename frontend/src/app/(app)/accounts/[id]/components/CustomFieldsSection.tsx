'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CustomFieldsSectionProps {
  customFields: Record<string, unknown>;
  accountId: string;
  onUpdate: () => Promise<void>;
  editable?: boolean;
}

export function CustomFieldsSection({
  customFields,
  accountId,
  onUpdate,
  editable = true,
}: CustomFieldsSectionProps) {
  const { toast } = useToast();
  const [fields, setFields] = useState<Record<string, unknown>>(customFields || {});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newField, setNewField] = useState({ key: '', value: '' });

  const handleAddField = () => {
    if (!newField.key.trim()) {
      toast.error('Invalid field', 'Field name cannot be empty');
      return;
    }

    if (fields[newField.key]) {
      toast.error('Duplicate field', 'A field with this name already exists');
      return;
    }

    setFields((prev) => ({ ...prev, [newField.key]: newField.value }));
    setNewField({ key: '', value: '' });
    setIsAdding(false);
  };

  const handleEditField = (key: string) => {
    setEditingKey(key);
  };

  const handleUpdateField = (key: string, newValue: string) => {
    setFields((prev) => ({ ...prev, [key]: newValue }));
    setEditingKey(null);
  };

  const handleDeleteField = (key: string) => {
    setFields((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/v1/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customFields: fields }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Custom fields updated', 'Changes saved successfully');
        await onUpdate();
      } else {
        toast.error('Update failed', data.error?.message || 'Failed to update custom fields');
      }
    } catch (error) {
      console.error('Failed to update custom fields:', error);
      toast.error('Update failed', 'Could not connect to server');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(fields) !== JSON.stringify(customFields);

  return (
    <div className="space-y-4">
      {/* Custom Fields List */}
      <div className="space-y-2">
        {Object.entries(fields).length === 0 && !isAdding && (
          <p className="text-sm text-text-muted italic">No custom fields yet</p>
        )}

        {Object.entries(fields).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="text-sm font-medium text-text-primary">{key}</div>
              <div className="text-sm text-text-muted">
                {editingKey === key ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={String(value)}
                      onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateField(key, String(value));
                        } else if (e.key === 'Escape') {
                          setEditingKey(null);
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                                            onClick={() => handleUpdateField(key, String(value))}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                                            onClick={() => {
                        setFields((prev) => ({ ...prev, [key]: customFields[key] }));
                        setEditingKey(null);
                      }}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  String(value)
                )}
              </div>
            </div>
            {editable && editingKey !== key && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                                    onClick={() => handleEditField(key)}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                                    onClick={() => handleDeleteField(key)}
                >
                  <TrashIcon className="h-4 w-4 text-danger" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add New Field Form */}
      {isAdding && editable && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs text-text-muted mb-1">Field Name</label>
            <Input
              value={newField.key}
              onChange={(e) => setNewField((prev) => ({ ...prev, key: e.target.value }))}
              placeholder="e.g., Industry Vertical"
                          />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-text-muted mb-1">Value</label>
            <Input
              value={newField.value}
              onChange={(e) => setNewField((prev) => ({ ...prev, value: e.target.value }))}
              placeholder="e.g., Healthcare"
                          />
          </div>
          <div className="flex gap-1">
            <Button size="sm" onClick={handleAddField}>
              <CheckIcon className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIsAdding(false)}>
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {editable && (
        <div className="flex justify-between pt-2">
          {!isAdding && (
            <Button
              variant="secondary"
                            leftIcon={<PlusIcon className="h-4 w-4" />}
              onClick={() => setIsAdding(true)}
            >
              Add Field
            </Button>
          )}
          {hasChanges && (
            <Button
                            onClick={handleSave}
              isLoading={isSaving}
            >
              Save Changes
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
