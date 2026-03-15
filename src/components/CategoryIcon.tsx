import React from 'react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoryByKey } from '../constants/categories';

type CategoryIconProps = {
  categoryKey: string;
  size: number;
  color?: string;
};

export function CategoryIcon({ categoryKey, size, color }: CategoryIconProps) {
  const cat = getCategoryByKey(categoryKey);
  if (!cat) return null;
  const iconColor = color ?? cat.color;
  if (cat.iconLib === 'MCI') {
    return <MaterialCommunityIcons name={cat.icon as any} size={size} color={iconColor} />;
  }
  return <Feather name={cat.icon as any} size={size} color={iconColor} />;
}
