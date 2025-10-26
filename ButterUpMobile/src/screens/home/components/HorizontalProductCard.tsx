import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "../../../theme/tokens";
import { horizontalProduct } from "../../HomeScreen.styles";

interface HorizontalProductCardProps {
  item: any;
  isInList: boolean;
  onPress: (item: any) => void;
  onAddToList: (item: any) => void;
}

export const HorizontalProductCard: React.FC<HorizontalProductCardProps> = ({
  item,
  isInList,
  onPress,
  onAddToList,
}) => {
  return (
    <TouchableOpacity style={horizontalProduct.card} onPress={() => onPress(item)}>
      {item.image_url && (
        <Image
          source={{ uri: item.image_url }}
          style={horizontalProduct.image}
          resizeMode="cover"
        />
      )}

      <View style={horizontalProduct.info}>
        <Text style={horizontalProduct.name} numberOfLines={2}>
          {item.name_with_brand}
        </Text>

        <Text style={horizontalProduct.price}>
          ${item.price.toFixed(2)}
        </Text>

        <Text style={horizontalProduct.store}>
          {item.brand || item.store}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          horizontalProduct.addButton,
          isInList && horizontalProduct.addButtonAdded
        ]}
        onPress={() => onAddToList(item)}
      >
        <Ionicons
          name={isInList ? "checkmark" : "add"}
          size={16}
          color={isInList ? '#ffffff' : tokens.colors.pill}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};
