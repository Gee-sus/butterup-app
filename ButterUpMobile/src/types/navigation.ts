import {Product} from './index';
import type {NavigatorScreenParams} from '@react-navigation/native';

export type RootStackParamList = {
  Onboarding: undefined;
  AuthOptions: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  StoreDetection: undefined;
  StoreSelection: undefined;
  ProductDetail: {product?: Product} | undefined;
  History: undefined;
  Alerts: undefined;
  Category: {category: string};
};

export type TabParamList = {
  Home: undefined;
  Explore: undefined;
  MyList: undefined;
  ScanSubmit: undefined;
  Profile: undefined;
};

export type ProfileDrawerParamList = {
  ProfileHome: undefined;
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

