import {Product} from './index';
import type {NavigatorScreenParams} from '@react-navigation/native';

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  StoreDetection: undefined;
  StoreSelection: undefined;
  ProductDetail: {product?: Product} | undefined;
  History: undefined;
  Alerts: undefined;
};

export type TabParamList = {
  Home: undefined;
  Explore: undefined;
  MyList: undefined;
  ScanSubmit: undefined;
  Profile: undefined;
};

export type ProfileDrawerParamList = {
  ProfileMain: undefined;
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

