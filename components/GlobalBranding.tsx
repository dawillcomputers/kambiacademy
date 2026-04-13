import React, { useState, useEffect } from 'react';

interface BrandingSettings {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
}

interface GlobalBrandingProps {
  onSettingsChange?: (settings: BrandingSettings) => void;
}

export default function GlobalBranding({ onSettingsChange }: GlobalBrandingProps) {
  const [settings, setSettings] = useState<BrandingSettings>({
    logoUrl: '',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    accentColor: '#f59e0b',
    fontFamily: 'Inter, sans-serif'
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Load existing settings from API
    loadBrandingSettings();
  }, []);

  const loadBrandingSettings = async () => {
    try {
      const response = await fetch('/api/admin/branding');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        onSettingsChange?.(data);
      }
    } catch (error) {
      console.error('Failed to load branding settings:', error);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/admin/upload-logo', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        const newSettings = { ...settings, logoUrl: data.url };
        setSettings(newSettings);
        onSettingsChange?.(newSettings);
      }
    } catch (error) {
      console.error('Failed to upload logo:', error);
    } finally {
      setUploading(false);
    }
  };

  const updateSettings = async (newSettings: BrandingSettings) => {
    try {
      const response = await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });

      if (response.ok) {
        setSettings(newSettings);
        onSettingsChange?.(newSettings);
      }
    } catch (error) {
      console.error('Failed to update branding settings:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      handleLogoUpload(file);
    }
  };

  const handleColorChange = (key: keyof BrandingSettings, value: string) => {
    const newSettings = { ...settings, [key]: value };
    updateSettings(newSettings);
  };

  const handleFontChange = (fontFamily: string) => {
    const newSettings = { ...settings, fontFamily };
    updateSettings(newSettings);
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm p-6">
      <h2 className="text-2xl font-bold mb-6">Global Branding Settings</h2>

      <div className="space-y-8">
        {/* Logo Upload */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Logo</h3>
          <div className="flex items-center gap-4">
            {settings.logoUrl && (
              <img
                src={settings.logoUrl}
                alt="Current logo"
                className="w-16 h-16 object-contain bg-white/10 rounded-lg p-2"
              />
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold cursor-pointer transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload Logo'}
              </label>
              <p className="text-sm text-white/70 mt-1">
                Recommended: PNG or SVG, max 2MB
              </p>
            </div>
          </div>
        </div>

        {/* Color Scheme */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Color Scheme</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  className="w-12 h-10 rounded border border-white/20"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Secondary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  className="w-12 h-10 rounded border border-white/20"
                />
                <input
                  type="text"
                  value={settings.secondaryColor}
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => handleColorChange('accentColor', e.target.value)}
                  className="w-12 h-10 rounded border border-white/20"
                />
                <input
                  type="text"
                  value={settings.accentColor}
                  onChange={(e) => handleColorChange('accentColor', e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Font Family */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Typography</h3>
          <div>
            <label className="block text-sm font-medium mb-2">Font Family</label>
            <select
              value={settings.fontFamily}
              onChange={(e) => handleFontChange(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="Roboto, sans-serif">Roboto</option>
              <option value="Open Sans, sans-serif">Open Sans</option>
              <option value="Lato, sans-serif">Lato</option>
              <option value="Poppins, sans-serif">Poppins</option>
              <option value="Montserrat, sans-serif">Montserrat</option>
            </select>
          </div>
        </div>

        {/* Preview */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          <div
            className="p-6 rounded-lg border border-white/20"
            style={{
              backgroundColor: settings.primaryColor + '10',
              fontFamily: settings.fontFamily
            }}
          >
            <div className="flex items-center gap-4 mb-4">
              {settings.logoUrl && (
                <img src={settings.logoUrl} alt="Logo" className="h-8" />
              )}
              <h4
                className="text-xl font-bold"
                style={{ color: settings.primaryColor }}
              >
                Kambi Academy
              </h4>
            </div>
            <p className="mb-4" style={{ color: settings.secondaryColor }}>
              Welcome to our learning platform with custom branding.
            </p>
            <button
              className="px-4 py-2 rounded-lg font-semibold text-white"
              style={{ backgroundColor: settings.accentColor }}
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}