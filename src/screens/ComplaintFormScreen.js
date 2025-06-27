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

const SERVER_URL = 'http://192.168.35.173:5000';

const ComplaintFormScreen = () => {
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
  const [isTranslating, setIsTranslating] = useState(true);
  const [translatedOptions, setTranslatedOptions] = useState({});

  const questions = [
    { id: 'cname', text: '성명을 입력해주세요.' },
    { id: 'cResident Registration', text: '주민등록번호를 입력해주세요.' },
    { id: 'cAddress', text: '주소를 입력해주세요.' },
    { id: 'cPhone (Landline)', text: '유선전화번호를 입력해주세요. (없으면 "없음" 입력)' },
    { id: 'cPhone (Mobile)', text: '휴대전화번호를 입력해주세요.' },
    { id: 'cEmail', text: '이메일 주소를 입력해주세요. (없으면 "없음" 입력)' },
    { id: 'processStatus', text: '처리상황 알림을 받으시겠습니까? (Y/N)' },
    { id: 'laborPortal', text: '노동포털을 통해 알림을 받으시겠습니까? (Y/N)' },
    { id: 'rname', text: '피진정인 성명을 입력해주세요.' },
    { id: 'rPhone', text: '피진정인 전화번호를 입력해주세요.' },
    { id: 'rAddress', text: '피진정인 주소를 입력해주세요.' },
    { id: 'workplaceType', text: '사업장 유형을 선택해주세요. (1: 사업장, 2: 공사현장)' },
    { id: 'Name of Business', text: '사업장명을 입력해주세요.' },
    { id: 'Actual place of business', text: '사업장 주소를 입력해주세요.' },
    { id: 'rePhone', text: '사업장 전화번호를 입력해주세요.' },
    { id: 'Number of Employees', text: '근로자 수를 입력해주세요.' },
    { id: 'Date of Employment', text: '입사일을 입력해주세요. (YYYY-MM-DD)' },
    { id: 'Date of Resignation/Termination', text: '퇴사일을 입력해주세요. (YYYY-MM-DD, 재직중이면 "재직중" 입력)' },
    { id: 'Total Amount of Unpaid Wages', text: '미지급 임금 총액을 입력해주세요.' },
    { id: 'employmentStatus', text: '재직 여부를 선택해주세요. (1: 퇴사, 2: 재직중)' },
    { id: 'Amount of Unpaid Severance Pay', text: '미지급 퇴직금을 입력해주세요.' },
    { id: 'Other Unpaid Amounts', text: '기타 미지급금을 입력해주세요. (없으면 "없음" 입력)' },
    { id: 'Job Description', text: '담당업무를 입력해주세요.' },
    { id: 'Wage Payment Date', text: '임금지급일을 입력해주세요.' },
    { id: 'contractType', text: '계약서 작성 여부를 선택해주세요. (1: 서면, 2: 구두)' },
    { id: 'work_detail', text: '1. 어떤 일을 하셨나요? (직무와 담당한 작업 내용을 알려주세요)' },
    { id: 'period', text: '2. 언제부터 언제까지 일하셨고, 그 중 임금을 받지 못한 기간은 언제인가요?' },
    { id: 'location', text: '3. 어느 지역, 어떤 회사(또는 인력사무소)에서 일하셨나요? 정확한 주소를 알려주세요.' },
    { id: 'wage', text: '4. 월급은 원래 얼마였고, 체불된 금액은 총 얼마인가요?' },
    { id: 'response', text: '5. 임금 체불에 대해 사업주에게 요청해보신 적이 있나요? 어떤 대응이 있었나요?' },
    { id: 'extra_info', text: '6. 추가로 제가 알아야 하는 내용을 더 알려주세요.' }
  ];

  // 선택지 텍스트 정의
  const optionTexts = {
    yes: '예',
    no: '아니오',
    workplace: '사업장',
    constructionSite: '공사현장',
    resigned: '퇴사',
    employed: '재직중',
    written: '서면',
    oral: '구두'
  };

  useEffect(() => {
    async function translateForm() {
      setIsTranslating(true);
      try {
        if (languageCode === 'ko') {
          setTranslatedQuestions(questions);
          setTranslatedOptions(optionTexts);
        } else {
          // 질문 번역
          const questionTexts = questions.map(q => q.text);
          const translatedQuestionTexts = await translateMultipleTexts(
            Object.fromEntries(questionTexts.map((text, index) => [index, text])),
            languageCode
          );

          // 선택지 번역
          const translatedOptions = await translateMultipleTexts(optionTexts, languageCode);

          // 번역된 질문 목록 생성
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
    translateForm();
  }, [languageCode]);

  useEffect(() => {
    if (!isTranslating && translatedQuestions.length > 0) {
      setMessages([{ type: 'bot', text: translatedQuestions[0].text }]);
    }
  }, [translatedQuestions, isTranslating]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || !translatedQuestions.length || !translatedQuestions[currentQuestion]) {
      return;
    }

    const currentQ = translatedQuestions[currentQuestion];
    let value = inputValue.trim();

    // 특수 필드 처리
    if (currentQ.id === 'processStatus') {
      formData['cReceive Processing Status Notifications ' + (value.toLowerCase() === 'y' ? 'yes' : 'no')] = 'y';
    } else if (currentQ.id === 'laborPortal') {
      formData['cReceive Notifications via Labor Portal ' + (value.toLowerCase() === 'y' ? 'yes' : 'no')] = 'y';
    } else if (currentQ.id === 'workplaceType') {
      formData[value === '1' ? 'Workplace' : 'Construction site'] = 'y';
    } else if (currentQ.id === 'employmentStatus') {
      formData[value === '1' ? 'Resigned/terminated' : 'Currently employed'] = 'y';
    } else if (currentQ.id === 'contractType') {
      formData[value === '1' ? 'Written' : 'Oral'] = 'y';
    } else {
      formData[currentQ.id] = value;
    }

    setMessages(prev => [...prev, { type: 'user', text: value }]);
    setInputValue('');

    // 진정 내용 관련 질문들(work_detail부터 extra_info까지)이 모두 완료되었는지 확인
    const detailQuestions = ['work_detail', 'period', 'location', 'wage', 'response', 'extra_info'];
    const isLastDetailQuestion = currentQ.id === 'extra_info';
    const allDetailsAnswered = detailQuestions.every(q => formData[q]);

    if (isLastDetailQuestion && allDetailsAnswered) {
      setLoading(true);
      try {
        // 진정 내용 생성 API 호출
        const detailData = detailQuestions.reduce((acc, key) => {
          acc[key] = formData[key];
          return acc;
        }, {});

        const contentResponse = await axios.post(`${SERVER_URL}/api/generate_complaint_content`, detailData);
        
        if (contentResponse.data.success) {
          formData['Details'] = contentResponse.data.content;
          
          // 증거자료 안내 생성 API 호출
          const evidenceResponse = await axios.post(`${SERVER_URL}/api/generate_complaint_evidence`, {
            query: contentResponse.data.content
          });

          if (evidenceResponse.data.success) {
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: '진정 내용이 생성되었습니다. 증거자료 안내를 확인해주세요:\n\n' + evidenceResponse.data.content 
            }]);
          }
          
          // PDF 생성 요청
          const response = await axios.post(`${SERVER_URL}/api/generate-complaint-pdf`, formData);
          
          if (response.data.success) {
            setPdfUrl(`${SERVER_URL}/uploads/complaint_filled.pdf`);
            setShowPdfButton(true);
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: '진정서가 성공적으로 생성되었습니다.' 
            }]);
          } else {
            setMessages(prev => [...prev, { 
              type: 'bot', 
              text: `PDF 생성 중 오류가 발생했습니다: ${response.data.message}` 
            }]);
          }
        } else {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: '진정 내용 생성 중 오류가 발생했습니다.' 
          }]);
        }
      } catch (error) {
        console.error('Error:', error);
        let errorMessage = '처리 중 오류가 발생했습니다.';
        
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
      setCurrentQuestion(prev => prev + 1);
      setMessages(prev => [...prev, { type: 'bot', text: translatedQuestions[currentQuestion + 1].text }]);
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

      // Android 권한 요청
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('권한 필요', 'PDF를 다운로드하기 위해 저장소 접근 권한이 필요합니다.');
          return;
        }
      }

      // PDF 파일 다운로드
      const filename = `complaint_${new Date().getTime()}.pdf`;
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
          // iOS에서는 공유 기능을 통해 저장
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: '진정서 저장하기',
            UTI: 'com.adobe.pdf'
          });
        } else {
          // Android에서는 다운로드 폴더에 저장
          const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
          await MediaLibrary.createAlbumAsync('Downloads', asset, false);
          Alert.alert(
            '다운로드 완료',
            'PDF가 다운로드 폴더에 저장되었습니다.'
          );
        }

        // 임시 파일 삭제
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

      // PDF 파일 다운로드
      const filename = `complaint_${new Date().getTime()}.pdf`;
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
          dialogTitle: '진정서 공유하기',
          UTI: 'com.adobe.pdf'
        });

        // 임시 파일 삭제
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
    
    // Y/N 선택 질문
    if (currentQ.id === 'processStatus' || currentQ.id === 'laborPortal') {
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

    // 사업장 유형 선택
    if (currentQ.id === 'workplaceType') {
      return (
        <View style={styles.selectionContainer}>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === '1' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('1')}
          >
            <Text style={[styles.selectionButtonText, inputValue === '1' && styles.selectionButtonTextSelected]}>
              {translatedOptions.workplace || optionTexts.workplace}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === '2' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('2')}
          >
            <Text style={[styles.selectionButtonText, inputValue === '2' && styles.selectionButtonTextSelected]}>
              {translatedOptions.constructionSite || optionTexts.constructionSite}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 재직 여부 선택
    if (currentQ.id === 'employmentStatus') {
      return (
        <View style={styles.selectionContainer}>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === '1' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('1')}
          >
            <Text style={[styles.selectionButtonText, inputValue === '1' && styles.selectionButtonTextSelected]}>
              {translatedOptions.resigned || optionTexts.resigned}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === '2' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('2')}
          >
            <Text style={[styles.selectionButtonText, inputValue === '2' && styles.selectionButtonTextSelected]}>
              {translatedOptions.employed || optionTexts.employed}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 계약서 작성 여부 선택
    if (currentQ.id === 'contractType') {
      return (
        <View style={styles.selectionContainer}>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === '1' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('1')}
          >
            <Text style={[styles.selectionButtonText, inputValue === '1' && styles.selectionButtonTextSelected]}>
              {translatedOptions.written || optionTexts.written}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectionButton, inputValue === '2' && styles.selectionButtonSelected]}
            onPress={() => setInputValue('2')}
          >
            <Text style={[styles.selectionButtonText, inputValue === '2' && styles.selectionButtonTextSelected]}>
              {translatedOptions.oral || optionTexts.oral}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 기본 텍스트 입력
    return (
      <TextInput
        style={styles.input}
        value={inputValue}
        onChangeText={setInputValue}
        placeholder={currentQ.text}
        placeholderTextColor="#999"
        multiline
        maxLength={500}
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
            <Text style={styles.pdfHeaderTitle}>진정서 미리보기</Text>
            <Text style={styles.pdfHeaderSubtitle}>생성된 진정서를 확인하세요</Text>
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
        <Text style={styles.headerTitle}>진정서 작성</Text>
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
            <Text style={styles.viewPdfButtonText}>진정서 보기</Text>
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

export default ComplaintFormScreen; 