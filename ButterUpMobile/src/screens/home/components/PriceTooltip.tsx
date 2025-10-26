import React from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { tooltip } from "../../HomeScreen.styles";
import { getFreshnessStatus, getFreshnessColor } from "../utils/helpers";

interface TooltipData {
  store: string;
  price: number;
  lastUpdated: string;
  product: string;
}

interface PriceTooltipProps {
  visible: boolean;
  data: TooltipData | null;
  onClose: () => void;
}

export const PriceTooltip: React.FC<PriceTooltipProps> = ({
  visible,
  data,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={tooltip.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={tooltip.panel}>
          <Text style={tooltip.title}>{data?.store}</Text>

          <Text style={tooltip.price}>
            ${data?.price.toFixed(2)}
          </Text>

          <Text style={tooltip.product}>{data?.product}</Text>

          <Text style={tooltip.timestamp}>
            Updated: {data?.lastUpdated}
          </Text>

          <View style={tooltip.status}>
            <Text
              style={[
                tooltip.statusText,
                { color: getFreshnessColor(data?.lastUpdated || null) },
              ]}
            >
              Status: {getFreshnessStatus(data?.lastUpdated || null)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
