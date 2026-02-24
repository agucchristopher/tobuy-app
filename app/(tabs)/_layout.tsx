import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useTheme } from '@/context/ThemeContext';

export default function TabLayout() {
  const T = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: T.accent,
        tabBarInactiveTintColor: T.textSub,
        tabBarStyle: {
          backgroundColor: T.bg,
          borderTopColor: T.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 62,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My List',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Summary',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
