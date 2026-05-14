// /app/components/ProfileEditor.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save, Mail, Phone, Monitor, BookOpen } from 'lucide-react';

interface ProfileEditorProps {
  userId: string;
  userType: 'externe' | 'guide';
  onClose: () => void;
  onUpdate: () => void;
}

export default function ProfileEditor({ userId, userType, onClose, onUpdate }: ProfileEditorProps) {
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [accepteNumerique, setAccepteNumerique] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProfile();
  }, [userId, userType]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const table = userType === 'externe' ? 'externes' : 'guides';
      const { data, error } = await supabase
        .from(table)
        .select('email, telephone, accepte_numerique')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setEmail(data?.email || '');
      setTelephone(data?.telephone || '');
      setAccepteNumerique(data?.accepte_numerique || false);
    } catch (err) {
      console.error('Erreur chargement profil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const table = userType === 'externe' ? 'externes' : 'guides';
      const { error } = await supabase
        .from(table)
        .update({
          email: email.trim() || null,
          telephone: telephone.trim() || null,
          accepte_numerique: accepteNumerique
        })
        .eq('id', userId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
      onUpdate();

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-800">
            {userType === 'externe' ? 'Mes informations' : 'Mes paramètres'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-6">
          {message && (
            <div className={`p-3 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="votre.email@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Cet email sera visible par l'administration.
            </p>
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Téléphone
            </label>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+32 123 45 67 89"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format international recommandé (ex: +32 123 45 67 89).
            </p>
          </div>

          {/* Préférence numérique - visible pour les deux types */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Préférence de format
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setAccepteNumerique(false)}
                className={`flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                  !accepteNumerique
                    ? 'border-gray-400 bg-gray-50 text-gray-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Version papier</div>
                  <div className="text-xs opacity-75">Reçoit une copie papier</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setAccepteNumerique(true)}
                className={`flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                  accepteNumerique
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <Monitor className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Version numérique</div>
                  <div className="text-xs opacity-75">Préfère le format numérique</div>
                </div>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {userType === 'externe' 
                ? "Cette préférence indique à l'administration votre choix de format. La version numérique permet de réduire les impressions."
                : "Cette préférence indique à l'administration votre choix de format pour les documents."
              }
            </p>
          </div>
        </div>

        {/* Boutons */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            disabled={saving}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Sauvegarder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
