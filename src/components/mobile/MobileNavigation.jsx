import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import {
  HomeIcon,
  ShoppingBagIcon,
  ChatBubbleLeftIcon,
  UserIcon,
  BellIcon
} from '@heroicons/react/24/outline';

// Import your screen components
import MobileHome from './screens/MobileHome';
import MobileShop from './screens/MobileShop';
import MobileChat from './screens/MobileChat';
import MobileProfile from './screens/MobileProfile';
import MobileNotifications from './screens/MobileNotifications';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  const { isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderTopColor: isDark ? '#374151' : '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#6B7280',
        headerStyle: {
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderBottomColor: isDark ? '#374151' : '#E5E7EB',
          borderBottomWidth: 1,
        },
        headerTintColor: isDark ? '#F9FAFB' : '#111827',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={MobileHome}
        options={{
          tabBarIcon: ({ color, size }) => (
            <HomeIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Shop"
        component={MobileShop}
        options={{
          tabBarIcon: ({ color, size }) => (
            <ShoppingBagIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={MobileChat}
        options={{
          tabBarIcon: ({ color, size }) => (
            <ChatBubbleLeftIcon color={color} size={size} />
          ),
          tabBarBadge: 3, // Dynamic badge count
        }}
      />
      <Tab.Screen
        name="Profile"
        component={MobileProfile}
        options={{
          tabBarIcon: ({ color, size }) => (
            <UserIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={MobileNotifications}
        options={{
          tabBarIcon: ({ color, size }) => (
            <BellIcon color={color} size={size} />
          ),
          tabBarBadge: 5, // Dynamic badge count
        }}
      />
    </Tab.Navigator>
  );
};

const MobileNavigation = () => {
  const { isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        },
        headerTintColor: isDark ? '#F9FAFB' : '#111827',
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: isDark ? '#111827' : '#F3F4F6',
        },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      {/* Add additional stack screens here */}
      <Stack.Screen
        name="ProductDetails"
        component={ProductDetails}
        options={({ route }) => ({
          title: route.params?.title || 'Product Details',
        })}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoom}
        options={({ route }) => ({
          title: route.params?.title || 'Chat',
        })}
      />
      <Stack.Screen
        name="Settings"
        component={Settings}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="OrderHistory"
        component={OrderHistory}
        options={{ title: 'Order History' }}
      />
      <Stack.Screen
        name="SavedItems"
        component={SavedItems}
        options={{ title: 'Saved Items' }}
      />
      <Stack.Screen
        name="Address"
        component={Address}
        options={{ title: 'Addresses' }}
      />
      <Stack.Screen
        name="Payment"
        component={Payment}
        options={{ title: 'Payment Methods' }}
      />
      <Stack.Screen
        name="Support"
        component={Support}
        options={{ title: 'Support' }}
      />
    </Stack.Navigator>
  );
};

// Screen Components
const ProductDetails = ({ route }) => {
  // Implement product details screen
  return null;
};

const ChatRoom = ({ route }) => {
  // Implement chat room screen
  return null;
};

const Settings = () => {
  // Implement settings screen
  return null;
};

const OrderHistory = () => {
  // Implement order history screen
  return null;
};

const SavedItems = () => {
  // Implement saved items screen
  return null;
};

const Address = () => {
  // Implement address management screen
  return null;
};

const Payment = () => {
  // Implement payment methods screen
  return null;
};

const Support = () => {
  // Implement support screen
  return null;
};

export default MobileNavigation;
