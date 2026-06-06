import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#818CF8', // Bright Indigo
        tabBarInactiveTintColor: '#64748B', // Slate gray
        tabBarStyle: {
          backgroundColor: '#0B0F19', // Deep dark slate
          borderTopColor: '#1E293B', // Subtle slate border
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#0B0F19',
          borderBottomColor: '#1E293B',
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          color: '#FFF',
          fontWeight: 'bold',
        },
        headerShown: false, // Custom headers in index and dashboard
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Transações',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

