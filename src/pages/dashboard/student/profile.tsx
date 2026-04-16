import React, { useEffect, useState } from 'react';
import { AuthUser } from '../../../../lib/auth';
import Button from '../../../../components/Button';
import Card from '../../../../components/Card';
import { api } from '../../../../lib/api';

interface StudentProfileProps {
  user: AuthUser;
}

const StudentProfile: React.FC<StudentProfileProps> = ({ user }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [country, setCountry] = useState('');
  const [certificateName, setCertificateName] = useState(user.name);
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { profile } = await api.getProfile();
        setName(profile.name);
        setEmail(profile.email);
        setBio(profile.bio || '');
        setCountry(profile.country || '');
        setCertificateName(profile.certificate_name || user.name);
        setAvatarPreview(profile.avatar_url || '');
      } catch (error) {
        console.error('Failed to load profile:', error);
        // Fallback to user data
        setName(user.name);
        setEmail(user.email);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      try {
        await api.updateProfile({ avatar_url: result });
        window.dispatchEvent(new Event('profile-updated'));
        setStatusMessage('Profile picture updated successfully.');
      } catch (error) {
        setStatusMessage('Failed to update profile picture.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage('');
    try {
      await api.updateProfile({ name, bio, country, certificate_name: certificateName });
      setStatusMessage('Profile updated successfully.');
      window.dispatchEvent(new Event('profile-updated'));
    } catch (error) {
      setStatusMessage('Failed to update profile.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Manage Your Profile</h1>
        <p className="text-gray-600">Update your display name, profile photo, and learning profile.</p>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading profile...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <img
                src={avatarPreview || 'https://via.placeholder.com/160?text=Avatar'}
                alt="Profile preview"
                className="h-40 w-40 rounded-full object-cover"
              />
              <label className="block text-sm font-medium text-gray-700 w-full text-left">
                Upload profile photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="mt-2 w-full text-sm text-slate-700"
                />
              </label>
              <p className="text-sm text-gray-500">Use a friendly photo so tutors and classmates recognize you easily.</p>
            </div>
          </Card>

          <Card className="p-6">
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your full name (as it should appear on certificates)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              <p className="mt-2 text-sm text-gray-500">This name will be used on your completion certificates.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name for certificate</label>
                <input
                  type="text"
                  value={certificateName}
                  onChange={(event) => setCertificateName(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Short bio</label>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-500">
                  Your profile information is saved securely on our servers.
                </div>
                <Button type="submit">Save Profile</Button>
              </div>

              {statusMessage && (
                <div className="rounded-2xl bg-green-50 p-4 text-sm text-green-700">{statusMessage}</div>
              )}
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
