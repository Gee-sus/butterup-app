import React from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {Ionicons} from '@expo/vector-icons';
import {ProfileDrawerParamList} from '../src/types/navigation';

// Import screens
import ProfileMainScreen from '../src/screens/ProfileMainScreen';
import SettingsScreen from '../src/screens/SettingsScreen';

const Drawer = createDrawerNavigator<ProfileDrawerParamList>();

export default function ProfileDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={({route}) => ({
        drawerIcon: ({focused, color, size}) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'ProfileMain') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        drawerActiveTintColor: '#f59e0b',
        drawerInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#f59e0b',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerPosition: 'right',
        drawerType: 'slide',
      })}>
      <Drawer.Screen 
        name="ProfileMain" 
        component={ProfileMainScreen}
        options={{
          title: 'Profile',
          drawerLabel: 'Profile',
        }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
          drawerLabel: 'Settings',
        }}
      />
    </Drawer.Navigator>
  );
}
