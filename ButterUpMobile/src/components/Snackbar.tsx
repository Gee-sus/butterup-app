import React, {useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { tokens } from '../theme/tokens';

interface SnackbarProps {
  visible: boolean;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  onDismiss: () => void;
  duration?: number;
}

const {width} = Dimensions.get('window');

export const Snackbar: React.FC<SnackbarProps> = ({
  visible,
  message,
  action,
  onDismiss,
  duration = 4000,
}) => {
  const scale = new Animated.Value(0);
  const opacity = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      // Show snackbar with scale and fade animation
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideSnackbar();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideSnackbar();
    }
  }, [visible]);

  const hideSnackbar = () => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handleActionPress = () => {
    if (action) {
      action.onPress();
      hideSnackbar();
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{scale}],
          opacity,
        },
      ]}>
      <View style={styles.content}>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        {action && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleActionPress}
            activeOpacity={0.7}>
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: tokens.spacing.pad,
    right: tokens.spacing.pad,
    backgroundColor: tokens.colors.pill, // filled pill style
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    shadowColor: tokens.colors.ink,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8, // Android shadow
    zIndex: 1000,
    maxWidth: width - (tokens.spacing.pad * 2),
    alignSelf: 'center',
    marginTop: -30, // Adjust to center vertically
    borderWidth: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: tokens.text.body,
    fontWeight: '600',
    marginRight: tokens.spacing.md,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  actionText: {
    color: tokens.colors.ink,
    fontSize: tokens.text.tiny,
    fontWeight: '700',
  },
});



