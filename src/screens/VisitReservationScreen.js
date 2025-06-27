import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert, FlatList, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';
import { translateMultipleTexts } from '../utils/translation';
import immigrationOffices from '../data/immigrationOffices.json';

export default function VisitReservationScreen({ navigation }) {
  const { languageCode } = useLanguage();
  const [userLocation, setUserLocation] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [nearbyOffices, setNearbyOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [translations, setTranslations] = useState({});

  const textsToTranslate = {
    title: 'Visit Reservation',
    locationPermission: 'Location permission is required',
    locationDenied: 'Location permission denied',
    settings: 'Go to Settings',
    cancel: 'Cancel',
    nearestOffice: 'Nearest Immigration Office',
    distance: 'Distance',
    address: 'Address',
    loading: 'Loading...',
    locationError: 'Unable to get location information',
    nearbyOffices: 'Nearby Immigration Offices',
    refresh: 'Refresh',
    myLocation: 'My Location',
    visitReservation: 'Make a Reservation',
    visitReservationDesc: 'Go to HiKorea visit reservation page',
    back: 'Back',
    gettingAddress: 'Getting address...'
  };

  useEffect(() => {
    const translateTexts = async () => {
      try {
        const translatedTexts = await translateMultipleTexts(textsToTranslate, languageCode);
        setTranslations(translatedTexts);
        setLoading(false);
      } catch (error) {
        console.error('Translation error:', error);
        setLoading(false);
      }
    };
    translateTexts();
  }, [languageCode]);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          translations.locationPermission || textsToTranslate.locationPermission,
          translations.locationDenied || textsToTranslate.locationDenied,
          [
            { text: translations.cancel || textsToTranslate.cancel, style: 'cancel' },
            { text: translations.settings || textsToTranslate.settings, onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setUserLocation(location.coords);
      
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        if (address) {
          const formattedAddress = languageCode === 'ko' 
            ? `${address.region} ${address.city} ${address.district} ${address.street}`
            : `${address.street}, ${address.district}, ${address.city}, ${address.region}`;
          setUserAddress(formattedAddress);
        }
      } catch (error) {
        console.error('Error getting address:', error);
        setUserAddress(null);
      }

      findNearbyOffices(location.coords);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(translations.locationError || textsToTranslate.locationError);
    } finally {
      setLoading(false);
    }
  };

  const findNearbyOffices = (userCoords) => {
    const officesWithDistance = immigrationOffices.map(office => ({
      ...office,
      distance: calculateDistance(
        userCoords.latitude,
        userCoords.longitude,
        office.lat,
        office.lng
      )
    }));

    const sortedOffices = officesWithDistance.sort((a, b) => a.distance - b.distance);
    setNearbyOffices(sortedOffices);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (value) => {
    return value * Math.PI / 180;
  };

  const renderOfficeItem = ({ item, index }) => (
    <View style={[styles.officeItem, index === 0 && styles.nearestOfficeItem]}>
      <View style={styles.officeHeader}>
        <View style={styles.officeNameContainer}>
          <Text style={styles.officeName}>{item.name}</Text>
          {index === 0 && (
            <View style={styles.nearestBadge}>
              <Text style={styles.nearestText}>{translations.nearestOffice || textsToTranslate.nearestOffice}</Text>
            </View>
          )}
        </View>
        <View style={styles.distanceContainer}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.distance}>{item.distance.toFixed(1)} km</Text>
        </View>
      </View>
      <View style={styles.addressContainer}>
        <Ionicons name="home" size={16} color="#666" />
        <Text style={styles.address}>{item.address}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#ffffff"
        translucent={Platform.OS === 'android'}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2c5282" />
            <Text style={styles.backButtonText}>
              {translations.back || textsToTranslate.back}
            </Text>
          </TouchableOpacity>
          <View style={styles.headerIconContainer}>
            <Ionicons name="location" size={24} color="#2c5282" />
          </View>
          <Text style={styles.headerTitle}>
            {translations.title || textsToTranslate.title}
          </Text>
          <TouchableOpacity onPress={getLocation} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#2c5282" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="sync" size={24} color="#2c5282" />
              <Text style={styles.loadingText}>
                {translations.loading || textsToTranslate.loading}
              </Text>
            </View>
          ) : nearbyOffices.length > 0 ? (
            <>
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={24} color="#2c5282" />
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationText}>
                    {translations.myLocation || textsToTranslate.myLocation}
                  </Text>
                  <Text style={styles.address}>
                    {userAddress || (translations.gettingAddress || textsToTranslate.gettingAddress)}
                  </Text>
                </View>
              </View>
              <Text style={styles.sectionTitle}>
                {translations.nearbyOffices || textsToTranslate.nearbyOffices}
              </Text>
              <FlatList
                data={nearbyOffices.slice(0, 5)}
                renderItem={renderOfficeItem}
                keyExtractor={(item) => item.name}
                scrollEnabled={false}
              />
              <TouchableOpacity 
                style={styles.reservationLink}
                onPress={() => Linking.openURL('https://www.hikorea.go.kr/resv/ResvIntroR.pt')}
              >
                <Text style={styles.reservationLinkText}>
                  {translations.visitReservation || textsToTranslate.visitReservation}
                </Text>
                <Ionicons name="open-outline" size={20} color="#2c5282" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color="red" />
              <Text style={styles.errorText}>
                {translations.locationError || textsToTranslate.locationError}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    position: 'relative',
    height: 140,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ebf8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 2,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 24,
    top: '50%',
    transform: [{ translateY: -12 }],
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backButtonText: {
    marginLeft: 4,
    color: '#2c5282',
    fontSize: 16,
    fontWeight: '500',
  },
  refreshButton: {
    position: 'absolute',
    right: 24,
    top: '50%',
    transform: [{ translateY: -12 }],
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    color: '#2c5282',
    fontWeight: '500',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 16,
  },
  officeItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  nearestOfficeItem: {
    borderColor: '#2c5282',
    borderWidth: 2,
  },
  officeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  officeNameContainer: {
    flex: 1,
    marginRight: 8,
  },
  officeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distance: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearestBadge: {
    backgroundColor: '#2c5282',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  nearestText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 8,
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  reservationLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reservationLinkText: {
    color: '#2c5282',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
}); 