import { Ionicons } from '@expo/vector-icons';
import { Tabs as ExpoTabs } from 'expo-router';

export default function TabLayout() {
  return (
    <ExpoTabs screenOptions={{ tabBarActiveTintColor: '#2196F3' }}>
      <ExpoTabs.Screen
        name="index"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
        }}
      />
      <ExpoTabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="pie-chart" size={24} color={color} />,
        }}
      />
    </ExpoTabs>
  );
}
