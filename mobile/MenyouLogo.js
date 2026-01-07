import React from 'react';
import { View, Text, Image } from 'react-native';

export default function MenyouLogo({ height = 36, style }) {
  // Calculate width to maintain aspect ratio (assuming logo is roughly 2.5:1)
  const width = height * 2.5;
  const [imageError, setImageError] = React.useState(false);

  // Fallback to text logo if image fails to load
  if (imageError) {
    return (
      <View style={[{ height, alignItems: 'center', justifyContent: 'center' }, style]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: height, fontWeight: '700', color: '#00FF00' }}>mΞnyou</Text>
          <Text style={{ fontSize: height * 0.8, fontWeight: '400', color: '#666', marginLeft: 4 }}>.ai</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[{ height, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Image
        source={require('./assets/menyou-logo.png')}
        style={{
          height: height,
          width: width,
          resizeMode: 'contain',
        }}
        onError={() => setImageError(true)}
      />
    </View>
  );
}
