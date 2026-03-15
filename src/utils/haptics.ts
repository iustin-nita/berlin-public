import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Light tap feedback — use for category select, favorite toggle, vote submit */
export function lightImpact() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Selection feedback — use for search result pick, list item select */
export function selectionFeedback() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}
