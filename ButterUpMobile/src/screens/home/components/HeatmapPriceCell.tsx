import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { heatmap } from "../../HomeScreen.styles";

interface HeatmapPriceCellProps {
  price: number | null;
  productName: string;
  store: string;
  timestamp: string | null;
  allPrices: { [storeKey: string]: number | null };
  onPress: () => void;
}

export const HeatmapPriceCell: React.FC<HeatmapPriceCellProps> = ({
  price,
  productName,
  store,
  timestamp,
  allPrices,
  onPress,
}) => {
  if (price === null || price === undefined) {
    return (
      <View style={heatmap.cell}>
        <Text style={[heatmap.cellText, heatmap.cellTextEmpty]}>
          --
        </Text>
      </View>
    );
  }

  const validPrices = Object.values(allPrices).filter(
    (p): p is number => p !== null && p !== undefined,
  );

  const isCheapest =
    validPrices.length > 0 && price === Math.min(...validPrices);

  return (
    <TouchableOpacity
      style={[heatmap.cell, isCheapest && heatmap.cellCheapest]}
      onPress={onPress}
    >
      <Text
        style={[heatmap.cellText, isCheapest && heatmap.cellTextCheapest]}
      >
        ${price.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
};
