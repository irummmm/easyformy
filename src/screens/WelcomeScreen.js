import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLanguage } from '../context/LanguageContext';
import { translateMultipleTexts } from '../utils/translation';

// Azure Translator 설정
const AZURE_TRANSLATOR_KEY = '9kmogdvJYnnc7xMGvA291bO9blq8lTzZeMjpQeHaG7WmYehUZBOHJQQJ99BEACYeBjFXJ3w3AAAbACOGkRAG';
const AZURE_TRANSLATOR_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';
const AZURE_TRANSLATOR_LOCATION = 'eastus';

// Azure Translator 지원 언어 목록
const supportedLanguages = {
  // 주요 언어 (상단에 표시)
  'Korean': 'ko',
  'English': 'en',
  'Japanese': 'ja',
  'Chinese (Simplified)': 'zh-Hans',
  'Vietnamese': 'vi',
  'Thai': 'th',
  'Indonesian': 'id',
  'Malay': 'ms',
  'Tagalog': 'tl',
  'Nepali': 'ne',
  
  // 기타 지원 언어 (알파벳 순)
  'Afrikaans': 'af',
  'Albanian': 'sq',
  'Amharic': 'am',
  'Arabic': 'ar',
  'Armenian': 'hy',
  'Azerbaijani': 'az',
  'Bengali': 'bn',
  'Bosnian': 'bs',
  'Bulgarian': 'bg',
  'Catalan': 'ca',
  'Croatian': 'hr',
  'Czech': 'cs',
  'Danish': 'da',
  'Dutch': 'nl',
  'Estonian': 'et',
  'Finnish': 'fi',
  'French': 'fr',
  'Georgian': 'ka',
  'German': 'de',
  'Greek': 'el',
  'Gujarati': 'gu',
  'Haitian Creole': 'ht',
  'Hebrew': 'he',
  'Hindi': 'hi',
  'Hungarian': 'hu',
  'Icelandic': 'is',
  'Irish': 'ga',
  'Italian': 'it',
  'Kannada': 'kn',
  'Kazakh': 'kk',
  'Khmer': 'km',
  'Lao': 'lo',
  'Latvian': 'lv',
  'Lithuanian': 'lt',
  'Luxembourgish': 'lb',
  'Macedonian': 'mk',
  'Malagasy': 'mg',
  'Malayalam': 'ml',
  'Maltese': 'mt',
  'Maori': 'mi',
  'Marathi': 'mr',
  'Mongolian': 'mn',
  'Myanmar': 'my',
  'Norwegian': 'nb',
  'Odia': 'or',
  'Pashto': 'ps',
  'Persian': 'fa',
  'Polish': 'pl',
  'Portuguese': 'pt',
  'Punjabi': 'pa',
  'Romanian': 'ro',
  'Russian': 'ru',
  'Samoan': 'sm',
  'Serbian': 'sr',
  'Sesotho': 'st',
  'Shona': 'sn',
  'Sindhi': 'sd',
  'Sinhala': 'si',
  'Slovak': 'sk',
  'Slovenian': 'sl',
  'Somali': 'so',
  'Spanish': 'es',
  'Sundanese': 'su',
  'Swahili': 'sw',
  'Swedish': 'sv',
  'Tamil': 'ta',
  'Telugu': 'te',
  'Turkish': 'tr',
  'Ukrainian': 'uk',
  'Urdu': 'ur',
  'Uzbek': 'uz',
  'Welsh': 'cy',
  'Xhosa': 'xh',
  'Yiddish': 'yi',
  'Yoruba': 'yo',
  'Zulu': 'zu'
};

// 번역이 필요한 텍스트
const textsToTranslate = {
  welcome: 'Welcome to Korea!',
  welcomeWithName: 'Welcome to Korea, {name}!',
  selectLanguage: 'Please select your language:',
  continue: 'Continue',
  // 추가 텍스트들
  chat: 'Chat',
  docs: 'Documents',
  myPage: 'My Page',
  settings: 'Settings',
  profile: 'Profile',
  logout: 'Logout',
  search: 'Search',
  notifications: 'Notifications',
  help: 'Help',
  about: 'About',
  feedback: 'Feedback',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  contact: 'Contact Us',
  version: 'Version',
  language: 'Language',
  theme: 'Theme',
  darkMode: 'Dark Mode',
  lightMode: 'Light Mode',
  systemDefault: 'System Default'
};

export default function WelcomeScreen({ navigation, route }) {
  const [country, setCountry] = useState('Vietnam');
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { language, languageCode, updateLanguage } = useLanguage();
  const userInfo = route.params?.userInfo;
  const userName = userInfo?.name;

  // 언어가 변경될 때마다 번역 실행
  useEffect(() => {
    const translateAllTexts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const translatedTexts = await translateMultipleTexts(textsToTranslate, languageCode);
        setTranslations(translatedTexts);
      } catch (err) {
        console.error('Translation error:', err);
        setError('Translation failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    translateAllTexts();
  }, [languageCode]);

  const handleLanguageChange = async (newLanguage) => {
    try {
      setIsLoading(true);
      const newLanguageCode = supportedLanguages[newLanguage];
      updateLanguage(newLanguage, newLanguageCode);
      
      // 선택한 언어로 모든 텍스트 번역
      const translatedTexts = await translateMultipleTexts(textsToTranslate, newLanguageCode);
      setTranslations(translatedTexts);
    } catch (err) {
      console.error('Language change error:', err);
      setError('Failed to change language. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    try {
      setIsLoading(true);
      // 번역이 완료될 때까지 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 500));
      
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
            params: { 
              screen: 'MyPage', 
              params: { 
                country, 
                language,
                translations,
              userInfo: {
                ...userInfo,
                applicationsSummary: null
              }
              },
            },
        },
      ],
    });
    } catch (error) {
      console.error('Navigation error:', error);
      setError('Failed to proceed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{translations.translating || 'Translating...'}</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          {userName 
            ? (translations.welcomeWithName || textsToTranslate.welcomeWithName).replace('{name}', userName)
            : (translations.welcome || textsToTranslate.welcome)
          }
        </Text>
        <Text style={styles.subtitle}>{translations.selectLanguage || textsToTranslate.selectLanguage}</Text>
        
        {error && <Text style={styles.errorText}>{error}</Text>}
        
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={language}
            onValueChange={handleLanguageChange}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            {Object.entries(supportedLanguages).map(([langName, langCode]) => (
              <Picker.Item key={langCode} label={langName} value={langName} />
            ))}
      </Picker>
        </View>

        <View style={styles.buttonContainer}>
          <Button 
            title={translations.continue || textsToTranslate.continue} 
            onPress={handleContinue}
            color="#007AFF"
          />
        </View>
    </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    justifyContent: 'center',
    minHeight: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  pickerContainer: {
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  pickerItem: {
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
