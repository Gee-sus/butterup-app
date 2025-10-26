export const BRAND_COLUMN_WIDTH = 120;
export const STORE_COLUMN_WIDTH = 110;

export const MAIN_STORES = ["Pak'nSave", "Woolworths", "New World"];

export const STORE_NAME_ALIASES: { [key: string]: string } = {
  paknsave: "Pak'nSave",
  "pak'n save": "Pak'nSave",
  "pak n save": "Pak'nSave",
  "pak'nsave": "Pak'nSave",
  "pak n'save": "Pak'nSave",
  countdown: "Woolworths",
  woolworths: "Woolworths",
  "new world": "New World",
  nw: "New World",
};

export const safeNavigate = (navigation: any, route: string, params?: any) => {
  if (navigation && navigation.navigate) {
    navigation.navigate(route, params);
  }
};
