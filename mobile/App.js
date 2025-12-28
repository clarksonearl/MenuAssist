import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  Platform,
  Modal 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// Helper to get API base URL based on platform
// For physical devices, replace 'localhost' with your computer's IP address
// Find your IP with: ifconfig | grep "inet " | grep -v 127.0.0.1
const COMPUTER_IP = '192.168.1.43'; // Update this with your computer's IP if testing on physical device

const getApiBaseUrl = () => {
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to reach host machine
    return 'http://10.0.2.2:3000';
  }
  
  // For iOS: Use IP address for physical devices, localhost for simulator
  // If testing on a physical iOS device, uncomment the next line and comment out localhost:
  return `http://${COMPUTER_IP}:3000`;
  // return 'http://localhost:3000'; // Use this for iOS simulator
};

export default function App() {
  const [gluten, setGluten] = useState(false);
  const [dairy, setDairy] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera roll permissions to pick a menu photo.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0]);
        setResults(null);
        setError(null);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', `Failed to pick image: ${err.message}. Please try again.`);
    }
  };

  const takePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera permissions to take a photo of the menu.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0]);
        setResults(null);
        setError(null);
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      Alert.alert('Error', `Failed to take photo: ${err.message}. Please try again.`);
    }
  };

  const analyzeMenu = async () => {
    // Validation: Must have at least one restriction
    if (!gluten && !dairy) {
      Alert.alert('Select Restriction', 'Please select at least one restriction (Gluten and/or Dairy).');
      return;
    }

    // Validation: Must have a photo
    if (!photo) {
      Alert.alert('No Photo', 'Please pick a menu photo first.');
      return;
    }

    // Validation: Must accept disclaimer
    if (!disclaimerAccepted) {
      Alert.alert('Disclaimer Required', 'Please read and accept the disclaimer before analyzing.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Build restrictions array
      const restrictions = [];
      if (gluten) restrictions.push('gluten');
      if (dairy) restrictions.push('dairy');

      // Get image data URL (base64 if available, otherwise convert from URI)
      let imageDataUrl;
      if (photo.base64) {
        imageDataUrl = `data:image/jpeg;base64,${photo.base64}`;
      } else {
        // Fallback: convert from URI if base64 not available
        const base64 = await FileSystem.readAsStringAsync(photo.uri, {
          encoding: 'base64',
        });
        imageDataUrl = `data:image/jpeg;base64,${base64}`;
      }

      // Make API call
      const apiUrl = `${getApiBaseUrl()}/api/analyze-menu`;
      console.log('Making request to:', apiUrl);
      console.log('Platform:', Platform.OS);
      console.log('Image data length:', imageDataUrl ? imageDataUrl.length : 0);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for deep analysis
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl,
          restrictions: restrictions,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Error analyzing menu:', err);
      let errorMessage = 'Failed to analyze menu. Please try again.';
      
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. The image might be too large or the server is slow.';
      } else if (err.message.includes('Network request failed') || err.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to server. Make sure:\n1. Backend is running on port 3000\n2. Phone and computer are on same Wi-Fi\n3. Firewall allows port 3000';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Menu Safe MVP</Text>

        {/* Restrictions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Restrictions:</Text>
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setGluten(!gluten)}
          >
            <View style={[styles.checkbox, gluten && styles.checkboxChecked]}>
              {gluten && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Gluten</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setDairy(!dairy)}
          >
            <View style={[styles.checkbox, dairy && styles.checkboxChecked]}>
              {dairy && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Dairy</Text>
          </TouchableOpacity>
        </View>

        {/* Photo Selection */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>Pick Menu Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={takePhoto}>
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>
          <Text style={styles.statusText}>
            {photo ? 'Photo selected ✅' : 'No photo selected'}
          </Text>
        </View>

        {/* Disclaimer Checkbox */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
          >
            <View style={[styles.checkbox, disclaimerAccepted && styles.checkboxChecked]}>
              {disclaimerAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.disclaimerTextContainer}>
              <Text style={styles.disclaimerText}>
                I acknowledge that Menu Safe is not liable for any consequences...
              </Text>
              <TouchableOpacity onPress={() => setShowDisclaimerModal(true)}>
                <Text style={styles.readMoreText}>Read full disclaimer</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Full Disclaimer Modal */}
        <Modal
          visible={showDisclaimerModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowDisclaimerModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Disclaimer & Terms of Service</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDisclaimerModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.fullDisclaimerText}>
                I acknowledge and agree that Menu Safe is for informational purposes only and should not be taken seriously as medical, legal, or professional dietary advice. Menu Safe utilizes artificial intelligence technology which may be inaccurate, incomplete, or incorrect. AI systems can make errors, misinterpret information, or provide false or misleading guidance.
                {'\n\n'}
                I understand that I must independently verify every single item, ingredient, and preparation method directly with restaurant staff before consuming any food or beverage. I accept full and complete responsibility for verifying all ingredients, cross-contamination risks, and preparation methods with the restaurant's management and kitchen staff.
                {'\n\n'}
                I acknowledge that Menu Safe is not liable for any allergic reactions, health consequences, medical issues, injuries, damages, losses, or any other consequences that may result from my use of this application. I agree to hold Menu Safe, its developers, operators, and affiliates completely harmless from any and all claims, damages, liabilities, costs, and expenses.
                {'\n\n'}
                By proceeding with the use of this service, I consent to payment for any applicable fees or charges associated with Menu Safe. I understand and agree that under no circumstances will I be entitled to a refund, regardless of the outcome, accuracy of results, service performance, or any other factor. All payments are final and non-refundable.
                {'\n\n'}
                I waive all rights to pursue legal action, file lawsuits, seek damages, or take any legal proceedings against Menu Safe, its developers, operators, affiliates, or any related parties for any reason whatsoever, including but not limited to inaccuracy of information, service failures, health consequences, or any other issues arising from my use of this application.
                {'\n\n'}
                By checking the box below, I confirm that I have read, understood, and agree to be bound by all terms and conditions stated in this disclaimer.
              </Text>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowDisclaimerModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Analyze Button */}
        <TouchableOpacity 
          style={[
            styles.button, 
            styles.analyzeButton,
            (!disclaimerAccepted || loading) && styles.buttonDisabled
          ]} 
          onPress={analyzeMenu}
          disabled={loading || !disclaimerAccepted}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.loadingText}>Deep analyzing menu...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Analyze</Text>
          )}
        </TouchableOpacity>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        )}

        {/* Results Display */}
        {results && (
          <View style={styles.resultsContainer}>
            {results.disclaimer && (
              <Text style={styles.disclaimer}>{results.disclaimer}</Text>
            )}

            {/* SAFE Section */}
            {results.safe && results.safe.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>SAFE</Text>
                {results.safe.map((item, index) => (
                  <View key={index} style={styles.resultItem}>
                    <Text style={styles.resultItemName}>{item.name}</Text>
                    <Text style={styles.resultItemReason}>— {item.reason}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* CAUTION Section */}
            {results.caution && results.caution.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={[styles.resultSectionTitle, styles.cautionTitle]}>CAUTION</Text>
                {results.caution.map((item, index) => (
                  <View key={index} style={styles.resultItem}>
                    <Text style={styles.resultItemName}>{item.name}</Text>
                    <Text style={styles.resultItemReason}>— {item.reason}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#333',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#5856D6',
  },
  analyzeButton: {
    backgroundColor: '#34C759',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimerTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  readMoreText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  fullDisclaimerText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalCloseButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
  },
  resultsContainer: {
    marginTop: 30,
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  resultSection: {
    marginBottom: 25,
  },
  resultSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 12,
  },
  cautionTitle: {
    color: '#FF9500',
  },
  avoidTitle: {
    color: '#FF3B30',
  },
  resultItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultItemReason: {
    fontSize: 14,
    color: '#666',
  },
});
