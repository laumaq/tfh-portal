'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cyclePresenceState } from '../utils/convocationUtils';

export function useElevesOperations() {
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async (
    eleveId: string, 
    field: string, 
    value: string,
    onSuccess?: () => void
  ): Promise<void> => {
    try {
      setIsUpdating(true);
      
      const updateData: any = {};
      
      // Gérer spécialement les valeurs null/boolean
      if (value === 'null' || value === 'undefined') {
        updateData[field] = null;
      } else if (value === 'true' || value === 'false') {
        updateData[field] = value === 'true';
      } else {
        updateData[field] = value === '' ? null : value;
      }

      const { error } = await supabase
        .from('eleves')
        .update(updateData)
        .eq('id', eleveId);

      if (error) throw error;
      
      onSuccess?.();
      
    } catch (err) {
      console.error('❌ Erreur mise à jour:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectUpdate = async (
    eleveId: string, 
    field: string, 
    value: string,
    onSuccess?: () => void
  ): Promise<void> => {
    return handleUpdate(eleveId, field, value, onSuccess);
  };

  const handlePresenceUpdate = async (
    eleveId: string, 
    field: string, 
    currentValue: boolean | null,
    onSuccess?: (newValue: boolean | null) => void
  ): Promise<void> => {
    const newValue = cyclePresenceState(currentValue);
    
    // Convertir en string pour Supabase
    let valueString: string;
    if (newValue === null) {
      valueString = 'null';
    } else if (newValue === true) {
      valueString = 'true';
    } else {
      valueString = 'false';
    }
    
    return handleUpdate(eleveId, field, valueString, () => {
      onSuccess?.(newValue);
    });
  };

  return {
    editingCell,
    setEditingCell,
    isUpdating,
    handleUpdate,
    handleSelectUpdate,
    handlePresenceUpdate
  };
}
