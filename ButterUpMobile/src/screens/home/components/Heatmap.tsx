import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "../../../theme/tokens";
import { heatmap, section } from "../../HomeScreen.styles";
import { HeatmapPriceCell } from "./HeatmapPriceCell";
import { BRAND_COLUMN_WIDTH, STORE_COLUMN_WIDTH } from "../utils/constants";
import { organizeHeatmapData, getAvailableStores } from "../utils/heatmap";
import { formatLastUpdated } from "../utils/helpers";

interface HeatmapProps {
  quickCompareRows: any[];
  isLoading: boolean;
  onRefresh: () => void;
  onPriceCellPress: (store: string, price: number, product: string, timestamp: string) => void;
}

export const Heatmap: React.FC<HeatmapProps> = ({
  quickCompareRows,
  isLoading,
  onRefresh,
  onPriceCellPress,
}) => {
  const heatmapData = organizeHeatmapData(quickCompareRows);
  const availableStores = getAvailableStores(quickCompareRows);

  const renderSkeleton = () => (
    <View style={heatmap.placeholder}>
      <View style={heatmap.spinner}>
        <ActivityIndicator color={tokens.colors.accent} size="small" />
      </View>
      <Text style={heatmap.placeholderText}>
        Loading the latest quick compare data...
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={heatmap.placeholder}>
      <Text style={heatmap.placeholderText}>
        No recent price snapshots yet.
      </Text>

      <TouchableOpacity
        style={heatmap.refreshButton}
        onPress={onRefresh}
        activeOpacity={0.85}
      >
        <Ionicons
          name="arrow-forward"
          size={16}
          color={tokens.colors.bg}
          style={heatmap.refreshIcon}
        />
        <Text style={heatmap.refreshText}>See more</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={heatmap.wrapper}>
      <View style={[section.header, heatmap.header]}>
        <Text style={section.title}>Quick Compare</Text>

        {!isLoading && heatmapData.length > 0 && (
          <TouchableOpacity
            style={heatmap.refreshButton}
            onPress={onRefresh}
            activeOpacity={0.85}
          >
            <Ionicons
              name="arrow-forward"
              size={16}
              color={tokens.colors.bg}
              style={heatmap.refreshIcon}
            />
            <Text style={heatmap.refreshText}>See more</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && (
        <View style={heatmap.card}>{renderSkeleton()}</View>
      )}

      {!isLoading && heatmapData.length === 0 && (
        <View style={heatmap.card}>{renderEmptyState()}</View>
      )}

      {!isLoading && heatmapData.length > 0 && (
        <View style={heatmap.card}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={heatmap.scrollContent}
          >
            <View
              style={[
                heatmap.container,
                {
                  width:
                    BRAND_COLUMN_WIDTH +
                    availableStores.length * STORE_COLUMN_WIDTH,
                },
              ]}
            >
              <View style={heatmap.row}>
                <View style={heatmap.productCell}>
                  <Text style={heatmap.headerText}>Product</Text>
                </View>

                {availableStores.map((store, index) => (
                  <View
                    key={`header-${store}-${index}`}
                    style={[
                      heatmap.headerCell,
                      index === availableStores.length - 1 &&
                        heatmap.cellContainerLast,
                    ]}
                  >
                    <Text style={heatmap.headerText}>{store}</Text>
                  </View>
                ))}
              </View>

              {heatmapData.map((item, index) => (
                <View key={`row-${(item.brandName || 'unknown').toString()}-${index}`} style={heatmap.row}>
                  <View style={heatmap.productCell}>
                    <View style={heatmap.brandImageContainer}>
                      {item.brandImage ? (
                        <Image
                          source={{ uri: item.brandImage }}
                          style={heatmap.brandImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={heatmap.brandImageFallback}>
                          <Text style={heatmap.brandImageFallbackText}>
                            {((item.brandName || 'Unknown Butter').charAt(0) || '?').toUpperCase()}
                          </Text>
                        </View>
                      )}

                      <Text
                        style={heatmap.productLabel}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                      >
                        {item.brandName || 'Unknown Butter'}
                      </Text>
                    </View>
                  </View>

                  {availableStores.map((store, storeIndex) => (
                    <View
                      key={`cell-${(item.brandName || 'unknown').toString()}-${store}-${storeIndex}`}
                      style={[
                        heatmap.cellContainer,
                        storeIndex === availableStores.length - 1 &&
                          heatmap.cellContainerLast,
                      ]}
                    >
                      <HeatmapPriceCell
                        price={item.prices[store]}
                        productName={item.brandName}
                        store={store}
                        timestamp={item.timestamps[store]}
                        allPrices={item.prices}
                        onPress={() =>
                          onPriceCellPress(
                            store,
                            item.prices[store]!,
                            item.brandName,
                            item.timestamps[store] || ""
                          )
                        }
                      />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
};
