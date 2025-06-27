import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Linking, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { translateMultipleTexts } from '../utils/translation';
import { useNavigation } from '@react-navigation/native';
import DocumentUploader from '../components/DocumentUploader';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = 'http://192.168.35.173:5000';

const VisaOption = ({ title, onPress }) => (
  <TouchableOpacity style={styles.optionButton} onPress={onPress}>
    <Text style={styles.optionText}>{title}</Text>
    <Ionicons name="chevron-forward" size={20} color="#666" />
  </TouchableOpacity>
);

const VisaSection = ({ title, options, onOptionPress }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name="document-text" size={24} color="#2c5282" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {options.map((option, index) => (
      <VisaOption key={index} title={option} onPress={() => onOptionPress(option)} />
    ))}
  </View>
);

const DocsScreen = ({ route, navigation }) => {
  const { languageCode } = useLanguage();
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const textsToTranslate = {
    // Header
    title: {
      ko: '비자 서류 / 진정서',
      en: 'Visa Documents / Petition'
    },
    // E-8 Visa Section
    e8Title: {
      ko: 'E-8 비자',
      en: 'E-8 Visa'
    },
    e8Registration: {
      ko: '1. 외국인등록',
      en: '1. Foreigner Registration'
    },
    e8Extension: {
      ko: '2. 체류기간 연장',
      en: '2. Stay Period Extension'
    },
    e8WorkplaceChange: {
      ko: '3. 사업장 변경 (고용주 재배정)',
      en: '3. Workplace Change (Employer Reassignment)'
    },
    // E-9 Visa Section
    e9Title: {
      ko: 'E-9 비자',
      en: 'E-9 Visa'
    },
    e9Registration: {
      ko: '1. 외국인등록',
      en: '1. Foreigner Registration'
    },
    e9WorkplaceChange: {
      ko: '2. 사업장 변경',
      en: '2. Workplace Change'
    },
    e9Extension: {
      ko: '3. 체류기간 연장',
      en: '3. Stay Period Extension'
    },
    // Complaint Section
    complaintTitle: {
      ko: '외국인등록신청서(통합신청서)/진정서',
      en: 'Foreigner Registration Form / Complaint Form'
    },
    complaintForm1: {
      ko: '외국인등록신청서(통합신청서) 작성하기',
      en: 'Fill out Foreigner Registration Form'
    },
    complaintForm2: {
      ko: '진정서 작성하기',
      en: 'Fill out Complaint Form'
    },
    // Loading
    loading: {
      ko: '로딩 중...',
      en: 'Loading...'
    }
  };

  useEffect(() => {
    const translateTexts = async () => {
      try {
        // Create a flat object for translation
        const flatTexts = {};
        Object.entries(textsToTranslate).forEach(([key, value]) => {
          flatTexts[key] = value[languageCode] || value.en;
        });

        const translatedTexts = await translateMultipleTexts(flatTexts, languageCode);
        setTranslations(translatedTexts);
        setIsLoading(false);
      } catch (error) {
        console.error('Translation error:', error);
        // Fallback to default language texts
        const fallbackTexts = {};
        Object.entries(textsToTranslate).forEach(([key, value]) => {
          fallbackTexts[key] = value[languageCode] || value.en;
        });
        setTranslations(fallbackTexts);
        setIsLoading(false);
      }
    };
    translateTexts();
  }, [languageCode]);

  const getTranslatedText = (key) => {
    return translations[key] || textsToTranslate[key][languageCode] || textsToTranslate[key].en;
  };

  const handleOptionPress = (option) => {
    let selectedType = null;
    
    // Check against both translated and original texts
    const options = {
      e8Registration: [getTranslatedText('e8Registration'), textsToTranslate.e8Registration.en],
      e8Extension: [getTranslatedText('e8Extension'), textsToTranslate.e8Extension.en],
      e8WorkplaceChange: [getTranslatedText('e8WorkplaceChange'), textsToTranslate.e8WorkplaceChange.en],
      e9Registration: [getTranslatedText('e9Registration'), textsToTranslate.e9Registration.en],
      e9WorkplaceChange: [getTranslatedText('e9WorkplaceChange'), textsToTranslate.e9WorkplaceChange.en],
      e9Extension: [getTranslatedText('e9Extension'), textsToTranslate.e9Extension.en],
      complaintForm1: [getTranslatedText('complaintForm1'), textsToTranslate.complaintForm1.en],
      complaintForm2: [getTranslatedText('complaintForm2'), textsToTranslate.complaintForm2.en]
    };

    // Find the matching option
    Object.entries(options).forEach(([type, texts]) => {
      if (texts.includes(option)) {
        selectedType = type;
      }
    });

    if (selectedType) {
      if (selectedType === 'complaintForm1') {
        navigation.navigate('RegistrationForm');
      } else if (selectedType === 'complaintForm2') {
        navigation.navigate('ComplaintForm');
    } else {
        navigation.navigate('DocsDetail', { type: selectedType });
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c5282" />
          <Text style={styles.loadingText}>{getTranslatedText('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const e8Options = [
    getTranslatedText('e8Registration'),
    getTranslatedText('e8Extension'),
    getTranslatedText('e8WorkplaceChange')
  ];

  const e9Options = [
    getTranslatedText('e9Registration'),
    getTranslatedText('e9WorkplaceChange'),
    getTranslatedText('e9Extension')
  ];

  const complaintOptions = [
    getTranslatedText('complaintForm1'),
    getTranslatedText('complaintForm2')
  ];

      return (
    <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
        <Image source={require('../assets/logo2.png')} style={{ width: 48, height: 48, marginBottom: 8 }} resizeMode="contain" />
            <Text style={styles.headerTitle}>
          {getTranslatedText('title')}
                </Text>
              </View>
          <ScrollView style={styles.container}>
            <VisaSection 
          title={getTranslatedText('e8Title')} 
              options={e8Options}
              onOptionPress={handleOptionPress}
            />
            <VisaSection 
          title={getTranslatedText('e9Title')} 
              options={e9Options}
              onOptionPress={handleOptionPress}
            />
            <VisaSection 
          title={getTranslatedText('complaintTitle')} 
              options={complaintOptions}
              onOptionPress={handleOptionPress}
            />
          </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    position: 'relative',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ebf8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 4,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 4,
    color: '#2c5282',
    fontSize: 16,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4a5568',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c5282',
    marginLeft: 8,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  optionText: {
    fontSize: 16,
    color: '#495057',
    flex: 1,
  },
  documentItem: {
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  documentText: {
    fontSize: 16,
    color: '#2d3748',
    lineHeight: 24,
  },
  documentNote: {
    fontSize: 14,
    color: '#718096',
    marginTop: 5,
    paddingLeft: 10,
    fontStyle: 'italic',
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5282',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  contentWrapper: {
    flex: 1,
  },
  actionButtonsContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c5282',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  electronicButton: {
    backgroundColor: '#38a169',
  },
  actionButtonTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  actionButtonTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionButtonDesc: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.9,
  },
});

export default DocsScreen;