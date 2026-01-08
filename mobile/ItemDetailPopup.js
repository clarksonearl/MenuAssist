import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const POPUP_HEIGHT = SCREEN_HEIGHT * 0.85;

/**
 * ItemDetailPopup - Bottom sheet popup for menu item details
 * 
 * @param {Object} props
 * @param {boolean} props.visible - Whether popup is visible
 * @param {Object|null} props.item - Item data object
 * @param {Object} props.activeRestrictions - { gluten: boolean, dairy: boolean }
 * @param {Function} props.onClose - Callback to close popup
 */
export default function ItemDetailPopup({ visible, item, activeRestrictions = { gluten: false, dairy: false }, onClose }) {

  if (!item) return null;

  // Status normalization - tolerant of all backend statuses, maps to UI labels
  const getStatus = () => {
    // Check sourceArray first (most reliable)
    if (item._sourceArray === 'safe') return 'GENERALLY_OK';
    if (item._sourceArray === 'caution') return 'CAUTION';
    
    // Check status field - handle all possible backend values
    if (item.status) {
      const upperStatus = String(item.status).toUpperCase().trim();
      // SAFE variants -> GENERALLY_OK
      if (upperStatus === 'SAFE' || upperStatus === 'GENERALLY_OK') return 'GENERALLY_OK';
      // CAUTION variants -> CAUTION
      if (upperStatus === 'CAUTION' || upperStatus === 'ASK') return 'CAUTION';
      // UNSAFE variants -> CAUTION (safer default)
      if (upperStatus === 'UNSAFE' || upperStatus === 'NOT AN OPTION' || upperStatus === 'NOT_AN_OPTION') return 'CAUTION';
    }
    
    // Default to CAUTION for unknown/missing (safer default)
    return 'CAUTION';
  };

  const status = getStatus();
  const statusLabel = status === 'GENERALLY_OK' ? 'Generally OK' : 'Caution';
  
  // Get status badge color
  const getStatusBadgeColor = () => {
    if (status === 'GENERALLY_OK') return '#34C759'; // Green
    return '#FF9500'; // Orange for CAUTION
  };

  // Extract reasons - use fetched details or fallback to item fields
  const getReasons = () => {
    if (details && details.why) {
      return [details.why];
    }
    if (Array.isArray(item.reasons) && item.reasons.length > 0) {
      return item.reasons.map(r => typeof r === 'string' ? r : r.detail).filter(Boolean);
    }
    if (item.reasons && typeof item.reasons === 'object' && item.reasons.length > 0) {
      return item.reasons.map(r => typeof r === 'string' ? r : r.detail).filter(Boolean);
    }
    // Fallback to other reason fields
    if (item.bestReason) return [item.bestReason];
    if (item.guidance) return [item.guidance];
    if (item.reason) return [item.reason];
    // For "Generally OK" items, provide a default reason
    if (status === 'GENERALLY_OK') {
      return ['No obvious dairy indicators found — confirm prep.'];
    }
    return [];
  };

  const reasons = getReasons();

  // Generate restriction-aware questions based on active restrictions and item reasons
  const getAskQuestions = () => {
    // Use fetched details first
    if (details && details.ask && Array.isArray(details.ask) && details.ask.length > 0) {
      return details.ask;
    }
    
    // Use prop first, fallback to item._activeRestrictions if prop not provided
    const restrictions = activeRestrictions && (activeRestrictions.gluten !== undefined || activeRestrictions.dairy !== undefined)
      ? activeRestrictions
      : (item._activeRestrictions || { gluten: false, dairy: false });
    const { gluten = false, dairy = false } = restrictions;
    const questions = [];

    // Get all reason text as a single lowercase string for keyword matching
    const reasonsText = reasons.join(' ').toLowerCase();

    // First, try to use backend askServer if present (filtered to match restrictions)
    if (Array.isArray(item.askServer) && item.askServer.length > 0) {
      const backendQuestions = item.askServer
        .map(q => typeof q === 'string' ? q : String(q))
        .filter(q => q && q.trim().length > 0);
      
      // Filter backend questions to match active restrictions
      const filtered = backendQuestions.filter(q => {
        const qLower = q.toLowerCase();
        if (gluten && !dairy) {
          // Only gluten selected - remove dairy-only questions
          return !qLower.includes('butter') && !qLower.includes('cheese') && 
                 !qLower.includes('cream') && !qLower.includes('milk') && 
                 !qLower.includes('dairy');
        }
        if (dairy && !gluten) {
          // Only dairy selected - remove gluten-only questions
          return !qLower.includes('gluten') && !qLower.includes('wheat') && 
                 !qLower.includes('flour') && !qLower.includes('bread');
        }
        // Both or neither - keep all questions
        return true;
      });
      
      if (filtered.length > 0) {
        questions.push(...filtered);
      }
    } else if (typeof item.askServer === 'string' && item.askServer.trim().length > 0) {
      // Single string from backend
      const qLower = item.askServer.toLowerCase();
      const shouldInclude = 
        (gluten && !dairy && !qLower.includes('butter') && !qLower.includes('cheese') && !qLower.includes('dairy')) ||
        (dairy && !gluten && !qLower.includes('gluten') && !qLower.includes('wheat') && !qLower.includes('flour')) ||
        (gluten && dairy) || (!gluten && !dairy);
      
      if (shouldInclude) {
        questions.push(item.askServer.trim());
      }
    }

    // Generate smart reason-based questions
    if (gluten) {
      let hasGlutenSpecific = false;
      
      // Gluten-specific questions based on reasons
      if (reasonsText.includes('tortilla') || reasonsText.includes('flour tortilla')) {
        questions.push('Do you have corn tortillas available?');
        hasGlutenSpecific = true;
      }
      if (reasonsText.includes('breaded') || reasonsText.includes('breading') || reasonsText.includes('fried')) {
        questions.push('Is it breaded or dusted with flour? Is the fryer shared with breaded items?');
        hasGlutenSpecific = true;
      }
      if (reasonsText.includes('soy sauce') || reasonsText.includes('teriyaki') || reasonsText.includes('glaze')) {
        questions.push('Do you have gluten-free soy sauce, or can the sauce be made without soy sauce?');
        hasGlutenSpecific = true;
      }
      if (reasonsText.includes('roux') || reasonsText.includes('gravy')) {
        questions.push('Is the sauce thickened with flour?');
        hasGlutenSpecific = true;
      }
      if (reasonsText.includes('pasta') || reasonsText.includes('noodles')) {
        questions.push('Do you have gluten-free pasta?');
        hasGlutenSpecific = true;
      }
      
      // Generic gluten question if no specific reason-based questions were added
      if (!hasGlutenSpecific && !questions.some(q => {
        const qLower = q.toLowerCase();
        return qLower.includes('wheat') || qLower.includes('flour') || qLower.includes('gluten') || qLower.includes('bread');
      })) {
        questions.push('Does this contain wheat, flour, or breaded ingredients?');
      }
      
      // Always include cross-contact question for gluten if not already present
      if (!questions.some(q => {
        const qLower = q.toLowerCase();
        return qLower.includes('cross') || qLower.includes('shared') || qLower.includes('clean') || qLower.includes('gloves') || qLower.includes('utensils');
      })) {
        questions.push('Can you prepare this on a clean surface, change gloves, or use clean utensils to reduce cross-contact?');
      }
    }

    if (dairy) {
      // Dairy-specific questions
      questions.push('Is there butter, cream, cheese, or milk in this item?');
      questions.push('Can it be prepared without dairy (no butter, no cheese)?');
      if (!questions.some(q => q.toLowerCase().includes('shared') || q.toLowerCase().includes('surface'))) {
        questions.push('Is it cooked on a shared surface with butter or dairy?');
      }
    }

    // If both restrictions, combine but cap to 5 best questions
    if (gluten && dairy) {
      // Prioritize: specific reason-based questions first, then general ones
      const specific = questions.filter(q => 
        q.includes('tortilla') || q.includes('breaded') || q.includes('soy sauce') || 
        q.includes('pasta') || q.includes('roux') || q.includes('gravy')
      );
      const general = questions.filter(q => !specific.includes(q));
      return [...specific, ...general].slice(0, 5);
    }

    // If no restrictions selected, use generic fallback
    if (!gluten && !dairy) {
      return [
        'Is there butter, cream, cheese, or milk in this item?',
        'Can it be prepared without dairy?',
        'Is it cooked on a shared surface with butter or dairy?'
      ];
    }

    // Return questions, removing duplicates and limiting to 5
    const unique = Array.from(new Set(questions));
    return unique.slice(0, 5);
  };

  const askQuestions = getAskQuestions();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityLabel="Close popup"
      >
        <View style={styles.popupContainer}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeXButton}
                accessibilityRole="button"
                accessibilityLabel="Close popup"
              >
                <Text style={styles.closeXText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor() }]}>
              <Text style={styles.statusBadgeText}>{statusLabel}</Text>
            </View>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            scrollEnabled={true}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            bounces={true}
          >
            {/* Loading state */}
            {loadingDetails && (
              <View style={styles.section}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Loading details...</Text>
              </View>
            )}

            {/* Error state */}
            {detailsError && !loadingDetails && (
              <View style={styles.section}>
                <Text style={styles.errorText}>{detailsError}</Text>
              </View>
            )}

            {/* Why section */}
            {!loadingDetails && (
              <View style={[styles.section, { marginTop: 0 }]}>
                <Text style={styles.sectionTitle}>Why</Text>
                {reasons.length > 0 ? (
                  reasons.length === 1 && typeof reasons[0] === 'string' && reasons[0].length > 100 ? (
                    // Single long string - render as paragraph
                    <Text style={styles.sectionText}>{reasons[0]}</Text>
                  ) : (
                    // Array or short strings - render as bullets
                    reasons.map((reason, index) => (
                      <View key={index} style={styles.bulletItem}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{reason}</Text>
                      </View>
                    ))
                  )
                ) : (
                  <Text style={styles.sectionText}>Requires verification</Text>
                )}
              </View>
            )}

            {/* What to ask section */}
            {!loadingDetails && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What to ask your server</Text>
                {askQuestions.length > 0 ? (
                  askQuestions.map((question, index) => (
                    <View key={index} style={styles.bulletItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.bulletText}>{question}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.sectionText}>No questions available</Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close popup"
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  popupContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: POPUP_HEIGHT,
    maxHeight: POPUP_HEIGHT,
    flexDirection: 'column',
    display: 'flex',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  closeXButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  closeXText: {
    fontSize: 20,
    color: '#666',
    fontWeight: '300',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  confidenceText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingBottom: 140,
    paddingTop: 10,
  },
  section: {
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    flexShrink: 1,
    width: '100%',
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 4,
  },
  bullet: {
    fontSize: 15,
    color: '#666',
    marginRight: 8,
    width: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    flexShrink: 1,
    width: '100%',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 16,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#FF3B30',
    marginTop: 8,
    textAlign: 'center',
  },
});

