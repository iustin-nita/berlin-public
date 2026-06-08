import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HeaderButton, Text } from '@react-navigation/elements';
import {
  createStaticNavigation,
  StaticParamList,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MapScreenWithBoundary as MapScreen } from './screens/Map';
import { Profile } from './screens/Profile';
import { Settings } from './screens/Settings';
import { Favorites } from './screens/Favorites';
import { NotFound } from './screens/NotFound';
import { Onboarding } from './screens/Onboarding';

const HomeTabs = createBottomTabNavigator({
  screenOptions: ({ theme }) => ({
    tabBarActiveTintColor: '#1a56db',
    tabBarInactiveTintColor: theme.dark ? '#64748b' : '#94a3b8',
    tabBarStyle: {
      paddingTop: 12,
      paddingBottom: 22,
      height: 84,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.dark ? '#334155' : '#E7EBF0',
      backgroundColor: theme.dark ? '#0f172a' : '#ffffff',
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4,
    },
  }),
  screens: {
    Map: {
      screen: MapScreen,
      options: {
        title: 'Map',
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <Feather name="map-pin" color={color} size={size} />
        ),
      },
    },
    Favorites: {
      screen: Favorites,
      options: {
        title: 'Favorites',
        tabBarIcon: ({ color, size }) => (
          <Feather name="heart" color={color} size={size} />
        ),
      },
    },
  },
});

const RootStack = createNativeStackNavigator({
  screens: {
    HomeTabs: {
      screen: HomeTabs,
      options: {
        title: 'Home',
        headerShown: false,
      },
    },
    Onboarding: {
      screen: Onboarding,
      options: {
        headerShown: false,
      },
    },
    Profile: {
      screen: Profile,
      linking: {
        path: ':user(@[a-zA-Z0-9-_]+)',
        parse: {
          user: (value) => value.replace(/^@/, ''),
        },
        stringify: {
          user: (value) => `@${value}`,
        },
      },
    },
    Settings: {
      screen: Settings,
      options: ({ navigation }) => ({
        presentation: 'modal',
        headerRight: () => (
          <HeaderButton onPress={navigation.goBack}>
            <Text>Close</Text>
          </HeaderButton>
        ),
      }),
    },
    NotFound: {
      screen: NotFound,
      options: {
        title: '404',
      },
      linking: {
        path: '*',
      },
    },
  },
});

export const Navigation = createStaticNavigation(RootStack);

type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
