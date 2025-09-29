import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TopBar } from '../components/TopBar';

export const ScanScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <TopBar title="Scan" />
      <View style={styles.content}>
        <Text style={styles.text}>Scan Screen</Text>
        <Text style={styles.subtext}>Scan barcodes to find products</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  text: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
