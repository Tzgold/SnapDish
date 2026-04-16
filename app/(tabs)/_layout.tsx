import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';

import { colors, shadow } from '@/src/theme/snapdish';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.tabInactive,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<Ionicons name="home" size={22} color={color} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<Ionicons name="heart-outline" size={22} color={color} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<Ionicons name="add" size={24} color={color} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<Ionicons name="grid-outline" size={22} color={color} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<Ionicons name="person-outline" size={22} color={color} />} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ focused, icon }: { focused: boolean; icon: React.ReactNode }) {
  return <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>{icon}</View>;
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.tabBar,
    borderRadius: 32,
    borderTopWidth: 0,
    bottom: Platform.OS === 'ios' ? 20 : 16,
    height: 72,
    left: 16,
    position: 'absolute',
    right: 16,
    ...shadow.tabBar,
  },
  tabItem: {
    paddingVertical: 12,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconWrapActive: {
    backgroundColor: colors.accentLime,
  },
});
