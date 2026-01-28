'use client';

import { supabase } from '@/lib/supabase';
import { Eleve } from '../types';

export function useElevesOperations() {
  const handleUpdate = async (
    eleveId: string, 
    field: string, 
    value: string,
    onSuccess?: () => void
  ) => {
    try {
      const updateData: any = {};
      updateData[field] = value === '' ? null : value;

      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleveId);

      if (error) throw error;
      
      onSuccess?.();
      
    } catch (err) {
      console.error('❌ Erreur mise à jour:', err);
      throw err;
    }
  };

  const handlePresenceUpdate = async (
    eleveId: string, 
    field: string, 
    currentValue: boolean | null
  ) => {
    const cyclePresenceState = (current: boolean | null): boolean | null => {
      if (current === null) return true;
      if (current === true) return false;
      return null;
    };

    const newValue = cyclePresenceState(currentValue);
    
    return handleUpdate(eleveId, field, newValue?.toString() || '');
  };

  return {
    handleUpdate,
    handlePresenceUpdate
  };
}
