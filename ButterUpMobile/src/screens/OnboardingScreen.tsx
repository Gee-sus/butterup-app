import React, {useEffect, useRef, useState} from 'react';
import {View, Text, ScrollView, Dimensions, TouchableOpacity, Animated, Easing} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {tokens} from '../theme/tokens';
import type {RootStackParamList} from '../types/navigation';
import Svg, {Rect, Circle, Path, Defs, LinearGradient, Stop, G} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const {width} = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList>;

const slides = [
  {
    key: 'welcome',
    tag: '',
    title: 'WELCOME!',
    subtitle: 'Compare NZ Butter Prices!',
    body: 'Find the best deals at your local supermarkets.',
    cta: 'NEXT',
  },
  {
    key: 'scan',
    tag: '',
    title: 'SCAN \n&\nCOMPARE',
    subtitle: "Snap a photo in-store and see who's cheapest.",
    body: '',
    cta: 'NEXT',
  },
  {
    key: 'save',
    tag: '',
    title: 'SAVE MONEY \n&\n TAKE CONTROL!',
    subtitle: 'Stop overpaying butter!\nEmpower your grocery choices.',
    body: '',
    cta: 'GET STARTED!',
  },
];

function Mascot({variant}: {variant: 'search' | 'scan' | 'flex'}) {
  const yellow = '#FFD54A';
  const yellowShadow = '#F7B500';
  const blue = '#2563eb';
  const sky = '#e5efff';
  return (
    <View style={{height: 220, justifyContent: 'center', alignItems: 'center', marginTop: 16}}>
      <Svg width={260} height={200} viewBox="0 0 260 200">
        <Defs>
          <LinearGradient id="butter" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={yellow} />
            <Stop offset="100%" stopColor={yellowShadow} />
          </LinearGradient>
        </Defs>
        {/* soft bubbles */}
        <Circle cx={40} cy={40} r={16} fill={sky} />
        <Circle cx={220} cy={30} r={10} fill={sky} />
        <Circle cx={210} cy={85} r={14} fill={sky} />
        <Circle cx={60} cy={120} r={10} fill={sky} />

        {/* ground */}
        <Rect x={20} y={160} width={220} height={8} rx={4} fill={sky} />

        {/* body */}
        <Rect x={70} y={60} width={120} height={80} rx={16} fill="url(#butter)" stroke="#f5c23a" />

        {/* face */}
        <Circle cx={110} cy={95} r={6} fill="#1f2937" />
        <Circle cx={150} cy={95} r={6} fill="#1f2937" />
        <Path d="M120 115 Q130 125 140 115" stroke="#1f2937" strokeWidth={4} fill="none" strokeLinecap="round" />

        {/* legs */}
        <Path d="M95 140 l0 12" stroke={yellowShadow} strokeWidth={6} strokeLinecap="round" />
        <Path d="M165 140 l0 12" stroke={yellowShadow} strokeWidth={6} strokeLinecap="round" />

        {/* arms (vary by variant) */}
        {variant === 'search' && (
          <G>
            <Path d="M72 95 C60 95, 55 105, 60 115" stroke={yellowShadow} strokeWidth={6} fill="none" strokeLinecap="round" />
            {/* magnifying glass */}
            <Circle cx={48} cy={122} r={16} stroke={blue} strokeWidth={4} fill="#ffffff" />
            <Path d="M58 132 l12 12" stroke={blue} strokeWidth={4} strokeLinecap="round" />
            <Path d="M190 100 C198 105, 205 105, 208 98" stroke={yellowShadow} strokeWidth={6} fill="none" strokeLinecap="round" />
          </G>
        )}
        {variant === 'scan' && (
          <G>
            <Path d="M72 100 C60 100, 55 110, 62 118" stroke={yellowShadow} strokeWidth={6} fill="none" strokeLinecap="round" />
            {/* barcode */}
            <Rect x={100} y={132} width={60} height={24} rx={4} fill="#ffffff" stroke={blue} />
            <Path d="M106 134 v20 M112 134 v20 M118 134 v20 M124 134 v20 M130 134 v20 M136 134 v20 M142 134 v20 M148 134 v20" stroke={blue} strokeWidth={2} />
            <Path d="M180 100 C190 95, 200 95, 206 104" stroke={yellowShadow} strokeWidth={6} fill="none" strokeLinecap="round" />
          </G>
        )}
        {variant === 'flex' && (
          <G>
            {/* strong arms */}
            <Path d="M70 105 C50 95, 50 120, 66 124" stroke={yellowShadow} strokeWidth={8} fill="none" strokeLinecap="round" />
            <Path d="M190 105 C210 95, 210 120, 194 124" stroke={yellowShadow} strokeWidth={8} fill="none" strokeLinecap="round" />
            {/* cart icon bubble */}
            <Circle cx={208} cy={62} r={18} fill="#ffffff" stroke={blue} />
            <Path d="M201 60 h12 l-2 10 h-10" stroke={blue} strokeWidth={2} fill="none" />
            <Circle cx={203} cy={74} r={2} fill={blue} />
            <Circle cx={211} cy={74} r={2} fill={blue} />
          </G>
        )}
      </Svg>
    </View>
  );
}

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // CTA pulse animation
  const ctaPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, {toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
        Animated.timing(ctaPulse, {toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
      ]),
    ).start();
  }, [ctaPulse]);

  // Floating bubbles animation
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
        Animated.timing(float, {toValue: 0, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
      ]),
    ).start();
  }, [float]);

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
      {/* Brand header */}
      <View style={{paddingTop: insets.top + 26, alignItems: 'center'}}>
        <Text style={{fontSize: 32, fontWeight: '900', color: tokens.colors.pill}}>Butter<Text style={{color: tokens.colors.ink}}>Up</Text></Text>
      </View>

      {/* Decorative animated background bubbles */}
      <Animated.View style={{position: 'absolute', top: 0, left: 0, right: 0, height: 220, opacity: 0.7, transform: [{translateY: float.interpolate({inputRange: [0, 1], outputRange: [0, -6]})}]}} pointerEvents="none">
        <Svg width="100%" height="220" viewBox="0 0 360 220">
          <Circle cx="40" cy="70" r="36" fill="#EAF1FF" />
          <Circle cx="310" cy="90" r="28" fill="#E1ECFF" />
          <Circle cx="200" cy="40" r="22" fill="#DDE8FF" />
        </Svg>
      </Animated.View>

      <Animated.ScrollView
        horizontal
        pagingEnabled
        ref={scroller}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(newIndex);
        }}
        onScroll={Animated.event([{nativeEvent: {contentOffset: {x: scrollX}}}], {useNativeDriver: true})}
        scrollEventThrottle={16}
        style={{flex: 1, marginTop: 16}}>
        {slides.map((s, i) => {
          const cardRange = [(i - 1) * width, i * width, (i + 1) * width];
          const cardTranslateY = scrollX.interpolate({inputRange: cardRange, outputRange: [14, 0, -14], extrapolate: 'clamp'});
          const cardScale = scrollX.interpolate({inputRange: cardRange, outputRange: [0.96, 1, 0.96], extrapolate: 'clamp'});
          const shadowOpacity = scrollX.interpolate({inputRange: cardRange, outputRange: [0.03, 0.09, 0.03], extrapolate: 'clamp'});

          const titleTranslateY = scrollX.interpolate({inputRange: cardRange, outputRange: [16, 0, -16], extrapolate: 'clamp'});
          const titleOpacity = scrollX.interpolate({inputRange: cardRange, outputRange: [0.2, 1, 0.2], extrapolate: 'clamp'});
          const subOpacity = scrollX.interpolate({inputRange: cardRange, outputRange: [0.1, 1, 0.1], extrapolate: 'clamp'});

          const illuScale = scrollX.interpolate({inputRange: cardRange, outputRange: [0.9, 1, 0.9], extrapolate: 'clamp'});
          const illuTranslateY = scrollX.interpolate({inputRange: cardRange, outputRange: [8, 0, -8], extrapolate: 'clamp'});
          const floatY = float.interpolate({inputRange: [0, 1], outputRange: [0, -6]});
          const rotate = float.interpolate({inputRange: [0, 1], outputRange: ['-2deg', '2deg']});
          const bob = Animated.add(illuTranslateY, floatY);

          return (
            <View key={s.key} style={{width, paddingHorizontal: 16}}>
              <Animated.View style={{backgroundColor: tokens.colors.card, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity, shadowRadius: 16, transform: [{translateY: cardTranslateY}, {scale: cardScale}]}}>
                {/* tag */}
                {!!s.tag && (
                  <View style={{alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E7F0FF', borderRadius: 999}}>
                    <Text style={{color: tokens.colors.accent, fontWeight: '800'}}>{s.tag}</Text>
                  </View>
                )}
                <Animated.Text style={{marginTop: 12, fontSize: tokens.text.title + 10, fontWeight: '800', color: tokens.colors.ink, textAlign: 'center', transform: [{translateY: titleTranslateY}], opacity: titleOpacity}}>{s.title}</Animated.Text>
                {!!s.subtitle && (
                  <Animated.Text
                    style={{
                      marginTop: 8,
                      fontSize: i === 0 ? tokens.text.h2 + 1 : tokens.text.body,
                      fontWeight: i === 0 ? '700' : '400',
                      color: i === 0 ? tokens.colors.ink : tokens.colors.ink2,
                      textAlign: 'center',
                      opacity: subOpacity,
                    }}
                  >
                    {s.subtitle}
                  </Animated.Text>
                )}
                {!!s.body && (
                  <Animated.Text style={{marginTop: 12, fontSize: tokens.text.body, color: tokens.colors.ink2, lineHeight: 20, textAlign: 'center', opacity: subOpacity}}>{s.body}</Animated.Text>
                )}

                {/* illustration */}
                <Animated.View style={{transform: [{scale: illuScale}, {translateY: bob}, {rotate}]}}>
                  {i === 0 && <Mascot variant="search" />}
                  {i === 1 && <Mascot variant="scan" />}
                  {i === 2 && <Mascot variant="flex" />}
                </Animated.View>

                {/* floating bubbles */}
                <Animated.View style={{position: 'absolute', top: 22, left: 22, width: 12, height: 12, borderRadius: 6, backgroundColor: '#DDE8FF', transform: [{translateY: float.interpolate({inputRange: [0, 1], outputRange: [0, -8]})}]}} />
                <Animated.View style={{position: 'absolute', top: 38, right: 28, width: 16, height: 16, borderRadius: 8, backgroundColor: '#EAF1FF', transform: [{translateY: float.interpolate({inputRange: [0, 1], outputRange: [0, -6]})}]}} />
                <Animated.View style={{position: 'absolute', top: 90, right: 18, width: 10, height: 10, borderRadius: 5, backgroundColor: '#E0ECFF', transform: [{translateY: float.interpolate({inputRange: [0, 1], outputRange: [0, -10]})}]}} />

                {/* CTA moved to footer */}
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>

      {/* Dots removed as requested */}

      {/* Footer with consistent CTA and Sign-in */}
      <View style={{paddingHorizontal: 30, paddingTop: 0, paddingBottom: insets.bottom + 50}}>
        <TouchableOpacity
          onPress={index === slides.length - 1 ? goAuth : next}
          style={{
            backgroundColor: tokens.colors.pill,
            borderRadius: 999,
            paddingVertical: 20,
            alignItems: 'center',
            paddingHorizontal: 16,
          }}
        >
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Text style={{color: '#ffffff', fontWeight: '800', fontSize: 16}}>{index === slides.length - 1 ? 'GET STARTED!' : 'NEXT'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={goAuth} style={{marginTop: 12, alignItems: 'center'}}>
          <Text style={{fontSize: tokens.text.body, color: tokens.colors.ink2}}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


