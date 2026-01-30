import { CONVOCATION_OPTIONS } from '../constants';

// Dans convocationUtils.ts
export function getConvocationColor(value: string): string {
  if (!value) return 'bg-gray-200 text-gray-700'; // Vide ou null
  
  if (value.startsWith('Oui')) {
    // Différents types de "Oui"
    if (value.includes('mais')) return 'bg-orange-100 text-orange-800';
    if (value.includes('n\'a pas communiqué')) return 'bg-yellow-100 text-yellow-800';
    if (value.includes('annulée')) return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800'; // "Oui" simple
  }
  
  if (value === 'Non') return 'bg-gray-200 text-gray-700';
  
  return 'bg-gray-100 text-gray-600'; // Valeur inconnue
}

export function getConvocationLabel(value: string): string {
  if (!value) return 'Non défini';
  
  if (value.startsWith('Oui')) {
    if (value.includes('mais')) return 'Oui, mais annulée après';
    if (value.includes('n\'a pas communiqué')) return 'Oui, pas communiqué';
    if (value.includes('annulée')) return 'Oui, annulée';
    return 'Oui';
  }
  
  if (value === 'Non') return 'Non';
  if (value === 'false') return 'Non'; // Pour rétrocompatibilité
  
  return value; // Retourne la valeur telle quelle
}

export const getPresenceStyles = (value: boolean | null) => {
  switch (value) {
    case null:
      return {
        bgColor: 'bg-gray-100',
        hoverColor: 'hover:bg-gray-200',
        textColor: 'text-gray-400',
        icon: '?',
        title: 'Non défini'
      };
    case true:
      return {
        bgColor: 'bg-green-100',
        hoverColor: 'hover:bg-green-200',
        textColor: 'text-green-600',
        icon: '✓',
        title: 'Présent'
      };
    case false:
      return {
        bgColor: 'bg-red-100',
        hoverColor: 'hover:bg-red-200',
        textColor: 'text-red-600',
        icon: '✗',
        title: 'Absent'
      };
    default:
      return {
        bgColor: 'bg-gray-100',
        hoverColor: 'hover:bg-gray-200',
        textColor: 'text-gray-400',
        icon: '?',
        title: 'Non défini'
      };
  }
};

export const cyclePresenceState = (current: boolean | null): boolean | null => {
  if (current === null) return true;
  if (current === true) return false;
  return null;
};
