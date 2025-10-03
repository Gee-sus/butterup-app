import React, {useRef, useState} from 'react';
import {View, Text, ScrollView, Dimensions, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {tokens} from '../theme/tokens';
import type {RootStackParamList} from '../types/navigation';

const {width} = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList>;

const slides = [
  {
    title: 'Welcome to ButterUp',
    subtitle: 'Your smarter way to buy butter',
    body: 'Track prices, compare stores, and save on your butter runs.',
    cta: 'Get started',
  },
  {
    title: 'Check butter prices near you',
    subtitle: 'Find the best deal fast',
    body: "See prices in nearby supermarkets like Pak'nSave, Woolworths, and New World.",
    cta: 'Continue',
  },
  {
    title: 'Take control of your butter spend',
    subtitle: 'Compare and save',
    body: 'Compare prices across stores and never overpay again.',
    cta: 'Continue',
  },
  {
    title: 'Healthy picks & alerts',
    subtitle: 'Community ratings and notifications',
    body: 'See what others prefer and get alerts for the cheapest options near you.',
    cta: 'Continue',
  },
  {
    title: 'Create an account to save progress',
    subtitle: 'Sign in to sync across devices',
    body: 'Use Google/Apple or continue with your email to get started.',
    cta: 'Sign in',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);

  const next = () => {
    if (index < slides.length - 1) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      scroller.current?.scrollTo({x: nextIndex * width, animated: true});
    } else {
      navigation.replace('AuthOptions');
    }
  };

  const goAuth = () => navigation.replace('AuthOptions');

  return (
    <View style={{flex: 1, backgroundColor: tokens.colors.bg}}>
      <View style={{paddingHorizontal: tokens.spacing.pad, paddingTop: tokens.spacing.xl}}>
        <Text style={{fontSize: 28, fontWeight: '800', color: tokens.colors.ink}}>Welcome to ButterUp</Text>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        ref={scroller}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(newIndex);
        }}
        style={{flex: 1, marginTop: tokens.spacing.lg}}>
        {slides.map((s, i) => (
          <View key={i} style={{width, paddingHorizontal: tokens.spacing.pad}}>
            <View style={{backgroundColor: tokens.colors.card, borderRadius: tokens.radius.xl, padding: tokens.spacing.xl}}>
              <Text style={{fontSize: tokens.text.title + 6, fontWeight: '700', color: tokens.colors.ink}}>{s.title}</Text>
              <Text style={{marginTop: tokens.spacing.sm, fontSize: tokens.text.h2, fontWeight: '600', color: tokens.colors.ink}}>{s.subtitle}</Text>
              <Text style={{marginTop: tokens.spacing.md, fontSize: tokens.text.body, color: tokens.colors.ink2, lineHeight: 20}}>{s.body}</Text>
              {/* Placeholder for future images */}
              <View style={{height: 160, marginTop: tokens.spacing.lg, borderRadius: tokens.radius.lg, backgroundColor: tokens.colors.line}} />
              <TouchableOpacity onPress={i === slides.length - 1 ? goAuth : next} style={{marginTop: tokens.spacing.xl, backgroundColor: tokens.colors.accent, borderRadius: tokens.radius.xl, paddingVertical: 14, alignItems: 'center'}}>
                <Text style={{color: '#fff', fontWeight: '700', fontSize: 16}}>{s.cta}</Text>
              </TouchableOpacity>
              {i === 0 && (
                <TouchableOpacity onPress={goAuth} style={{marginTop: tokens.spacing.md, alignItems: 'center'}}>
                  <Text style={{fontSize: tokens.text.body, color: tokens.colors.ink2}}>Already have an account? Sign in</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: tokens.spacing.xl}}>
        {slides.map((_, i) => (
          <View key={i} style={{width: 8, height: 8, marginHorizontal: 4, borderRadius: 4, backgroundColor: i === index ? tokens.colors.pill : tokens.colors.line}} />
        ))}
      </View>
    </View>
  );
}


