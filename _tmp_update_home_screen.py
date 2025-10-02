from pathlib import Path

path = Path("ButterUpMobile/src/screens/HomeScreen.tsx")
text = path.read_text()
text = text.replace("\r\n", "\n")

def replace_once(src: str, target: str, replacement: str) -> str:
    if target not in src:
        raise SystemExit(f"Marker not found: {target[:60]!r}")
    return src.replace(target, replacement, 1)

text = replace_once(
    text,
    'import { useApp } from "../contexts/AppContext";\n\nimport { productApi }',
    'import { useApp } from "../contexts/AppContext";\nimport { useLocation } from "../contexts/LocationContext";\n\nimport { productApi }',
)

text = replace_once(
    text,
    'return STORE_NAME_ALIASES[key] || trimmed;\n};\n\n\nconst extractPrice',
    'return STORE_NAME_ALIASES[key] || trimmed;\n};\n\nconst normalizeChainKey = (value?: string | null) => {\n  if (!value) {\n    return null;\n  }\n\n  return value.toLowerCase().replace(/[^a-z]/g, "");\n};\n\nconst extractPrice',
)

text = replace_once(
    text,
    '  const { addToList, list, userProfile, loadUserProfile } = useApp();\n\n  const insets = useSafeAreaInsets();',
    '  const { addToList, list, userProfile, loadUserProfile } = useApp();\n  const { locationLabel, nearbyStores, nearbyStoreChains } = useLocation();\n\n  const insets = useSafeAreaInsets();',
)

text = replace_once(
    text,
    '  const handleProductPress = (product: any) => {\n    safeNavigate(navigation, "ProductDetail", { product });\n  };',
    '  const handleProductPress = (product: any) => {\n    const preferredChains = nearbyStoreChains\n      .map((label) => normalizeChainKey(label))\n      .filter((chain): chain is string => Boolean(chain));\n\n    const storeIds = nearbyStores\n      .map((store) => store?.id)\n      .filter((id): id is string | number => id is not None);\n\n    safeNavigate(navigation, "ProductDetail", {\n      product,\n      locationName: locationLabel,\n      preferredChains,\n      storeIds,\n    });\n  };',
)

text = replace_once(
    text,
    '  const renderHorizontalProductItem = (item: any) => (\n    <TouchableOpacity\n      style={styles.horizontalProductCard}\n      onPress={() => handleProductPress(item)}\n    >\n      {item.image_url && (\n        <Image\n          source={{ uri: item.image_url }}\n          style={styles.horizontalProductImage}\n          resizeMode="cover"\n        />\n      )}\n\n      <View style={styles.horizontalProductInfo}>\n        <Text style={styles.horizontalProductName} numberOfLines={2}>\n          {item.name_with_brand}\n        </Text>\n\n        <Text style={styles.horizontalProductPrice}>\n          ${item.price.toFixed(2)}\n        </Text>\n\n        <Text style={styles.horizontalProductStore}>\n          {item.brand || item.store}\n        </Text>\n      </View>\n\n      <TouchableOpacity\n        style={styles.horizontalAddToCartButton}\n        onPress={() => handleAddToList(item)}\n      >\n        <Text style={styles.horizontalAddToCartText}>+</Text>\n      </TouchableOpacity>\n    </TouchableOpacity>\n  );',
    '  const renderHorizontalProductItem = (item: any) => {\n    const productName = getBrandDisplayName(item);\n    const priceValue = extractPrice(item?.price);\n    const priceLabel =\n      priceValue is not None or priceValue is not ...',
)
