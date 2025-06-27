import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DocumentUploader from '../components/DocumentUploader';
import { useLanguage } from '../context/LanguageContext';
import { translateMultipleTexts } from '../utils/translation';

const documentLists = {
  e8Registration: {
    title: {
      ko: 'E-8 비자 외국인등록 필요서류',
      en: 'E-8 Visa Foreigner Registration Required Documents'
    },
    documents: [
      {
        ko: '외국인등록신청서 1부',
        en: 'Foreigner Registration Application Form (1 copy)',
        description: {
          ko: '외국인등록신청서와 여권, 사진, 수수료를 포함한 기본 서류',
          en: 'Basic documents including application form, passport, photo, and fee'
        }
      },
      {
        ko: '여권 및 사증 1부',
        en: 'Passport and Visa (1 copy)',
        description: {
          ko: '유효한 여권과 사증이 필요합니다',
          en: 'Valid passport and visa are required'
        }
      },
      {
        ko: '사진 1매 (3.5cm x 4.5cm)',
        en: 'Photo (3.5cm x 4.5cm, 1 piece)',
        description: {
          ko: '최근 6개월 이내 촬영한 여권용 사진',
          en: 'Passport photo taken within the last 6 months'
        }
      },
      {
        ko: '고용계약서 1부',
        en: 'Employment Contract (1 copy)',
        description: {
          ko: '고용주와 체결한 고용계약서 원본',
          en: 'Original employment contract signed with employer'
        }
      },
      {
        ko: '사업자등록증 사본 1부',
        en: 'Business Registration Certificate Copy (1 copy)',
        description: {
          ko: '고용주의 사업자등록증 사본',
          en: 'Copy of employer\'s business registration certificate'
        }
      },
      {
        ko: '고용주 신분증 사본 1부',
        en: 'Employer ID Card Copy (1 copy)',
        description: {
          ko: '고용주의 신분증 사본',
          en: 'Copy of employer\'s ID card'
        }
      }
    ]
  },
  e8Extension: {
    title: {
      ko: 'E-8 비자 체류기간 연장 필요서류',
      en: 'E-8 Visa Stay Period Extension Required Documents'
    },
    documents: [
      {
        ko: '체류기간 연장허가 신청서 1부',
        en: 'Stay Period Extension Application Form (1 copy)',
        description: {
          ko: '체류기간 연장허가 신청서와 수수료',
          en: 'Stay period extension application form and fee'
        }
      },
      {
        ko: '여권 및 외국인등록증 1부',
        en: 'Passport and Alien Registration Card (1 copy)',
        description: {
          ko: '유효한 여권과 외국인등록증',
          en: 'Valid passport and alien registration card'
        }
      },
      {
        ko: '고용계약서 1부',
        en: 'Employment Contract (1 copy)',
        description: {
          ko: '연장된 고용계약서 원본',
          en: 'Original extended employment contract'
        }
      },
      {
        ko: '사업자등록증 사본 1부',
        en: 'Business Registration Certificate Copy (1 copy)',
        description: {
          ko: '고용주의 사업자등록증 사본',
          en: 'Copy of employer\'s business registration certificate'
        }
      },
      {
        ko: '고용주 신분증 사본 1부',
        en: 'Employer ID Card Copy (1 copy)',
        description: {
          ko: '고용주의 신분증 사본',
          en: 'Copy of employer\'s ID card'
        }
      },
      {
        ko: '재직증명서 1부',
        en: 'Employment Certificate (1 copy)',
        description: {
          ko: '현재 재직 중임을 증명하는 서류',
          en: 'Document proving current employment'
        }
      }
    ]
  },
  e8WorkplaceChange: {
    title: {
      ko: 'E-8 비자 사업장 변경 필요서류',
      en: 'E-8 Visa Workplace Change Required Documents'
    },
    documents: [
      {
        ko: '사업장 변경 신청서 1부',
        en: 'Workplace Change Application Form (1 copy)',
        description: {
          ko: '사업장 변경 신청서와 수수료',
          en: 'Workplace change application form and fee'
        }
      },
      {
        ko: '여권 및 외국인등록증 1부',
        en: 'Passport and Alien Registration Card (1 copy)',
        description: {
          ko: '유효한 여권과 외국인등록증',
          en: 'Valid passport and alien registration card'
        }
      },
      {
        ko: '새 고용계약서 1부',
        en: 'New Employment Contract (1 copy)',
        description: {
          ko: '새 고용주와 체결한 고용계약서 원본',
          en: 'Original employment contract signed with new employer'
        }
      },
      {
        ko: '새 사업자등록증 사본 1부',
        en: 'New Business Registration Certificate Copy (1 copy)',
        description: {
          ko: '새 고용주의 사업자등록증 사본',
          en: 'Copy of new employer\'s business registration certificate'
        }
      },
      {
        ko: '새 고용주 신분증 사본 1부',
        en: 'New Employer ID Card Copy (1 copy)',
        description: {
          ko: '새 고용주의 신분증 사본',
          en: 'Copy of new employer\'s ID card'
        }
      },
      {
        ko: '이전 고용주 재직증명서 1부',
        en: 'Previous Employer Employment Certificate (1 copy)',
        description: {
          ko: '이전 고용주로부터 발급받은 재직증명서',
          en: 'Employment certificate issued by previous employer'
        }
      }
    ]
  },
  e9Registration: {
    title: {
      ko: 'E-9 비자 외국인등록 필요서류',
      en: 'E-9 Visa Foreigner Registration Required Documents'
    },
    documents: [
      {
        ko: '외국인등록신청서 1부',
        en: 'Foreigner Registration Application Form (1 copy)',
        description: {
          ko: '외국인등록신청서와 여권, 사진, 수수료를 포함한 기본 서류',
          en: 'Basic documents including application form, passport, photo, and fee'
        }
      },
      {
        ko: '여권 및 사증 1부',
        en: 'Passport and Visa (1 copy)',
        description: {
          ko: '유효한 여권과 사증이 필요합니다',
          en: 'Valid passport and visa are required'
        }
      },
      {
        ko: '사진 1매 (3.5cm x 4.5cm)',
        en: 'Photo (3.5cm x 4.5cm, 1 piece)',
        description: {
          ko: '최근 6개월 이내 촬영한 여권용 사진',
          en: 'Passport photo taken within the last 6 months'
        }
      },
      {
        ko: '고용계약서 1부',
        en: 'Employment Contract (1 copy)',
        description: {
          ko: '고용주와 체결한 고용계약서 원본',
          en: 'Original employment contract signed with employer'
        }
      },
      {
        ko: '사업자등록증 사본 1부',
        en: 'Business Registration Certificate Copy (1 copy)',
        description: {
          ko: '고용주의 사업자등록증 사본',
          en: 'Copy of employer\'s business registration certificate'
        }
      },
      {
        ko: '고용주 신분증 사본 1부',
        en: 'Employer ID Card Copy (1 copy)',
        description: {
          ko: '고용주의 신분증 사본',
          en: 'Copy of employer\'s ID card'
        }
      }
    ]
  },
  e9WorkplaceChange: {
    title: {
      ko: 'E-9 비자 사업장 변경 필요서류',
      en: 'E-9 Visa Workplace Change Required Documents'
    },
    documents: [
      {
        ko: '사업장 변경 신청서 1부',
        en: 'Workplace Change Application Form (1 copy)',
        description: {
          ko: '사업장 변경 신청서와 수수료',
          en: 'Workplace change application form and fee'
        }
      },
      {
        ko: '여권 및 외국인등록증 1부',
        en: 'Passport and Alien Registration Card (1 copy)',
        description: {
          ko: '유효한 여권과 외국인등록증',
          en: 'Valid passport and alien registration card'
        }
      },
      {
        ko: '새 고용계약서 1부',
        en: 'New Employment Contract (1 copy)',
        description: {
          ko: '새 고용주와 체결한 고용계약서 원본',
          en: 'Original employment contract signed with new employer'
        }
      },
      {
        ko: '새 사업자등록증 사본 1부',
        en: 'New Business Registration Certificate Copy (1 copy)',
        description: {
          ko: '새 고용주의 사업자등록증 사본',
          en: 'Copy of new employer\'s business registration certificate'
        }
      },
      {
        ko: '새 고용주 신분증 사본 1부',
        en: 'New Employer ID Card Copy (1 copy)',
        description: {
          ko: '새 고용주의 신분증 사본',
          en: 'Copy of new employer\'s ID card'
        }
      },
      {
        ko: '이전 고용주 재직증명서 1부',
        en: 'Previous Employer Employment Certificate (1 copy)',
        description: {
          ko: '이전 고용주로부터 발급받은 재직증명서',
          en: 'Employment certificate issued by previous employer'
        }
      }
    ]
  },
  e9Extension: {
    title: {
      ko: 'E-9 비자 체류기간 연장 필요서류',
      en: 'E-9 Visa Stay Period Extension Required Documents'
    },
    documents: [
      {
        ko: '체류기간 연장허가 신청서 1부',
        en: 'Stay Period Extension Application Form (1 copy)',
        description: {
          ko: '체류기간 연장허가 신청서와 수수료',
          en: 'Stay period extension application form and fee'
        }
      },
      {
        ko: '여권 및 외국인등록증 1부',
        en: 'Passport and Alien Registration Card (1 copy)',
        description: {
          ko: '유효한 여권과 외국인등록증',
          en: 'Valid passport and alien registration card'
        }
      },
      {
        ko: '고용계약서 1부',
        en: 'Employment Contract (1 copy)',
        description: {
          ko: '연장된 고용계약서 원본',
          en: 'Original extended employment contract'
        }
      },
      {
        ko: '사업자등록증 사본 1부',
        en: 'Business Registration Certificate Copy (1 copy)',
        description: {
          ko: '고용주의 사업자등록증 사본',
          en: 'Copy of employer\'s business registration certificate'
        }
      },
      {
        ko: '고용주 신분증 사본 1부',
        en: 'Employer ID Card Copy (1 copy)',
        description: {
          ko: '고용주의 신분증 사본',
          en: 'Copy of employer\'s ID card'
        }
      },
      {
        ko: '재직증명서 1부',
        en: 'Employment Certificate (1 copy)',
        description: {
          ko: '현재 재직 중임을 증명하는 서류',
          en: 'Document proving current employment'
        }
      }
    ]
  }
};

const DocsDetailScreen = ({ route, navigation }) => {
  const { type } = route.params;
  const { languageCode } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [displayData, setDisplayData] = useState({
    title: '',
    documents: []
  });
  const [showUploader, setShowUploader] = useState(false);

  const handleBack = () => {
    if (showUploader) {
      setShowUploader(false);
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    const setupDisplayData = () => {
      try {
        const selectedList = documentLists[type];
        if (!selectedList) {
          console.error('Invalid document type:', type);
          setIsLoading(false);
          return;
        }

        // 언어에 따라 텍스트 설정
        const isEnglish = languageCode === 'en';
        
        // 제목 설정
        const titleText = isEnglish ? selectedList.title.en : selectedList.title.ko;
        
        // 문서 목록 설정
        const documentsList = selectedList.documents.map((doc, index) => ({
          id: `doc-${type}-${index}`, // 고유 ID 추가
          title: {
            ko: doc.ko,
            en: doc.en
          },
          description: doc.description || {
            ko: '',
            en: ''
          }
        }));

        setDisplayData({
          title: titleText,
          documents: documentsList
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error setting up display data:', error);
        setIsLoading(false);
      }
    };

    setupDisplayData();
  }, [type, languageCode]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c5282" />
          <Text style={styles.loadingText}>
            {languageCode === 'ko' ? '로딩 중...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!displayData.title || !displayData.documents.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {languageCode === 'ko' ? '잘못된 문서 유형입니다.' : 'Invalid document type.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#2c5282" />
        </TouchableOpacity>
        <Image 
          source={require('../assets/logo2.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
        <Text style={styles.headerTitle}>{displayData.title}</Text>
      </View>
      {showUploader ? (
        <DocumentUploader
          applicationType={type}
          requiredDocs={displayData.documents}
          onApplicationSubmit={() => setShowUploader(false)}
          onUploadComplete={() => setShowUploader(false)}
        />
      ) : (
        <ScrollView style={styles.container}>
          <Text style={styles.sectionTitle}>
            {languageCode === 'ko' ? '필요 서류' : 'Required Documents'}
          </Text>
          <View style={styles.documentsList}>
            {displayData.documents.map((doc, index) => (
            <View key={doc.id} style={styles.documentItem}>
                <View style={styles.documentIcon}>
                  <Ionicons name="document-text" size={24} color="#2c5282" />
                </View>
                <View style={styles.documentContent}>
                  <Text style={styles.documentText}>
                    {languageCode === 'en' ? doc.title.en : doc.title.ko}
                  </Text>
                  {doc.description && (
                    <Text style={styles.documentDescription}>
                      {languageCode === 'en' ? doc.description.en : doc.description.ko}
                    </Text>
                  )}
                </View>
            </View>
          ))}
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => setShowUploader(true)}
            >
              <Ionicons name="document-text" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {languageCode === 'ko' ? '전자신청' : 'Electronic Application'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#38a169' }]} 
              onPress={() => navigation.navigate('VisitReservation')}
            >
              <Ionicons name="calendar" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {languageCode === 'ko' ? '방문신청' : 'Visit Application'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  backButton: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5282',
    marginLeft: 8,
  },
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c5282', marginBottom: 12 },
  documentsList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ebf8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  documentContent: {
    flex: 1,
  },
  documentText: {
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '500',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#2c5282', padding: 16, borderRadius: 12, justifyContent: 'center', gap: 8 },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e53e3e',
    textAlign: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    marginBottom: 8
  },
});

export default DocsDetailScreen; 