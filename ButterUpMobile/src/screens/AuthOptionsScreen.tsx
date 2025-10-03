import React from 'react';
import {View, Text, TouchableOpacity, Platform} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {tokens} from '../theme/tokens';
import type {RootStackParamList} from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AuthOptionsScreen() {
  const navigation = useNavigation<Nav>();

  const goToApp = () => {
    // For now, mock success and go to main app
    navigation.reset({index: 0, routes: [{name: 'Tabs'}]});
  };

  return (
    <View style={{flex: 1, backgroundColor: tokens.colors.bg, padding: tokens.spacing.pad, justifyContent: 'center'}}>
      <View style={{backgroundColor: tokens.colors.card, borderRadius: tokens.radius.xl, padding: tokens.spacing.xl}}>
        <Text style={{fontSize: 24, fontWeight: '800', color: tokens.colors.ink}}>Sign in</Text>
        <Text style={{marginTop: tokens.spacing.sm, color: tokens.colors.ink2}}>Choose a sign-in method to continue.</Text>

        <TouchableOpacity onPress={goToApp} style={{marginTop: tokens.spacing.xl, backgroundColor: '#DB4437', borderRadius: tokens.radius.xl, paddingVertical: 14, alignItems: 'center'}}>
          <Text style={{color: '#fff', fontWeight: '700'}}>Continue with Google</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity onPress={goToApp} style={{marginTop: tokens.spacing.md, backgroundColor: '#000', borderRadius: tokens.radius.xl, paddingVertical: 14, alignItems: 'center'}}>
            <Text style={{color: '#fff', fontWeight: '700'}}>Continue with Apple</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={goToApp} style={{marginTop: tokens.spacing.md, backgroundColor: tokens.colors.accent, borderRadius: tokens.radius.xl, paddingVertical: 14, alignItems: 'center'}}>
          <Text style={{color: '#fff', fontWeight: '700'}}>Continue with Email</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={{marginTop: tokens.spacing.lg, alignItems: 'center'}}>
          <Text style={{color: tokens.colors.ink2}}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


