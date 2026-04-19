import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';

const SuperAdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.adminGetSettings();
        setSettings(response.settings || {});
        setEditValues(response.settings || {});
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };
    void loadSettings();
  }, []);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      await api.adminUpdateSetting(key, editValues[key] || '');
      setSettings(prev => ({ ...prev, [key]: editValues[key] || '' }));
    } catch (error) {
      console.error('Failed to update setting:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleAddSetting = async () => {
    const key = prompt('Enter setting key:');
    if (!key) return;
    const value = prompt('Enter setting value:') || '';
    setSaving(key);
    try {
      await api.adminUpdateSetting(key, value);
      setSettings(prev => ({ ...prev, [key]: value }));
      setEditValues(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Failed to add setting:', error);
    } finally {
      setSaving(null);
    }
  };

  const settingDescriptions: Record<string, string> = {
    student_materials_enabled: 'Allow students to access the materials page',
    platform_commission_rate: 'Platform commission percentage on course sales',
    maintenance_mode: 'Enable maintenance mode across the platform',
    allow_teacher_signups: 'Allow new teacher registrations',
    max_upload_size_mb: 'Maximum file upload size in megabytes',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Configure platform-wide settings</p>
        </div>
        <button
          onClick={handleAddSetting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Setting
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
          </div>
        ) : Object.keys(settings).length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No settings configured. Click "Add Setting" to create one.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {Object.entries(settings).map(([key, value]) => {
              const isBoolean = value === 'true' || value === 'false';
              const hasChanged = editValues[key] !== value;

              return (
                <div key={key} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 font-mono">{key}</p>
                    {settingDescriptions[key] && (
                      <p className="text-xs text-slate-500 mt-0.5">{settingDescriptions[key]}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {isBoolean ? (
                      <button
                        onClick={() => {
                          const newVal = editValues[key] === 'true' ? 'false' : 'true';
                          setEditValues(prev => ({ ...prev, [key]: newVal }));
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          editValues[key] === 'true' ? 'bg-green-500' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white transition ${
                            editValues[key] === 'true' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    ) : (
                      <input
                        type="text"
                        value={editValues[key] || ''}
                        onChange={(e) => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-48 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                      />
                    )}
                    <button
                      onClick={() => handleSave(key)}
                      disabled={!hasChanged || saving === key}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        hasChanged
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {saving === key ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminSettings;