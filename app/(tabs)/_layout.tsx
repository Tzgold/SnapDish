import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarActiveTintColor: '#111827',
        tabBarInactiveTintColor: '#E5E7EB',
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
    backgroundColor: '#0F172A',
    borderRadius: 32,
    borderTopWidth: 0,
    bottom: 16,
    elevation: 0,
    height: 72,
    left: 16,
    position: 'absolute',
    right: 16,
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
    backgroundColor: '#D9F27B',
  },
});
