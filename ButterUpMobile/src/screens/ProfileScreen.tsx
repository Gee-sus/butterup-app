import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import {tokens} from '../theme/tokens';

export default function ProfileScreen() {
  const navigation = useNavigation();

  const handleNavigateToSettings = () => {
    // @ts-ignore - navigation type issue
    navigation.navigate('Settings');
  };

  const handleNavigateToAlerts = () => {
    // @ts-ignore - navigation type issue
    navigation.navigate('Alerts');
  };

  const handleNavigateToStoreSelection = () => {
    // @ts-ignore - navigation type issue
    navigation.navigate('StoreSelection');
  };

  const handleNavigateToStoreDetection = () => {
    // @ts-ignore - navigation type issue
    navigation.navigate('StoreDetection');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Manage your account and preferences</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color={tokens.colors.pill} />
        </View>
        <Text style={styles.name}>Your Profile</Text>
        <Text style={styles.email}>user@example.com</Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleNavigateToSettings}>
          <Ionicons name="settings-outline" size={24} color={tokens.colors.pill} />
          <Text style={styles.actionText}>Settings</Text>
          <Ionicons name="chevron-forward" size={20} color={tokens.colors.ink2} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleNavigateToAlerts}>
          <Ionicons name="notifications-outline" size={24} color={tokens.colors.pill} />
          <Text style={styles.actionText}>Price Alerts</Text>
          <Ionicons name="chevron-forward" size={20} color={tokens.colors.ink2} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleNavigateToStoreSelection}>
          <Ionicons name="storefront-outline" size={24} color={tokens.colors.pill} />
          <Text style={styles.actionText}>Select Store</Text>
          <Ionicons name="chevron-forward" size={20} color={tokens.colors.ink2} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleNavigateToStoreDetection}>
          <Ionicons name="location-outline" size={24} color={tokens.colors.pill} />
          <Text style={styles.actionText}>Store Detection</Text>
          <Ionicons name="chevron-forward" size={20} color={tokens.colors.ink2} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ButterUp v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  header: {
    padding: tokens.spacing.pad,
    backgroundColor: tokens.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  title: {
    fontSize: tokens.text.title,
    fontWeight: 'bold',
    color: tokens.colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    textAlign: 'center',
    marginTop: 4,
  },
  profileCard: {
    backgroundColor: tokens.colors.card,
    margin: tokens.spacing.pad,
    padding: tokens.spacing.pad,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  avatarContainer: {
    marginBottom: tokens.spacing.lg,
  },
  name: {
    fontSize: tokens.text.h2,
    fontWeight: 'bold',
    color: tokens.colors.ink,
    marginBottom: 4,
  },
  email: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
  },
  actionsContainer: {
    margin: tokens.spacing.pad,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.card,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  actionText: {
    flex: 1,
    marginLeft: tokens.spacing.lg,
    fontSize: tokens.text.body,
    color: tokens.colors.ink,
    fontWeight: '500',
  },
  footer: {
    padding: tokens.spacing.pad,
    alignItems: 'center',
  },
  footerText: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
});
