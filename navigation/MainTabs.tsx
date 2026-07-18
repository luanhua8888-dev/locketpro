import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Camera, Image as ImageIcon, User } from 'lucide-react-native';
import { Session } from '@supabase/supabase-js';

import CameraScreen from '../screens/CameraScreen';
import FeedScreen from '../screens/FeedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FriendsScreen from '../screens/FriendsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import HelpScreen from '../screens/HelpScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';
import AdminTemporaryAccessScreen from '../screens/AdminTemporaryAccessScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs({ session }: { session: Session | null }) {
  return (
    <Tab.Navigator
      initialRouteName="Camera"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: 'none',
        },
      }}
    >
      <Tab.Screen 
        name="Feed" 
        component={FeedScreen}
        options={{
          tabBarIcon: ({ color, size }) => <ImageIcon color={color} size={30} />
        }}
      />
      <Tab.Screen 
        name="Camera" 
        options={{
          tabBarIcon: ({ color, size }) => <Camera color={color} size={32} />
        }}
      >
        {() => <CameraScreen session={session} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <User color={color} size={30} />
        }}
      />
      <Tab.Screen 
        name="Friends" 
        component={FriendsScreen}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
      />
      <Tab.Screen 
        name="Privacy" 
        component={PrivacyScreen}
      />
      <Tab.Screen 
        name="Help" 
        component={HelpScreen}
      />
      <Tab.Screen 
        name="BlockedUsers" 
        component={BlockedUsersScreen}
      />
      <Tab.Screen
        name="AdminTemporaryAccess"
        component={AdminTemporaryAccessScreen}
      />
    </Tab.Navigator>
  );
}
