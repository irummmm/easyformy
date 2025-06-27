import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { useLanguage } from '../context/LanguageContext';
import { translateMultipleTexts } from '../utils/translation';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = 'http://192.168.35.173:5000';

const RegistrationFormScreen = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [showPdfButton, setShowPdfButton] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const scrollViewRef = useRef();
  const [isDownloading, setIsDownloading] = useState(false);
  const { languageCode } = useLanguage();
  const [translatedQuestions, setTranslatedQuestions] = useState([]);
  const [translatedOptions, setTranslatedOptions] = useState({});
  const [isTranslating, setIsTranslating] = useState(true);

  const questions = [
    { id: 'registration_type', text: '외국인 등록에 해당하십니까? (Y/N)' },
    { id: 'reissuance', text: '등록증 재발급에 해당하십니까? (Y/N)' },
    { id: 'extension', text: '체류기간 연장허가에 해당하십니까? (Y/N)' },
    { id: 'change_status', text: '체류자격 변경하기에 해당하십니까? (Y/N)' },
    { id: 'status_to_apply1', text: '희망자격은 무엇입니까?', condition: (data) => data['CHANGE  OF  STATUS  OF  SOJOURN'] === 'y' },
    { id: 'granting_status', text: '체류자격 부여에 해당하십니까? (Y/N)' },
    { id: 'status_to_apply2', text: '희망자격은 무엇입니까?', condition: (data) => data['GRANTING  STATUS  OF  SOJOURN'] === 'y' },
    { id: 'engage_activities', text: '체류자격 외 활동허가에 해당하십니까? (Y/N)' },
    { id: 'status_to_apply3', text: '희망자격은 무엇입니까?', condition: (data) => data['ENGAGE IN ACTIVITIES NOT COVERED BY THE STATUS OF SOJOURN'] === 'y' },
    { id: 'change_workplace', text: '근무처 변경ㆍ추가허가 / 신고에 해당하십니까? (Y/N)' },
    { id: 'reentry_permit', text: '재입국허가 (단수, 복수) 에 해당하십니까? (Y/N)' },
    { id: 'alteration_residence', text: '체류지 변경신고에 해당하십니까? (Y/N)' },
    { id: 'change_info', text: '등록사항 변경신고에 해당하십니까? (Y/N)' },
    { id: 'surname', text: '성을 입력하세요.' },
    { id: 'givenname', text: '이름을 입력하세요.' },
    { id: 'birth_year', text: '생년을 입력하세요.' },
    { id: 'birth_month', text: '생월을 입력하세요.' },
    { id: 'birth_day', text: '생일을 입력하세요.' },
    { id: 'gender', text: '성별을 선택하세요. (1: 남자, 2: 여자)' },
    { id: 'nationality', text: '국적을 입력하세요.' },
    { id: 'passport_number', text: '여권 번호를 입력하세요.' },
    { id: 'passport_issue_date', text: '여권 발급일자를 입력하세요.' },
    { id: 'passport_expiry_date', text: '여권 유효기간을 입력하세요.' },
    { id: 'address_korea', text: '대한민국 내 주소를 입력하세요.' },
    { id: 'phone', text: '전화번호를 입력하세요.' },
    { id: 'cell_phone', text: '휴대전화를 입력하세요.' },
    { id: 'address_home', text: '본국주소를 입력하세요.' },
    { id: 'phone_home', text: '본국 전화번호를 입력하세요.' },
    { id: 'school_status', text: '재학여부를 선택하세요(1: 미취학, 2: 초등학생, 3: 중학생, 4: 고등학생)' },
    { id: 'school_name', text: '학교이름을 입력하세요.', condition: (data) => ['2', '3', '4'].includes(data.school_status) },
    { id: 'school_phone', text: '학교전화번호를 입력하세요.', condition: (data) => ['2', '3', '4'].includes(data.school_status) },
    { id: 'school_type', text: '학교 종류를 입력하세요(1: 교육청 인가 학교, 2: 교육청 비인가/대안학교)', condition: (data) => ['2', '3', '4'].includes(data.school_status) },
    { id: 'workplace_current', text: '현 근무처를 입력하세요.' },
    { id: 'workplace_registration1', text: '현 근무처 사업자등록번호를 입력하세요.' },
    { id: 'workplace_phone1', text: '현 근무처 전화번호를 입력하세요.' },
    { id: 'workplace_new', text: '새로운 예정 근무처를 입력하세요.' },
    { id: 'workplace_registration2', text: '새로운 예정 근무처의 사업자등록번호를 입력하세요.' },
    { id: 'workplace_phone2', text: '새로운 예정 근무처의 전화번호를 입력하세요.' },
    { id: 'annual_income', text: '연 소득금액을 입력하세요(만원).' },
    { id: 'occupation', text: '직업을 입력하세요.' },
    { id: 'reentry_period', text: '재입국 신청 기간을 입력하세요.' },
    { id: 'email', text: '전자우편을 입력하세요.' },
    { id: 'bank_account', text: '반환용 계좌번호를 입력하세요.' },
    { id: 'application_date', text: '신청일을 입력하세요.' }
  ];

  // 선택지 텍스트 정의
  const optionTexts = {
    yes: '예',
    no: '아니오',
    male: '남자',
    female: '여자',
    notEnrolled: '미취학',
    elementary: '초등학생',
    middle: '중학생',
    high: '고등학생',
    authorizedSchool: '교육청 인가 학교',
    unauthorizedSchool: '교육청 비인가/대안학교'
  };

  useEffect(() => {
    async function translateQuestions() {
      setIsTranslating(true);
      try {
        if (languageCode === 'ko') {
          setTranslatedQuestions(questions);
          setTranslatedOptions(optionTexts);
        } else {
          const questionTexts = questions.map(q => q.text);
          const translatedQuestionTexts = await translateMultipleTexts(
            Object.fromEntries(questionTexts.map((text, index) => [index, text])),
            languageCode
          );

          const translatedOptions = await translateMultipleTexts(optionTexts, languageCode);

          const translated = questions.map((q, index) => ({
            ...q,
            text: translatedQuestionTexts[index] || q.text
          }));

          setTranslatedQuestions(translated);
          setTranslatedOptions(translatedOptions);
        }
      } catch (error) {
        console.error('Translation error:', error);
        setTranslatedQuestions(questions);
        setTranslatedOptions(optionTexts);
      } finally {
        setIsTranslating(false);
      }
    }
    translateQuestions();
  }, [languageCode]);

  useEffect(() => {
    if (!isTranslating && translatedQuestions.length > 0) {
      setMessages([{ type: 'bot', text: translatedQuestions[0].text }]);
    }
  }, [translatedQuestions, isTranslating]);

  const getNextQuestion = (currentIndex) => {
    if (!translatedQuestions?.length) return 0;
    
    let nextIndex = currentIndex + 1;
    while (nextIndex < translatedQuestions.length) {
      const question = translatedQuestions[nextIndex];
      if (!question?.condition || question.condition(formData)) {
        return nextIndex;
      }
      nextIndex++;
    }
    return nextIndex;
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || !translatedQuestions.length || !translatedQuestions[currentQuestion]) {
      return;
    }

    const currentQ = translatedQuestions[currentQuestion];
    let value = inputValue.trim();

    // 특수 필드 처리
    if (currentQ.id === 'registration_type') {
      formData['FOREIGN  RESIDENT  REGISTRATION'] = value.toLowerCase() === 'y' ? 'y' : 'n';
    } else if (currentQ.id === 'reissuance') {
      formData['REISSUANCE OF REGISTRATION CARD'] = value.toLowerCase() === 'y' ? 'y' : 'n';
    } else if (currentQ.id === 'extension') {
      formData['EXTENSION  OF  SOJOURN  PERIOD'] = value.toLowerCase() === 'y' ? 'y' : 'n';
    } else if (currentQ.id === 'change_status') {
      formData['CHANGE  OF  STATUS  OF  SOJOURN'] = value.toLowerCase() === 'y' ? 'y' : 'n';
    } else if (currentQ.id === 'status_to_apply1') {
      formData['Status to apply for1'] = value;
    } else if (currentQ.id === 'granting_status') {
      formData['GRANTING  STATUS  OF  SOJOURN'] = value.toLowerCase() === 'y' ? 'y' : 'n';
    } else if (currentQ.id === 'status_to_apply2') {
      formData['Status to apply for2'] = value;
    } else if (currentQ.id === 'engage_activities') {
      formData['ENGAGE IN ACTIVITIES NOT COVERED BY THE STATUS OF SOJOURN'] = value.toLowerCase() === 'y' ? 'y' : 'n';
    } else if (currentQ.id === 'status_to_apply3') {
      formData['Status to apply for3'] = value;
    } else if (currentQ.id === 'change_workplace') {
      formData['CHANGE  OR  ADDITION  OF  WORKPLACE'] = value.toLowerCase() === 'y' ? 'y' : 'n';
    } else if (currentQ.id === 'reentry_permit') {
      formData['REENTRY  PERMIT  (SINGLE,  MULTIPLE)'] = value.toLowerCase() === 'y' ? 'y' : 'n';
    } else if (currentQ.id === 'alteration_residence') {
      formData['ALTERATION  OF  RESIDENCE'] = value.toLowerCase() === 'y' ? 'y' : 'n';
    } else if (currentQ.id === 'change_info') {
      formData['CHANGE OF INFORMATION ON REGISTRATION'] = value.toLowerCase() === 'y' ? 'y' : 'n';
    } else if (currentQ.id === 'gender') {
      if (value === '1') {
        formData['boy'] = 'y';
        formData['girl'] = 'n';
      } else if (value === '2') {
        formData['boy'] = 'n';
        formData['girl'] = 'y';
      }
    } else if (currentQ.id === 'school_status') {
      formData['Non-school'] = value === '1' ? 'y' : 'n';
      formData['Elementary'] = value === '2' ? 'y' : 'n';
      formData['Middle'] = value === '3' ? 'y' : 'n';
      formData['High'] = value === '4' ? 'y' : 'n';
    } else if (currentQ.id === 'school_type') {
      formData['Accredited school by Education Office'] = value === '1' ? 'y' : 'n';
      formData['Non-accredited, Alternative school'] = value === '2' ? 'y' : 'n';
    } else if (currentQ.id === 'birth_year' || currentQ.id === 'birth_month' || currentQ.id === 'birth_day') {
      formData[currentQ.id] = value;
      if (formData.birth_year && formData.birth_month && formData.birth_day) {
        formData.birth_date = `${formData.birth_year}-${formData.birth_month}-${formData.birth_day}`;
      }
    } else {
      formData[currentQ.id] = value;
    }

    setMessages(prev => [...prev, { type: 'user', text: value }]);
    setInputValue('');

    if (currentQuestion === translatedQuestions.length - 1) {
      setLoading(true);
      try {
        if (!formData.name) {
          if (formData.name_kor) {
            formData.name = formData.name_kor;
          } else if (formData.surname && formData.givenname) {
            formData.name = `${formData.surname} ${formData.givenname}`;
          } else if (formData.surname) {
            formData.name = formData.surname;
          } else if (formData.givenname) {
            formData.name = formData.givenname;
          }
        }

        if (!formData.name) {
          throw new Error('이름 정보가 누락되었습니다.');
        }

        console.log('Final form data before sending:', formData);

        const response = await axios.post(`${SERVER_URL}/api/generate-registration-pdf`, formData, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        });

        if (response.data.success) {
          setPdfUrl(`${SERVER_URL}/uploads/registration_filled.pdf`);
          setShowPdfButton(true);
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: '외국인 등록신청서가 성공적으로 생성되었습니다.' 
          }]);
        } else {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: `PDF 생성 중 오류가 발생했습니다: ${response.data.message}` 
          }]);
        }
      } catch (error) {
        console.error('Error:', error);
        let errorMessage = 'PDF 생성 중 오류가 발생했습니다.';
        
        if (error.code === 'ECONNABORTED') {
          errorMessage = '서버 응답 시간이 초과되었습니다.';
        } else if (error.code === 'ERR_NETWORK') {
          errorMessage = '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.';
        } else if (error.response) {
          errorMessage = `서버 오류: ${error.response.data.message || error.response.statusText}`;
        }
        
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: errorMessage
        }]);
      }
      setLoading(false);
    } else {
      const nextQuestionIndex = getNextQuestion(currentQuestion);
      setCurrentQuestion(nextQuestionIndex);
      if (translatedQuestions[nextQuestionIndex]?.text) {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: translatedQuestions[nextQuestionIndex].text 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: 'Error loading next question. Please try again.' 
        }]);
      }
    }
  };

  const handleViewPdf = () => {
    setShowPdf(true);
  };

  const handleBack = () => {
    setShowPdf(false);
  };

  const downloadPDF = async () => {
    try {
      setIsDownloading(true);

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('권한 필요', 'PDF를 다운로드하기 위해 저장소 접근 권한이 필요합니다.');
          return;
        }
      }

      const filename = `registration_${new Date().getTime()}.pdf`;
      const downloadPath = Platform.select({
        ios: `${FileSystem.cacheDirectory}${filename}`,
        android: `${FileSystem.documentDirectory}${filename}`,
      });

      const downloadResult = await FileSystem.downloadAsync(
        pdfUrl,
        downloadPath
      );

      if (downloadResult.status === 200) {
        if (Platform.OS === 'ios') {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: '외국인 등록신청서 저장하기',
            UTI: 'com.adobe.pdf'
          });
        } else {
          const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
          await MediaLibrary.createAlbumAsync('Downloads', asset, false);
          Alert.alert(
            '다운로드 완료',
            'PDF가 다운로드 폴더에 저장되었습니다.'
          );
        }

        try {
          await FileSystem.deleteAsync(downloadResult.uri);
        } catch (error) {
          console.log('임시 파일 삭제 실패:', error);
        }
      } else {
        throw new Error('다운로드 실패');
      }
    } catch (error) {
      console.error('PDF 다운로드 오류:', error);
      Alert.alert('오류', 'PDF 다운로드 중 문제가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const sharePDF = async () => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('공유 불가', '이 기기에서는 파일 공유가 지원되지 않습니다.');
        return;
      }

      const filename = `registration_${new Date().getTime()}.pdf`;
      const downloadPath = Platform.select({
        ios: `${FileSystem.cacheDirectory}${filename}`,
        android: `${FileSystem.documentDirectory}${filename}`,
      });

      const downloadResult = await FileSystem.downloadAsync(
        pdfUrl,
        downloadPath
      );

      if (downloadResult.status === 200) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: '외국인 등록신청서 공유하기',
          UTI: 'com.adobe.pdf'
        });

        try {
          await FileSystem.deleteAsync(downloadResult.uri);
        } catch (error) {
          console.log('임시 파일 삭제 실패:', error);
        }
      } else {
        throw new Error('공유 실패');
      }
    } catch (error) {
      console.error('PDF 공유 오류:', error);
      Alert.alert('오류', 'PDF 공유 중 문제가 발생했습니다.');
    }
  };

  const renderInputField = () => {
    if (!translatedQuestions.length || !translatedQuestions[currentQuestion]) return null;
    const currentQ = translatedQuestions[currentQuestion];
    
    if (currentQ.id === 'registration_type' || currentQ.id === 'reissuance' || 
        currentQ.id === 'extension' || currentQ.id === 'change_status' ||
        currentQ.id === 'granting_status' || currentQ.id === 'engage_activities' ||
        currentQ.id === 'change_workplace' || currentQ.id === 'reentry_permit' ||
        currentQ.id === 'alteration_residence' || currentQ.id === 'change_info') {
      return (
        <View style={styles.selectionContainer}>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === 'Y' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('Y')}
          >
            <Text style={[styles.selectionButtonText, inputValue === 'Y' && styles.selectionButtonTextSelected]}>
              {translatedOptions.yes || optionTexts.yes}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === 'N' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('N')}
          >
            <Text style={[styles.selectionButtonText, inputValue === 'N' && styles.selectionButtonTextSelected]}>
              {translatedOptions.no || optionTexts.no}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (currentQ.id === 'gender') {
      return (
        <View style={styles.selectionContainer}>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === '1' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('1')}
          >
            <Text style={[styles.selectionButtonText, inputValue === '1' && styles.selectionButtonTextSelected]}>
              {translatedOptions.male || optionTexts.male}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === '2' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('2')}
          >
            <Text style={[styles.selectionButtonText, inputValue === '2' && styles.selectionButtonTextSelected]}>
              {translatedOptions.female || optionTexts.female}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (currentQ.id === 'school_status') {
      return (
        <View style={styles.selectionContainer}>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === '1' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('1')}
          >
            <Text style={[styles.selectionButtonText, inputValue === '1' && styles.selectionButtonTextSelected]}>
              {translatedOptions.notEnrolled || optionTexts.notEnrolled}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === '2' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('2')}
          >
            <Text style={[styles.selectionButtonText, inputValue === '2' && styles.selectionButtonTextSelected]}>
              {translatedOptions.elementary || optionTexts.elementary}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === '3' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('3')}
          >
            <Text style={[styles.selectionButtonText, inputValue === '3' && styles.selectionButtonTextSelected]}>
              {translatedOptions.middle || optionTexts.middle}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === '4' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('4')}
          >
            <Text style={[styles.selectionButtonText, inputValue === '4' && styles.selectionButtonTextSelected]}>
              {translatedOptions.high || optionTexts.high}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (currentQ.id === 'school_type') {
      return (
        <View style={styles.selectionContainer}>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === '1' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('1')}
          >
            <Text style={[styles.selectionButtonText, inputValue === '1' && styles.selectionButtonTextSelected]}>
              {translatedOptions.authorizedSchool || optionTexts.authorizedSchool}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === '2' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('2')}
          >
            <Text style={[styles.selectionButtonText, inputValue === '2' && styles.selectionButtonTextSelected]}>
              {translatedOptions.unauthorizedSchool || optionTexts.unauthorizedSchool}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TextInput
        style={styles.input}
        value={inputValue}
        onChangeText={setInputValue}
        placeholder={currentQ.text}
        placeholderTextColor="#a0aec0"
      />
    );
  };

  if (isTranslating) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c5282" />
          <Text style={styles.loadingText}>
            {languageCode === 'ko' ? '질문을 불러오는 중...' : 'Loading questions...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showPdf) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pdfHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2c5282" />
          </TouchableOpacity>
          <View style={styles.pdfHeaderContent}>
            <Text style={styles.pdfHeaderTitle}>외국인 등록신청서 미리보기</Text>
            <Text style={styles.pdfHeaderSubtitle}>생성된 신청서를 확인하세요</Text>
          </View>
          <TouchableOpacity 
            style={[styles.downloadButton, isDownloading && styles.downloadButtonDisabled]}
            onPress={downloadPDF}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#2c5282" />
            ) : (
              <Ionicons name="download-outline" size={24} color="#2c5282" />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.pdfContainer}>
          <WebView 
            source={{ uri: pdfUrl }} 
            style={styles.webview}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.pdfLoadingContainer}>
                <ActivityIndicator size="large" color="#2c5282" />
                <Text style={styles.pdfLoadingText}>PDF 로딩 중...</Text>
              </View>
            )}
          />
        </View>
        <View style={styles.pdfFooter}>
          <TouchableOpacity 
            style={styles.pdfFooterButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={20} color="#2c5282" />
            <Text style={styles.pdfFooterButtonText}>이전으로</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.pdfFooterButton, styles.pdfFooterButtonPrimary]}
            onPress={sharePDF}
          >
            <Ionicons name="share-outline" size={20} color="#ffffff" />
            <Text style={[styles.pdfFooterButtonText, styles.pdfFooterButtonTextPrimary]}>
              공유하기
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="document-text" size={24} color="#2c5282" />
        </View>
        <Text style={styles.headerTitle}>외국인 등록신청서 작성</Text>
        <Text style={styles.headerSubtitle}>
          {currentQuestion + 1} / {translatedQuestions.length} 질문
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.messageBubble,
                msg.type === 'user' ? styles.userBubble : styles.botBubble,
              ]}
            >
              <Text style={[
                styles.messageText,
                msg.type === 'user' ? styles.userMessageText : styles.botMessageText
              ]}>
                {msg.text}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2c5282" />
              <Text style={styles.loadingText}>PDF 생성 중...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            {renderInputField()}
            <TouchableOpacity
              style={[styles.sendButton, !inputValue.trim() && styles.sendButtonDisabled]}
              onPress={handleSubmit}
              disabled={!inputValue.trim() || loading}
            >
              <Ionicons name="send" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {showPdfButton && (
          <TouchableOpacity 
            style={styles.viewPdfButton} 
            onPress={handleViewPdf}
          >
            <Text style={styles.viewPdfButtonText}>신청서 보기</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
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
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#4a5568',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubble: {
    padding: 16,
    borderRadius: 16,
    marginVertical: 6,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  botBubble: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#2c5282',
  },
  userBubble: {
    backgroundColor: '#2c5282',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  botMessageText: {
    color: '#2d3748',
  },
  userMessageText: {
    color: '#ffffff',
  },
  inputWrapper: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendButton: {
    backgroundColor: '#2c5282',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#2c5282',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4a5568',
  },
  viewPdfButton: {
    backgroundColor: '#2c5282',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewPdfButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 12,
    zIndex: 1,
  },
  pdfHeader: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pdfHeaderContent: {
    flex: 1,
    alignItems: 'center',
  },
  pdfHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 4,
  },
  pdfHeaderSubtitle: {
    fontSize: 13,
    color: '#4a5568',
  },
  downloadButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  downloadButtonDisabled: {
    opacity: 0.5,
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  webview: {
    flex: 1,
  },
  pdfLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4a5568',
  },
  pdfFooter: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pdfFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pdfFooterButtonPrimary: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
  },
  pdfFooterButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2c5282',
    fontWeight: '500',
  },
  pdfFooterButtonTextPrimary: {
    color: '#ffffff',
  },
  selectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
    marginRight: 10,
  },
  selectionButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionButtonSelected: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
  },
  selectionButtonText: {
    fontSize: 15,
    color: '#4a5568',
    fontWeight: '500',
  },
  selectionButtonTextSelected: {
    color: '#ffffff',
  },
});

export default RegistrationFormScreen; 