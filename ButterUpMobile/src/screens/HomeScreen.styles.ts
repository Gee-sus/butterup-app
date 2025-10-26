import { StyleSheet } from "react-native";
import { tokens } from "../theme/tokens";

const BRAND_COLUMN_WIDTH = 120;
const STORE_COLUMN_WIDTH = 110;

// Base styles for reusability
const base = {
  card: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  shadowSm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  shadowMd: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  shadowLg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
};

// Layout styles
export const layout = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  scrollContent: {
    paddingBottom: tokens.spacing.xl,
  },
});

// Header styles
export const header = StyleSheet.create({
  stickyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.pad,
    paddingVertical: tokens.spacing.md,
    backgroundColor: tokens.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
    marginHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    zIndex: 1000,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  greeting: {
    fontSize: tokens.text.title,
    fontWeight: "bold",
    color: tokens.colors.ink,
  },
});

// Search styles
export const search = StyleSheet.create({
  stickySearchContainer: {
    paddingHorizontal: tokens.spacing.pad,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
    zIndex: 999,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tokens.colors.card,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    ...base.shadowSm,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: tokens.spacing.sm,
    color: tokens.colors.ink2,
  },
  searchInput: {
    flex: 1,
    fontSize: tokens.text.body,
    color: tokens.colors.ink,
    padding: 0,
  },
  searchClearBtn: {
    marginLeft: tokens.spacing.xs,
  },
});

// Cheapest card styles
export const cheapestCard = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.card,
    marginHorizontal: tokens.spacing.md,
    marginVertical: tokens.spacing.sm,
    padding: tokens.spacing.lg,
    minHeight: 160,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    ...base.shadowMd,
  },
  content: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: tokens.spacing.md,
    flex: 1,
  },
  image: {
    width: "50%",
    height: 120,
    borderRadius: tokens.radius.lg,
    marginRight: tokens.spacing.md,
    backgroundColor: tokens.colors.bg,
  },
  info: {
    width: "50%",
    paddingLeft: tokens.spacing.sm,
    justifyContent: "space-between",
    paddingVertical: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.text.body,
    fontWeight: "700",
    color: tokens.colors.success,
    marginBottom: tokens.spacing.xs,
    textTransform: "uppercase",
  },
  product: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.sm,
    lineHeight: 16,
    fontWeight: "600",
  },
  price: {
    fontSize: 18,
    fontWeight: "800",
    color: tokens.colors.success,
    marginBottom: tokens.spacing.sm,
  },
  store: {
    fontSize: 10,
    color: tokens.colors.ink2,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: tokens.spacing.sm,
  },
  addButton: {
    flex: 1,
    backgroundColor: tokens.colors.success,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    alignItems: "center",
    shadowColor: tokens.colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonAdded: {
    backgroundColor: "#059669",
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: tokens.text.tiny,
    fontWeight: "700",
  },
  detailsButton: {
    flex: 1,
    backgroundColor: tokens.colors.card,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    alignItems: "center",
    borderWidth: 2,
    borderColor: tokens.colors.pill,
  },
  detailsButtonText: {
    color: tokens.colors.pill,
    fontSize: tokens.text.tiny,
    fontWeight: "700",
  },
});

// Section styles
export const section = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    margin: tokens.spacing.pad,
    marginBottom: tokens.spacing.sm,
  },
  title: {
    fontSize: tokens.text.h2,
    fontWeight: "600",
    color: tokens.colors.ink,
  },
  toggle: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  toggleText: {
    color: '#ffffff',
    fontSize: tokens.text.body,
    fontWeight: '700',
  },
});

// Horizontal product styles
export const horizontalProduct = StyleSheet.create({
  scroll: {
    marginBottom: tokens.spacing.xxl,
  },
  content: {
    paddingHorizontal: tokens.spacing.pad,
    paddingBottom: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  card: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    overflow: "hidden",
    position: "relative",
    width: 140,
    height: 160,
    ...base.shadowSm,
  },
  image: {
    width: "100%",
    height: 80,
    resizeMode: "cover",
  },
  info: {
    padding: tokens.spacing.sm,
    flex: 1,
  },
  name: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.xs,
    fontWeight: "500",
    lineHeight: 14,
  },
  price: {
    fontSize: tokens.text.body,
    fontWeight: "bold",
    color: tokens.colors.success,
    marginBottom: tokens.spacing.xs,
  },
  store: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  addButton: {
    position: "absolute",
    top: tokens.spacing.sm,
    right: tokens.spacing.sm,
    backgroundColor: tokens.colors.card,
    borderWidth: 1,
    borderColor: tokens.colors.pill,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonAdded: {
    backgroundColor: tokens.colors.pill,
    opacity: 0.85,
  },
});

// Heatmap styles
export const heatmap = StyleSheet.create({
  wrapper: {
    marginHorizontal: tokens.spacing.pad,
    marginTop: -tokens.spacing.xxl,
    paddingTop: tokens.spacing.xxl + tokens.spacing.sm,
    marginBottom: tokens.spacing.xl,
    zIndex: 5,
  },
  header: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: tokens.spacing.sm,
  },
  card: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: 0,
    ...base.shadowMd,
    overflow: "hidden",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: tokens.spacing.xl,
    paddingHorizontal: tokens.spacing.pad,
    gap: tokens.spacing.md,
  },
  spinner: {
    padding: tokens.spacing.sm,
    borderRadius: 50,
    backgroundColor: tokens.colors.bg,
  },
  placeholderText: {
    color: tokens.colors.ink2,
    fontSize: tokens.text.body,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.pill,
  },
  refreshIcon: {
    marginRight: tokens.spacing.xs,
  },
  refreshText: {
    color: '#ffffff',
    fontSize: tokens.text.body,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing.pad,
    paddingVertical: tokens.spacing.xs,
  },
  container: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
    minHeight: 36,
  },
  productCell: {
    width: BRAND_COLUMN_WIDTH,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.xs,
    backgroundColor: tokens.colors.bg,
    borderRightWidth: 1,
    borderRightColor: tokens.colors.line,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCell: {
    width: STORE_COLUMN_WIDTH,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm,
    backgroundColor: tokens.colors.bg,
    borderRightWidth: 1,
    borderRightColor: tokens.colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  cellContainer: {
    width: STORE_COLUMN_WIDTH,
    borderRightWidth: 1,
    borderRightColor: tokens.colors.line,
  },
  cellContainerLast: {
    borderRightWidth: 0,
  },
  cell: {
    width: "100%",
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.card,
    minHeight: 32,
  },
  cellCheapest: {
    backgroundColor: "#f0fdf4", // Light green background
  },
  headerText: {
    fontSize: tokens.text.tiny,
    fontWeight: "700",
    color: tokens.colors.ink,
    textAlign: "center",
  },
  productText: {
    fontSize: tokens.text.tiny,
    fontWeight: "500",
    color: tokens.colors.ink,
    lineHeight: 14,
  },
  brandImageContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.xs,
  },
  productLabel: {
    width: "100%",
    fontSize: tokens.text.tiny,
    textAlign: "center",
    color: tokens.colors.ink,
    fontWeight: "600",
    lineHeight: 14,
    paddingHorizontal: tokens.spacing.xs,
  },
  brandImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  brandImageFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tokens.colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  brandImageFallbackText: {
    fontSize: tokens.text.tiny,
    fontWeight: "700",
    color: tokens.colors.ink,
  },
  cellText: {
    fontSize: tokens.text.tiny,
    fontWeight: "700",
    color: tokens.colors.ink,
  },
  cellTextEmpty: {
    color: tokens.colors.ink2,
    fontWeight: "500",
  },
  cellTextCheapest: {
    color: tokens.colors.success,
    fontWeight: "700",
  },
});

// Tooltip styles
export const tooltip = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  panel: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    margin: tokens.spacing.md,
    ...base.shadowLg,
    minWidth: 220,
    maxWidth: 280,
  },
  title: {
    fontSize: tokens.text.h2,
    fontWeight: "700",
    color: tokens.colors.ink,
    textAlign: "center",
    marginBottom: tokens.spacing.sm,
  },
  price: {
    fontSize: 28,
    fontWeight: "800",
    color: tokens.colors.success,
    textAlign: "center",
    marginBottom: tokens.spacing.sm,
  },
  product: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    textAlign: "center",
    marginBottom: tokens.spacing.md,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    textAlign: "center",
    marginBottom: tokens.spacing.sm,
  },
  status: {
    backgroundColor: tokens.colors.bg,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    alignItems: "center",
  },
  statusText: {
    fontSize: tokens.text.tiny,
    fontWeight: "600",
  },
});

// Legacy styles (for backward compatibility)
export const legacy = StyleSheet.create({
  topPicksList: {
    marginTop: tokens.spacing.sm,
  },
  productCard: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    margin: tokens.spacing.xs,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    overflow: "hidden",
    position: "relative",
    flex: 1,
    maxWidth: "48%",
    ...base.shadowSm,
  },
  productRow: {
    justifyContent: "space-between",
  },
  productsList: {
    marginTop: tokens.spacing.sm,
  },
  productImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  productInfo: {
    padding: tokens.spacing.md,
    flex: 1,
  },
  productName: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.xs,
    fontWeight: "500",
  },
  productPrice: {
    fontSize: tokens.text.body,
    fontWeight: "bold",
    color: tokens.colors.success,
    marginBottom: tokens.spacing.xs,
  },
  productStore: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  addToCartButton: {
    position: "absolute",
    top: tokens.spacing.sm,
    right: tokens.spacing.sm,
    backgroundColor: tokens.colors.pill,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addToCartText: {
    color: "#ffffff",
    fontSize: tokens.text.body,
    fontWeight: "bold",
  },
  compareContainer: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  compareHeader: {
    flexDirection: "row",
    padding: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  compareLabel: {
    flex: 1,
    fontSize: tokens.text.tiny,
    fontWeight: "600",
    color: tokens.colors.ink,
    textAlign: "center",
  },
  compareRow: {
    flexDirection: "row",
    padding: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  compareBrand: {
    flex: 1,
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink,
    fontWeight: "500",
  },
  comparePrices: {
    flex: 3,
    flexDirection: "row",
  },
  comparePrice: {
    flex: 1,
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink,
    textAlign: "center",
  },
  lowestPrice: {
    color: tokens.colors.success,
    fontWeight: "bold",
  },
});
