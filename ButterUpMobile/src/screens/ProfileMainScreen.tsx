import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {DrawerNavigationProp} from '@react-navigation/drawer';
import {ProfileDrawerParamList} from '../types/navigation';
import {Ionicons} from '@expo/vector-icons';

type ProfileMainNavigationProp = DrawerNavigationProp<ProfileDrawerParamList>;

export default function ProfileMainScreen() {
  const navigation = useNavigation<ProfileMainNavigationProp>();

  const handleOpenSettings = () => {
    navigation.navigate('Settings');
  };

  const handleSavedLists = () => {
    Alert.alert('Saved Lists', 'View and manage your saved shopping lists');
  };

  const handleContributions = () => {
    Alert.alert('Contributions', 'View your barcode scans and photo submissions');
  };

  const handlePriceAlerts = () => {
    Alert.alert('Price Alerts', 'Manage your price drop notifications');
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#f59e0b" />
        </View>
        <Text style={styles.name}>Your Profile</Text>
        <Text style={styles.email}>user@example.com</Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSavedLists}>
          <Ionicons name="list-outline" size={24} color="#f59e0b" />
          <Text style={styles.actionText}>Saved Lists</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleContributions}>
          <Ionicons name="people-outline" size={24} color="#f59e0b" />
          <Text style={styles.actionText}>Contributions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handlePriceAlerts}>
          <Ionicons name="notifications-outline" size={24} color="#f59e0b" />
          <Text style={styles.actionText}>Price Alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsButton} onPress={handleOpenSettings}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#6b7280',
  },
  actionsContainer: {
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  settingsButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
