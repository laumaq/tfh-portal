'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cyclePresenceState } from '../utils/convocationUtils';

export function useElevesOperations() {
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);

  const handleUpdate = async (
    eleveId: string, 
    field: string, 
    value: string
  ): Promise<void> => {
    try {
      const updateData: any = {};
      updateData[field] = value === '' ? null : value;

      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleveId);

      if (error) throw error;
      
    } catch (err) {
      console.error('❌ Erreur mise à jour:', err);
      throw err;
    }
  };

  const handleSelectUpdate = async (
    eleveId: string, 
    field: string, 
    value: string
  ): Promise<void> => {
    return handleUpdate(eleveId, field, value);
  };

  const handlePresenceUpdate = async (
    eleveId: string, 
    field: string, 
    currentValue: boolean | null
  ): Promise<void> => {
    const newValue = cyclePresenceState(currentValue);
    return handleUpdate(eleveId, field, newValue?.toString() || 'null');
  };

  return {
    editingCell,
    setEditingCell,
    handleUpdate,
    handleSelectUpdate,
    handlePresenceUpdate
  };
}
