/**
 * Custom navbar: menu, search bar (location dropdown below bar), and map theme picker (modal).
 */
import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
  Modal,
  Text,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useSearch } from '../context/SearchContext';
import { useMapTheme } from '../context/MapThemeContext';
import { useRegion } from '../context/RegionContext';
import { FontSize, FontWeight, scale, Radius, Spacing } from '../constants/Theme';
import type { MapStyleKey } from '../context/MapThemeContext';
import { MAP_STYLE_KEYS } from '../context/MapThemeContext';

const MAP_STYLE_LABELS: Record<MapStyleKey, string> = {
  light: 'Light',
  classic: 'Classic',
  dark: 'Dark',
  lightBlue: 'Light blue',
  darkBlue: 'Dark blue',
};

export function NavBarHeader() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { searchQuery, setSearchQuery } = useSearch();
  const { mapStyleKey, setMapStyleKey } = useMapTheme();
  const { presets, setSelectedPresetId } = useRegion();
  const navigation = useNavigation();

  const [mapThemeModalVisible, setMapThemeModalVisible] = useState(false);
  const [locationDropdownVisible, setLocationDropdownVisible] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const openDrawer = () => {
    const drawer = navigation.getParent();
    if (drawer && 'openDrawer' in drawer) (drawer as { openDrawer: () => void }).openDrawer();
  };

  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return presets;
    return presets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q)
    );
  }, [presets, searchQuery]);

  const onSelectLocation = (preset: (typeof presets)[0]) => {
    setSelectedPresetId(preset.id);
    setSearchQuery(preset.name);
    setLocationDropdownVisible(false);
    Keyboard.dismiss();
    searchInputRef.current?.blur();
  };

  const onSelectMapStyle = (key: MapStyleKey) => {
    setMapStyleKey(key);
    setMapThemeModalVisible(false);
  };

  const headerHeight = scale(56);
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? scale(8) : 0);
  const totalHeaderHeight = headerHeight + topPadding;

  return (
    <>
      <View style={styles.headerWrapper}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.primary,
              paddingTop: topPadding,
              height: totalHeaderHeight,
              paddingHorizontal: Spacing.sm,
            },
          ]}
        >
          <TouchableOpacity
            onPress={openDrawer}
            style={styles.menuButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.8}
          >
            <Ionicons name="menu" size={scale(24)} color="#fff" />
          </TouchableOpacity>

          <View style={[styles.searchWrap, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.md }]}>
            <Ionicons name="search" size={scale(18)} color="rgba(255,255,255,0.9)" style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: '#fff', fontSize: FontSize.sm }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setLocationDropdownVisible(true)}
              onBlur={() => setTimeout(() => setLocationDropdownVisible(false), 150)}
              placeholder="Search location (Queensland, Sumatra, Hat Yai)"
              placeholderTextColor="rgba(255,255,255,0.6)"
              returnKeyType="search"
            />
          </View>

          <TouchableOpacity
            onPress={() => setMapThemeModalVisible(true)}
            style={styles.themeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.8}
            accessibilityLabel={`Map style: ${MAP_STYLE_LABELS[mapStyleKey]}. Tap to choose.`}
          >
            <Ionicons name="layers-outline" size={scale(22)} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Inline location dropdown — only visible while search is focused; closes on select or blur */}
        {locationDropdownVisible && (
          <View
            style={[
              styles.locationDropdown,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                top: totalHeaderHeight,
              },
            ]}
          >
            <Text style={[styles.dropdownTitle, { color: colors.text }]}>Go to location</Text>
            <ScrollView
              style={styles.locationScroll}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {filteredPresets.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.dropdownRow, { borderBottomColor: colors.border }]}
                  onPress={() => onSelectLocation(preset)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalRowText, { color: colors.text }]}>{preset.name}</Text>
                  <Text style={[styles.modalRowSub, { color: colors.textMuted }]}>{preset.country}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Map theme choice modal */}
      <Modal
        visible={mapThemeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMapThemeModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMapThemeModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Map style</Text>
                {MAP_STYLE_KEYS.map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.modalRow,
                      { borderBottomColor: colors.border },
                      mapStyleKey === key && { backgroundColor: colors.primaryLight + '20' },
                    ]}
                    onPress={() => onSelectMapStyle(key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.modalRowText,
                        { color: colors.text },
                        mapStyleKey === key && { color: colors.primary, fontWeight: FontWeight.semibold },
                      ]}
                    >
                      {MAP_STYLE_LABELS[key]}
                    </Text>
                    {mapStyleKey === key && (
                      <Ionicons name="checkmark-circle" size={scale(20)} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    position: 'relative',
    zIndex: 1000,
    overflow: 'visible',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  menuButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: scale(40),
    paddingHorizontal: Spacing.sm,
    minWidth: 0,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    fontWeight: FontWeight.normal,
  },
  themeButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    maxHeight: '70%',
  },
  locationDropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    maxHeight: scale(280),
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    borderWidth: 1,
    borderTopWidth: 0,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  locationScroll: {
    maxHeight: scale(220),
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  modalHint: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
  },
  modalRowText: {
    fontSize: FontSize.base,
  },
  modalRowSub: {
    fontSize: FontSize.sm,
    marginLeft: Spacing.sm,
  },
  locationList: {
    maxHeight: scale(240),
  },
  emptyText: {
    padding: Spacing.lg,
    textAlign: 'center',
    fontSize: FontSize.sm,
  },
});
