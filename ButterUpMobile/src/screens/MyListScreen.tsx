import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useApp} from '../contexts/AppContext';
import LocationIndicator from '../components/LocationIndicator';
import {tokens} from '../theme/tokens';

export default function MyListScreen() {
  const {list, removeFromList, total} = useApp();

  const handleRemoveItem = (id: string | number) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your list?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFromList(id),
        },
      ]
    );
  };

  const renderItem = ({item}: {item: {id: string|number; name: string; price?: number}}) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.price && (
          <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveItem(item.id)}>
        <Ionicons name="trash-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="list-outline" size={64} color={tokens.colors.ink2} />
      <Text style={styles.emptyTitle}>Your list is empty</Text>
      <Text style={styles.emptySubtitle}>
        Add items from the Home screen to get started
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LocationIndicator containerStyle={styles.locationIndicator} />
        <Text style={styles.title}>My List</Text>
        <Text style={styles.subtitle}>Your shopping list</Text>
      </View>

      {list.length > 0 ? (
        <>
          <FlatList
            data={list}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
          
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>${total().toFixed(2)}</Text>
            </View>
          </View>
        </>
      ) : (
        renderEmpty()
      )}
    </View>
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
  locationIndicator: {
    marginBottom: tokens.spacing.md,
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
  list: {
    flex: 1,
    padding: tokens.spacing.pad,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.card,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink,
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.success,
    marginTop: 2,
    fontWeight: '600',
  },
  removeButton: {
    padding: tokens.spacing.sm,
  },
  footer: {
    backgroundColor: tokens.colors.card,
    padding: tokens.spacing.pad,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.line,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: tokens.text.h2,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  totalAmount: {
    fontSize: tokens.text.title,
    fontWeight: 'bold',
    color: tokens.colors.success,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.pad,
  },
  emptyTitle: {
    fontSize: tokens.text.h2,
    fontWeight: '600',
    color: tokens.colors.ink,
    marginTop: tokens.spacing.lg,
    marginBottom: tokens.spacing.sm,
  },
  emptySubtitle: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    textAlign: 'center',
    lineHeight: 20,
  },
});






