import { CONVOCATION_OPTIONS } from '../constants';

export const getConvocationColor = (value: string) => {
  const option = CONVOCATION_OPTIONS.find(opt => opt.value === value);
  return option ? option.color : 'bg-gray-100';
};

export const getConvocationLabel = (value: string) => {
  const option = CONVOCATION_OPTIONS.find(opt => opt.value === value);
  return option ? option.label : '-';
};

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
