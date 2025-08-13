import { Platform, Linking } from 'react-native';

export type NavigateTarget = {
  latitude: number;
  longitude: number;
  name?: string;
};

// Try Citymapper → Google Maps (URL scheme) → Apple Maps (iOS) → universal Google Maps web
export async function openDirections(target: NavigateTarget): Promise<void> {
  const { latitude, longitude, name } = target;
  const label = name ? encodeURIComponent(name) : 'Destination';

  const citymapper = `citymapper://directions?endcoord=${latitude},${longitude}&endname=${label}`;
  const googleScheme = `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=walking`;
  const apple = `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=w&q=${label}`;
  const googleWeb = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;

  try {
    if (await Linking.canOpenURL(citymapper)) {
      await Linking.openURL(citymapper);
      return;
    }
  } catch {}

  try {
    if (await Linking.canOpenURL(googleScheme)) {
      await Linking.openURL(googleScheme);
      return;
    }
  } catch {}

  if (Platform.OS === 'ios') {
    try {
      await Linking.openURL(apple);
      return;
    } catch {}
  }

  // Final fallback works cross‑platform and should handoff to Google Maps if installed
  await Linking.openURL(googleWeb);
}


