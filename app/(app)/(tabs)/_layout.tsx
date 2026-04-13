import { Tabs } from 'expo-router';
import { Colors } from '../../../constants/Colors';
import { Home, Users, ClipboardCheck, CreditCard, Settings } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary.navy,
        tabBarInactiveTintColor: Colors.grayscale.darkGray,
        tabBarLabelStyle: {
          fontFamily: 'Onest-Medium',
          fontSize: 12,
          marginBottom: 8,
        },
        tabBarStyle: {
          height: 70,
          backgroundColor: Colors.grayscale.white,
          borderTopWidth: 1,
          borderTopColor: Colors.grayscale.lightGray,
          paddingTop: 12,
          paddingBottom: 0,
          borderRadius: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: 'Results',
          tabBarIcon: ({ color }) => <ClipboardCheck size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Billing',
          tabBarIcon: ({ color }) => <CreditCard size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
