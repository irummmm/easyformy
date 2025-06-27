import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Modal, TextInput, TouchableWithoutFeedback, Keyboard, Platform, KeyboardAvoidingView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { translateMultipleTexts } from '../utils/translation';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// API 기본 URL 정의
const SERVER_URL = 'http://192.168.35.173:5000';

// 기본 텍스트 (영어)
  const textsToTranslate = {
    myPage: 'My Page',
  welcomeMessage: 'Welcome, {name}',
    basicInfo: 'Basic Information',
    passportInfo: 'Passport Information',
    visaInfo: 'Visa Information',
    editBasicInfo: 'Edit Basic Information',
    editPassportInfo: 'Edit Passport Information',
    editVisaInfo: 'Edit Visa Information',
    apply: 'Apply',
    logout: 'Logout',
    birthDate: 'Birth Date',
    gender: 'Gender',
    registrationNo: 'Registration Number',
    passportNo: 'Passport Number',
    passportIssueDate: 'Passport Issue Date',
    passportExpiryDate: 'Passport Expiry Date',
    phone: 'Phone',
    mobile: 'Mobile',
    localAddress: 'Local Address',
    homeAddress: 'Home Address',
    surname: 'Surname',
    givenName: 'Given Name',
    nationality: 'Nationality',
    countryCode: 'Country Code',
    issueDate: 'Issue Date',
    expiryDate: 'Expiry Date',
    verificationStatus: 'Verification Status',
    verified: 'Verified',
    notVerified: 'Not Verified',
    noPassportInfo: 'No passport information registered',
    registerPassport: 'Register Passport Information',
    visaType: 'Visa Type',
    entryDate: 'Entry Date',
    visaExpiry: 'Visa Expiry',
    stayProgress: 'Stay Progress',
    daysLeft: 'Days Left',
    extensionStart: 'Extension Start Date',
    extensionEnd: 'Extension End Date',
    error: 'Error',
    serverError: 'Cannot connect to server',
    logoutConfirm: 'Are you sure you want to logout?',
    cancel: 'Cancel',
    confirm: 'Confirm',
    loading: 'Loading...',
    passportTitle: 'Passport Information',
    passportSurname: 'Surname',
    passportGivenName: 'Given Name',
    passportNumber: 'Passport Number',
    passportNationality: 'Nationality',
    passportSex: 'Sex',
    editPassport: 'Edit Passport Information',
    noPassport: 'No passport information registered',
    residenceTitle: 'Residence Card Information',
    residenceNameKor: 'Korean Name',
    residenceId: 'Residence ID',
    residenceVisaType: 'Visa Type',
    residenceIssueDate: 'Issue Date',
    editResidence: 'Edit Residence Card Information',
    registerResidence: 'Register Residence Card Information',
    noResidence: 'No residence card information registered',
    name: 'Name',
    id: 'ID',
    extensionCount: 'Extension Count',
    extendVisa: 'Extend Visa',
    deleteAccount: 'Delete Account',
    deleteAccountConfirm: 'Are you sure you want to delete your account?',
    deleteAccountWarning: 'This action cannot be undone. All your data will be permanently deleted.',
    enterPassword: 'Enter your password to confirm',
    delete: 'Delete',
    email: 'Email',
  myApplications: 'My Applications',
  viewApplications: 'View All Applications',
  noApplications: 'No applications found',
  recentApplications: 'Recent Applications',
  applicationDate: 'Application Date',
  underReview: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
  success: 'Success',
  basicInfoUpdateSuccess: 'Basic information updated successfully',
  basicInfoUpdateError: 'Failed to update basic information',
  nameRequired: 'Name is required',
  usernameRequired: 'Username is required',
  usernameTooShort: 'Username must be at least 3 characters',
  usernameInvalid: 'Username can only contain letters, numbers, and underscores',
  emailRequired: 'Email is required',
  emailInvalid: 'Please enter a valid email address',
  birthDateRequired: 'Birth date is required',
  ok: 'OK',
  statusApproved: 'Approved',
  statusPending: 'Pending',
  statusRejected: 'Rejected',
  editBasicInfoTitle: 'Edit Basic Information',
  editBasicInfoName: 'Name',
  editBasicInfoNamePlaceholder: 'Enter your name',
  editBasicInfoUsername: 'Username',
  editBasicInfoUsernamePlaceholder: 'Enter your username',
  editBasicInfoBirthDate: 'Birth Date',
  editBasicInfoBirthDatePlaceholder: 'YYYY-MM-DD',
  editBasicInfoEmail: 'Email',
  editBasicInfoEmailPlaceholder: 'Enter your email',
  editVisaInfoTitle: 'Edit Visa Information',
  editVisaInfoType: 'Visa Type',
  editVisaInfoEntryDate: 'Entry Date',
  editVisaInfoEntryDatePlaceholder: 'YYYY-MM-DD',
  editVisaInfoExpiryDate: 'Expiry Date',
  editVisaInfoExtensionStart: 'Extension Start Date',
  editVisaInfoExtensionEnd: 'Extension End Date',
  extendVisaTitle: 'Extend Visa',
  extendVisaMessage: 'Would you like to extend your visa?\n\n',
  extendVisaE8Message: 'It will be extended for 3 months.\n',
  extendVisaE9Message: 'It will be extended for 1 year and 1 month.\n',
  extendVisaCurrentCount: 'Current extension count: ',
  extendVisaExpiredMessage: 'The extension period has expired. You need to get a new visa.',
  extendVisaAvailableMessage: 'Extension is available.',
  errorLoginRequired: 'Login required',
  errorSessionExpired: 'Session expired. Please login again',
  errorLoadUserInfo: 'Failed to load user information',
  errorLoadApplications: 'Failed to load applications',
  errorUpdateBasicInfo: 'Failed to update basic information',
  errorUpdateVisaInfo: 'Failed to update visa information',
  errorExtendVisa: 'Failed to extend visa',
  errorDeleteAccount: 'Failed to delete account',
  errorServerConnection: 'Cannot connect to server',
  errorPasswordRequired: 'Password is required',
  successUpdateBasicInfo: 'Basic information updated successfully',
  successUpdateVisaInfo: 'Visa information updated successfully',
  successExtendVisa: 'Visa extended successfully',
  successDeleteAccount: 'Account deleted successfully',
  save: 'Save',
  register: 'Register',
  more: 'More',
  viewAll: 'View All',
};

// 한국어 매핑
const koreanTranslations = {
  myPage: '마이페이지',
  welcomeMessage: '안녕하세요, {name}님',
  basicInfo: '기본 정보',
  passportInfo: '여권 정보',
  visaInfo: '비자 정보',
  editBasicInfo: '기본 정보 수정',
  editPassportInfo: '여권 정보 수정',
  editVisaInfo: '비자 정보 수정',
  apply: '신청하기',
  logout: '로그아웃',
  birthDate: '생년월일',
  gender: '성별',
  registrationNo: '등록번호',
  passportNo: '여권번호',
  passportIssueDate: '여권 발급일',
  passportExpiryDate: '여권 만료일',
  phone: '전화번호',
  mobile: '휴대전화',
  localAddress: '현재 주소',
  homeAddress: '본국 주소',
  surname: '성',
  givenName: '이름',
  nationality: '국적',
  countryCode: '국가 코드',
  issueDate: '발급일',
  expiryDate: '만료일',
  verificationStatus: '인증 상태',
  verified: '인증됨',
  notVerified: '미인증',
  noPassportInfo: '등록된 여권 정보가 없습니다',
  registerPassport: '여권 정보 등록',
  visaType: '비자 종류',
  entryDate: '입국일',
  visaExpiry: '비자 만료일',
  stayProgress: '체류 진행률',
  daysLeft: '남은 일수',
  extensionStart: '연장 시작일',
  extensionEnd: '연장 종료일',
  error: '오류',
  serverError: '서버 연결에 실패했습니다',
  logoutConfirm: '로그아웃 하시겠습니까?',
  cancel: '취소',
  confirm: '확인',
  loading: '로딩중...',
  passportTitle: '여권 정보',
  passportSurname: '성',
  passportGivenName: '이름',
  passportNumber: '여권번호',
  passportNationality: '국적',
  passportSex: '성별',
  editPassport: '여권 정보 수정',
  noPassport: '등록된 여권 정보가 없습니다',
  residenceTitle: '외국인등록증 정보',
  residenceNameKor: '한글 이름',
  residenceId: '외국인등록번호',
  residenceVisaType: '체류자격',
  residenceIssueDate: '발급일',
  editResidence: '외국인등록증 정보 수정',
  registerResidence: '외국인등록증 정보 등록',
  noResidence: '등록된 외국인등록증 정보가 없습니다',
  name: '이름',
  id: '아이디',
  extensionCount: '연장 횟수',
  extendVisa: '비자 연장',
  deleteAccount: '계정 삭제',
  deleteAccountConfirm: '계정을 삭제하시겠습니까?',
  deleteAccountWarning: '이 작업은 되돌릴 수 없습니다. 모든 데이터가 영구적으로 삭제됩니다.',
  enterPassword: '비밀번호를 입력하세요',
  delete: '삭제',
  email: '이메일',
    myApplications: '나의 신청 내역',
    viewApplications: '신청 내역 보기',
  noApplications: '신청 내역이 없습니다',
  recentApplications: '최근 신청 내역',
  applicationDate: '신청일',
  underReview: '심사중',
  approved: '승인완료',
  rejected: '반려',
  pending: '대기중',
  success: '성공',
  basicInfoUpdateSuccess: '기본 정보가 성공적으로 업데이트되었습니다',
  basicInfoUpdateError: '기본 정보 업데이트에 실패했습니다',
  nameRequired: '이름을 입력해주세요',
  usernameRequired: '아이디를 입력해주세요',
  usernameTooShort: '아이디는 3자 이상이어야 합니다',
  usernameInvalid: '아이디는 영문, 숫자, 언더스코어만 사용할 수 있습니다',
  emailRequired: '이메일을 입력해주세요',
  emailInvalid: '유효한 이메일 주소를 입력해주세요',
  birthDateRequired: '생년월일을 입력해주세요',
  ok: '확인',
  statusApproved: '승인',
  statusPending: '대기',
  statusRejected: '반려',
  editBasicInfoTitle: '기본 정보 수정',
  editBasicInfoName: '이름',
  editBasicInfoNamePlaceholder: '이름을 입력하세요',
  editBasicInfoUsername: '아이디',
  editBasicInfoUsernamePlaceholder: '아이디를 입력하세요',
  editBasicInfoBirthDate: '생년월일',
  editBasicInfoBirthDatePlaceholder: 'YYYY-MM-DD',
  editBasicInfoEmail: '이메일',
  editBasicInfoEmailPlaceholder: '이메일을 입력하세요',
  editVisaInfoTitle: '비자 정보 수정',
  editVisaInfoType: '비자 유형',
  editVisaInfoEntryDate: '입국일',
  editVisaInfoEntryDatePlaceholder: 'YYYY-MM-DD',
  editVisaInfoExpiryDate: '만료일',
  editVisaInfoExtensionStart: '연장 시작일',
  editVisaInfoExtensionEnd: '연장 종료일',
  extendVisaTitle: '비자 연장',
  extendVisaMessage: '비자를 연장하시겠습니까?\n\n',
  extendVisaE8Message: '3개월 연장됩니다.\n',
  extendVisaE9Message: '1년 1개월 연장됩니다.\n',
  extendVisaCurrentCount: '현재 연장 횟수: ',
  extendVisaExpiredMessage: '연장 기간이 만료되었습니다. 새로운 비자를 발급받아야 합니다.',
  extendVisaAvailableMessage: '연장이 가능합니다.',
  errorLoginRequired: '로그인이 필요합니다',
  errorSessionExpired: '세션이 만료되었습니다. 다시 로그인해주세요',
  errorLoadUserInfo: '사용자 정보를 불러오는데 실패했습니다',
  errorLoadApplications: '신청 내역을 불러오는데 실패했습니다',
  errorUpdateBasicInfo: '기본 정보 업데이트에 실패했습니다',
  errorUpdateVisaInfo: '비자 정보 업데이트에 실패했습니다',
  errorExtendVisa: '비자 연장에 실패했습니다',
  errorDeleteAccount: '계정 삭제에 실패했습니다',
  errorServerConnection: '서버 연결에 실패했습니다',
  errorPasswordRequired: '비밀번호를 입력해주세요',
  successUpdateBasicInfo: '기본 정보가 업데이트되었습니다',
  successUpdateVisaInfo: '비자 정보가 업데이트되었습니다',
  successExtendVisa: '비자가 성공적으로 연장되었습니다',
  successDeleteAccount: '회원 탈퇴가 완료되었습니다',
  save: '저장',
  register: '등록',
  more: '더보기',
  viewAll: '전체보기',
};

// 서버에서 받는 타입을 한글로 매핑
const TYPE_MAPPING = {
  'e8Registration': 'E-8 외국인등록',
  'e8Extension': 'E-8 체류기간 연장',
  'e8WorkplaceChange': 'E-8 근무처 변경',
  'e9Registration': 'E-9 외국인등록',
  'e9WorkplaceChange': 'E-9 근무처 변경',
  'e9Extension': 'E-9 체류기간 연장',
};

const MyPageScreen = ({ navigation, route }) => {
  const { languageCode } = useLanguage();  // currentLanguage 대신 languageCode 사용
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(route.params?.userInfo || null);
  const [daysLeft, setDaysLeft] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [residenceData, setResidenceData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showVisaEditModal, setShowVisaEditModal] = useState(false);
  const [editVisaType, setEditVisaType] = useState('');
  const [editEntryDate, setEditEntryDate] = useState('');
  const [editVisaExpiry, setEditVisaExpiry] = useState('');
  const [editExtensionStart, setEditExtensionStart] = useState('');
  const [editExtensionEnd, setEditExtensionEnd] = useState('');
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [applicationsSummary, setApplicationsSummary] = useState(null);
  const [recentApplications, setRecentApplications] = useState([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);

  const translateTexts = async () => {
    console.log('Translating texts with language code:', languageCode); // 디버깅용 로그
    
    if (!languageCode) {
      console.error('No language code available');
      setTranslations(textsToTranslate);
      return;
    }

    if (languageCode === 'ko') {
      console.log('Using Korean translations');
      setTranslations(koreanTranslations);
      return;
    }
    
    try {
      console.log('Translating texts:', Object.keys(textsToTranslate).length, 'items');
      const translatedTexts = await translateMultipleTexts(textsToTranslate, languageCode);
      console.log('Translation successful');
      setTranslations(translatedTexts);
    } catch (error) {
      console.error('Translation error details:', error);
      setTranslations(textsToTranslate);
    }
  };

  // 컴포넌트 마운트 시와 언어 변경 시 번역 실행
  useEffect(() => {
    console.log('Language code changed to:', languageCode); // 디버깅용 로그
    translateTexts();
  }, [languageCode]);

  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          fetchUserInfo(),
          fetchApplicationsSummary(),
          translateTexts()
        ]);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const fetchUserInfo = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert(
          translations.error || textsToTranslate.error,
          translations.errorLoginRequired || textsToTranslate.errorLoginRequired
        );
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${SERVER_URL}/user-info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem('userToken');
        Alert.alert('오류', '세션이 만료되었습니다. 다시 로그인해주세요.');
        navigation.navigate('Login');
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setUserInfo(data);
        // 여권 정보가 있는 경우 상태 업데이트
        if (data.passport) {
          setUserInfo(data);
        }
      } else {
        Alert.alert('오류', data.error || '사용자 정보를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
      Alert.alert(
        translations.error || textsToTranslate.error,
        translations.errorLoadUserInfo || textsToTranslate.errorLoadUserInfo
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApplicationsSummary = async () => {
      try {
      setIsLoadingApplications(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${SERVER_URL}/user-applications-summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem('userToken');
        Alert.alert('오류', '세션이 만료되었습니다. 다시 로그인해주세요.');
        navigation.navigate('Login');
        return;
      }

      const data = await response.json();
      if (response.ok) {
        // 서버에서 받은 영문 타입을 한글로 변환
        const convertedSummary = {};
        Object.entries(data.status_summary).forEach(([type, count]) => {
          const koreanType = TYPE_MAPPING[type] || type;
          convertedSummary[koreanType] = count;
        });

        // 최근 신청 내역의 타입도 한글로 변환
        const convertedRecentApplications = data.recent_applications.map(app => ({
          ...app,
          application_type: TYPE_MAPPING[app.application_type] || app.application_type
        }));

        setApplicationsSummary(convertedSummary);
        setRecentApplications(convertedRecentApplications);
    } else {
        console.error('신청 내역 조회 실패:', data.error);
    }
    } catch (error) {
      console.error('신청 내역 조회 오류:', error);
    } finally {
      setIsLoadingApplications(false);
    }
  };

  useEffect(() => {
    if (!userInfo) return;
    const today = moment();
    const expiry = moment(userInfo.visaExpiry);
    const total = expiry.diff(moment(userInfo.entryDate), 'days');
    const left = expiry.diff(today, 'days');
    const done = ((total - left) / total) * 100;
    setDaysLeft(left);
    setProgress(done);
  }, [userInfo]);

  // 화면이 포커스될 때마다 사용자 정보를 새로고침
  useFocusEffect(
    React.useCallback(() => {
      fetchUserInfo();
      fetchApplicationsSummary();
    }, [])
  );

  const handleLogout = async () => {
    Alert.alert(
      translations.logout || textsToTranslate.logout,
      translations.logoutConfirm || textsToTranslate.logoutConfirm,
      [
        {
          text: translations.cancel || textsToTranslate.cancel,
          style: 'cancel'
        },
        {
          text: translations.confirm || textsToTranslate.confirm,
          onPress: async () => {
            try {
              // 토큰 삭제
              await AsyncStorage.removeItem('userToken');
              // 로그인 화면으로 이동
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
            } catch (error) {
              console.error('로그아웃 오류:', error);
              Alert.alert('오류', '로그아웃 중 문제가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('오류', '비밀번호를 입력해주세요.');
      return;
    }

    setIsDeleting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${SERVER_URL}/delete-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.removeItem('userToken');
        Alert.alert('알림', '회원 탈퇴가 완료되었습니다.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        Alert.alert('오류', data.error || '회원 탈퇴 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('회원 탈퇴 오류:', error);
      Alert.alert('오류', '회원 탈퇴 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeletePassword('');
    }
  };

  const handleResidenceCardModify = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${SERVER_URL}/get-residence-card`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem('userToken');
        Alert.alert('오류', '세션이 만료되었습니다. 다시 로그인해주세요.');
        navigation.navigate('Login');
        return;
      }

      const data = await response.json();
      if (response.ok) {
        navigation.navigate('ResidenceCardVerification', {
          residenceData: data
        });
      } else {
        Alert.alert('오류', data.error || '외국인 등록증 정보를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('외국인 등록증 정보 조회 오류:', error);
      Alert.alert('오류', '외국인 등록증 정보 조회 중 오류가 발생했습니다.');
    }
  };

  const handleEditBasicInfo = () => {
    setEditName(userInfo?.name || '');
    setEditUsername(userInfo?.username || '');
    setEditBirthDate(userInfo?.birth_date || '');
    setEditEmail(userInfo?.email || '');
    setShowEditModal(true);
  };

  const handleUpdateBasicInfo = async () => {
    if (!editName || !editUsername || !editBirthDate || !editEmail) {
      Alert.alert('오류', '모든 필드를 입력해주세요.');
      return;
    }

    setIsUpdating(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('Token exists:', !!token);
      
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${SERVER_URL}/update-basic-info`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName,
          username: editUsername,
          birth_date: editBirthDate,
          email: editEmail
        }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        Alert.alert('성공', '기본 정보가 업데이트되었습니다.');
        setShowEditModal(false);
        fetchUserInfo();
      } else {
        // 토큰 관련 에러 처리
        if (response.status === 401 || (data.error && data.error.includes('token'))) {
          console.log('Token invalid, removing token and redirecting to login');
          await AsyncStorage.removeItem('userToken');
          Alert.alert(
            '세션 만료',
            '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
            [
              {
                text: '확인',
                onPress: () => {
                  setShowEditModal(false); // 모달 닫기
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                }
              }
            ]
          );
          return;
        }
        Alert.alert('오류', data.error || '정보 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('기본 정보 업데이트 오류:', error);
      if (error.message && error.message.includes('token')) {
        await AsyncStorage.removeItem('userToken');
        Alert.alert(
          '세션 만료',
          '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
          [
            {
              text: '확인',
              onPress: () => {
                setShowEditModal(false);
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }
            }
          ]
        );
        return;
      }
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 남은 일수 계산 함수
  const calculateDaysLeft = (expiryDate, extensionEnd) => {
    if (!expiryDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 시간을 00:00:00으로 설정
    
    // 연장 종료일이 있고, 만료일보다 이후인 경우 연장 종료일 사용
    const targetDate = extensionEnd && new Date(extensionEnd) > new Date(expiryDate) 
      ? new Date(extensionEnd) 
      : new Date(expiryDate);
      
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // 체류 진행률 계산 함수
  const calculateProgress = (entryDate, expiryDate, extensionEnd) => {
    if (!entryDate || !expiryDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entry = new Date(entryDate);
    entry.setHours(0, 0, 0, 0);
    
    // 연장 종료일이 있고, 만료일보다 이후인 경우 연장 종료일 사용
    const targetDate = extensionEnd && new Date(extensionEnd) > new Date(expiryDate)
      ? new Date(extensionEnd)
      : new Date(expiryDate);
      
    targetDate.setHours(0, 0, 0, 0);
    const total = (targetDate - entry) / (1000 * 60 * 60 * 24);
    const elapsed = (today - entry) / (1000 * 60 * 60 * 24);
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  useEffect(() => {
    if (userInfo?.visa) {
      const daysLeft = calculateDaysLeft(
        userInfo.visa.expiry_date,
        userInfo.visa.extension_end
      );
      setDaysLeft(daysLeft);
      
      if (userInfo.visa.entry_date) {
        const progress = calculateProgress(
          userInfo.visa.entry_date,
          userInfo.visa.expiry_date,
          userInfo.visa.extension_end
        );
        setProgress(progress);
      }
    }
  }, [userInfo]);

  const handleEditVisaInfo = () => {
    setEditVisaType(userInfo?.visa?.visa_type || '');
    setEditEntryDate(userInfo?.visa?.entry_date || '');
    setEditVisaExpiry(userInfo?.visa?.expiry_date || '');
    setEditExtensionStart(userInfo?.visa?.extension_start || '');
    setEditExtensionEnd(userInfo?.visa?.extension_end || '');
    setShowVisaEditModal(true);
  };

  const handleUpdateVisaInfo = async () => {
    if (!editVisaType || !editEntryDate) {
      Alert.alert('오류', '비자 유형과 입국일은 필수 입력 항목입니다.');
      return;
    }

    setIsUpdating(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${SERVER_URL}/update-visa-info`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visaType: editVisaType,
          entryDate: editEntryDate
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('성공', '비자 정보가 업데이트되었습니다.');
        setShowVisaEditModal(false);
        fetchUserInfo();
      } else {
        Alert.alert('오류', data.error || '정보 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('비자 정보 업데이트 오류:', error);
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExtendVisa = async () => {
    setIsExtending(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${SERVER_URL}/extend-visa`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('성공', '비자가 성공적으로 연장되었습니다.');
        setShowExtensionModal(false);
        fetchUserInfo();
      } else {
        Alert.alert('오류', data.error || '비자 연장에 실패했습니다.');
      }
    } catch (error) {
      console.error('비자 연장 오류:', error);
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    } finally {
      setIsExtending(false);
    }
  };

  const handlePassportVerification = () => {
    if (!userInfo || !userInfo.id) {
      Alert.alert('오류', '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
      navigation.navigate('Login');
      return;
    }

    navigation.navigate('PassportVerification', {
      passportData: userInfo.passport,
      user_id: userInfo.id,
      onVerified: (updatedPassportData) => {
        fetchUserInfo();
      }
    });
  };

  const handleResidenceCardVerification = () => {
    if (!userInfo || !userInfo.id) {
      Alert.alert('오류', '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
      navigation.navigate('Login');
      return;
    }

    navigation.navigate('ResidenceCardVerification', {
      residenceData: userInfo.residence_card,
      user_id: userInfo.id,
      onVerified: (updatedResidenceData) => {
        fetchUserInfo();
      }
    });
  };

  // 신청 내역 섹션 렌더링 함수
  const renderApplicationsSection = () => {
    if (isLoadingApplications) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{translations.myApplications || textsToTranslate.myApplications}</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2c5282" />
            <Text style={styles.loadingText}>{translations.loading || textsToTranslate.loading}</Text>
          </View>
        </View>
      );
    }

    // 신청 내역이 없는 경우
    if (!recentApplications || recentApplications.length === 0) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{translations.myApplications || textsToTranslate.myApplications}</Text>
          </View>
          <TouchableOpacity 
            style={styles.emptyApplicationsContainer}
            onPress={() => navigation.navigate('Docs')}
          >
            <Ionicons name="document-text-outline" size={40} color="#a0aec0" />
            <Text style={styles.emptyApplicationsText}>{translations.noApplications || textsToTranslate.noApplications}</Text>
            <Text style={styles.emptyApplicationsSubText}>{translations.apply || textsToTranslate.apply}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 신청 내역이 있는 경우
    return (
      <View style={styles.section}>
        <View style={[styles.sectionHeader, styles.sectionHeaderWithMore]}>
          <Text style={styles.sectionTitle}>{translations.myApplications || textsToTranslate.myApplications}</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('MyApplications')}
            style={styles.moreButton}
          >
            <Text style={styles.moreButtonText}>{translations.more || textsToTranslate.more}</Text>
            <Ionicons name="chevron-forward" size={16} color="#2c5282" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.recentApplicationsContainer}>
          {recentApplications.map((app) => (
            <View key={app.id} style={styles.recentApplicationItem}>
              <View style={styles.recentApplicationInfo}>
                <Text style={styles.recentApplicationType}>
                  {TYPE_MAPPING[app.application_type] || app.application_type}
                </Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: 
                    app.status === 'approved' ? '#C6F6D5' :
                    app.status === 'pending' ? '#FEFCBF' :
                    app.status === 'rejected' ? '#FED7D7' : '#E2E8F0'
                  }
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    { color: 
                      app.status === 'approved' ? '#2F855A' :
                      app.status === 'pending' ? '#975A16' :
                      app.status === 'rejected' ? '#C53030' : '#4A5568'
                    }
                  ]}>
                    {app.status === 'approved' ? translations.statusApproved :
                     app.status === 'pending' ? translations.statusPending :
                     app.status === 'rejected' ? translations.statusRejected : app.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.recentApplicationDate}>
                {translations.applicationDate}: {new Date(app.created_at).toLocaleDateString(languageCode === 'ko' ? 'ko-KR' : 'en-US')}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
      <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c5282" />
          <Text style={styles.loadingText}>{translations.loading || textsToTranslate.loading}</Text>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Image source={require('../assets/logo2.png')} style={{ width: 60, height: 60 }} resizeMode="contain" />
        </View>
        <Text style={styles.headerTitle}>{translations.myPage || textsToTranslate.myPage}</Text>
        <Text style={styles.headerSubtitle}>
          {(translations.welcomeMessage || textsToTranslate.welcomeMessage).replace('{name}', userInfo?.name || '')}
        </Text>
      </View>

      <ScrollView style={styles.container}>
        {/* Basic Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color="#2c5282" />
            <Text style={styles.sectionTitle}>
              {translations.basicInfo || textsToTranslate.basicInfo}
            </Text>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations.name || textsToTranslate.name}</Text>
              <Text style={styles.infoValue}>{userInfo?.name || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations.id || textsToTranslate.id}</Text>
              <Text style={styles.infoValue}>{userInfo?.username || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations.birthDate || textsToTranslate.birthDate}</Text>
              <Text style={styles.infoValue}>{userInfo?.birth_date || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations.email || textsToTranslate.email}</Text>
              <Text style={styles.infoValue}>{userInfo?.email || '-'}</Text>
            </View>
          </View>

            <TouchableOpacity
              style={styles.editButton}
            onPress={handleEditBasicInfo}
            >
            <Ionicons name="create" size={16} color="#2c5282" />
            <Text style={styles.editButtonText}>
              {translations.editBasicInfo || textsToTranslate.editBasicInfo}
            </Text>
            </TouchableOpacity>
        </View>

        {/* Passport Information Section */}
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={24} color="#2c5282" />
            <Text style={styles.sectionTitle}>
              {translations.passportTitle || textsToTranslate.passportTitle}
            </Text>
            </View>
            {userInfo?.passport ? (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translations.passportSurname || textsToTranslate.passportSurname}
                </Text>
                <Text style={styles.infoValue}>{userInfo.passport.surname}</Text>
                </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translations.passportGivenName || textsToTranslate.passportGivenName}
                </Text>
                <Text style={styles.infoValue}>{userInfo.passport.givenname}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translations.passportNumber || textsToTranslate.passportNumber}
                </Text>
                <Text style={styles.infoValue}>{userInfo.passport.passport_number}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translations.passportNationality || textsToTranslate.passportNationality}
                </Text>
                <Text style={styles.infoValue}>{userInfo.passport.nationality}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translations.passportSex || textsToTranslate.passportSex}
                </Text>
                <Text style={styles.infoValue}>{userInfo.passport.sex}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translations.passportIssueDate || textsToTranslate.passportIssueDate}
                </Text>
                <Text style={styles.infoValue}>{userInfo.passport.issue_date}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translations.passportExpiryDate || textsToTranslate.passportExpiryDate}
                </Text>
                <Text style={styles.infoValue}>{userInfo.passport.expiry_date}</Text>
              </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handlePassportVerification}
                >
                <Ionicons name="create-outline" size={18} color="#2c5282" style={{marginRight: 6}} />
                <Text style={styles.editButtonText}>
                  {translations.editPassport || textsToTranslate.editPassport}
                </Text>
                </TouchableOpacity>
            </View>
            ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {translations.noPassport || textsToTranslate.noPassport}
              </Text>
                <TouchableOpacity
                style={styles.addButton}
                onPress={handlePassportVerification}
              >
                <Ionicons name="add-circle-outline" size={18} color="#2c5282" style={{marginRight: 6}} />
                <Text style={styles.addButtonText}>
                  {translations.registerPassport || textsToTranslate.registerPassport}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Residence Card Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={24} color="#2c5282" />
            <Text style={styles.sectionTitle}>
              {translations.residenceTitle || textsToTranslate.residenceTitle}
            </Text>
          </View>
          {userInfo?.residence_card ? (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translations.residenceNameKor || textsToTranslate.residenceNameKor}
                </Text>
                <Text style={styles.infoValue}>{userInfo.residence_card.name_kor}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translations.residenceId || textsToTranslate.residenceId}
                </Text>
                <Text style={styles.infoValue}>{userInfo.residence_card.resident_id}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translations.residenceVisaType || textsToTranslate.residenceVisaType}
                </Text>
                <Text style={styles.infoValue}>{userInfo.residence_card.visa_type}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translations.residenceIssueDate || textsToTranslate.residenceIssueDate}
                </Text>
                <Text style={styles.infoValue}>{userInfo.residence_card.issue_date}</Text>
              </View>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleResidenceCardVerification}
                >
                <Ionicons name="create-outline" size={18} color="#2c5282" style={{marginRight: 6}} />
                <Text style={styles.editButtonText}>
                  {translations.editResidence || textsToTranslate.editResidence}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {translations.noResidence || textsToTranslate.noResidence}
              </Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleResidenceCardVerification}
              >
                <Ionicons name="add-circle-outline" size={18} color="#2c5282" style={{marginRight: 6}} />
                <Text style={styles.addButtonText}>
                  {translations.registerResidence || textsToTranslate.registerResidence}
                </Text>
                </TouchableOpacity>
              </View>
            )}
        </View>

        {/* Visa Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="airplane" size={20} color="#2c5282" />
            <Text style={styles.sectionTitle}>
              {translations.visaInfo || textsToTranslate.visaInfo}
            </Text>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations.visaType || textsToTranslate.visaType}</Text>
              <Text style={styles.infoValue}>{userInfo?.visa?.visa_type || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations.entryDate || textsToTranslate.entryDate}</Text>
              <Text style={styles.infoValue}>{userInfo?.visa?.entry_date || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations.visaExpiry || textsToTranslate.visaExpiry}</Text>
              <Text style={styles.infoValue}>{userInfo?.visa?.expiry_date || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations.stayProgress || textsToTranslate.stayProgress}</Text>
              <Text style={styles.infoValue}>{`${progress.toFixed(1)}%`}</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations.daysLeft || textsToTranslate.daysLeft}</Text>
              <Text style={styles.infoValue}>D-{daysLeft}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations.extensionStart || textsToTranslate.extensionStart}</Text>
              <Text style={styles.infoValue}>{userInfo?.visa?.extension_start || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations.extensionEnd || textsToTranslate.extensionEnd}</Text>
              <Text style={styles.infoValue}>{userInfo?.visa?.extension_end || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations.extensionCount || textsToTranslate.extensionCount}</Text>
              <Text style={styles.infoValue}>{userInfo?.visa?.extension_count || 0}회</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditVisaInfo}
            >
              <Ionicons name="create" size={16} color="#2c5282" />
              <Text style={styles.editButtonText}>
                {translations.editVisaInfo || textsToTranslate.editVisaInfo}
              </Text>
            </TouchableOpacity>

            {userInfo?.visa && (
              <TouchableOpacity
                style={styles.extendButton}
                onPress={() => setShowExtensionModal(true)}
              >
                <Ionicons name="time" size={16} color="#ffffff" />
                <Text style={styles.extendButtonText}>
                  {translations.extendVisa || textsToTranslate.extendVisa}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 신청 내역 섹션 */}
        {renderApplicationsSection()}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#ffffff" />
          <Text style={styles.logoutText}>{translations.logout || textsToTranslate.logout}</Text>
        </TouchableOpacity>

            <TouchableOpacity
          style={styles.deleteButton} 
          onPress={() => setShowDeleteModal(true)}
        >
          <Ionicons name="trash" size={20} color="#ffffff" />
          <Text style={styles.deleteButtonText}>
            {translations.deleteAccount || textsToTranslate.deleteAccount}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Basic Info Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {translations.editBasicInfoTitle || textsToTranslate.editBasicInfoTitle}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {translations.editBasicInfoName || textsToTranslate.editBasicInfoName}
              </Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder={translations.editBasicInfoNamePlaceholder || textsToTranslate.editBasicInfoNamePlaceholder}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {translations.editBasicInfoUsername || textsToTranslate.editBasicInfoUsername}
              </Text>
              <TextInput
                style={styles.input}
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder={translations.editBasicInfoUsernamePlaceholder || textsToTranslate.editBasicInfoUsernamePlaceholder}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {translations.editBasicInfoBirthDate || textsToTranslate.editBasicInfoBirthDate}
              </Text>
              <TextInput
                style={styles.input}
                value={editBirthDate}
                onChangeText={(text) => {
                  const numbers = text.replace(/[^0-9]/g, '');
                  if (numbers.length <= 8) {
                    let formatted = numbers;
                    if (numbers.length > 4) {
                      formatted = numbers.slice(0, 4) + '-' + numbers.slice(4);
                    }
                    if (numbers.length > 6) {
                      formatted = formatted.slice(0, 7) + '-' + formatted.slice(7);
                    }
                    setEditBirthDate(formatted);
                  }
                }}
                placeholder={translations.editBasicInfoBirthDatePlaceholder || textsToTranslate.editBasicInfoBirthDatePlaceholder}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {translations.editBasicInfoEmail || textsToTranslate.editBasicInfoEmail}
              </Text>
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder={translations.editBasicInfoEmailPlaceholder || textsToTranslate.editBasicInfoEmailPlaceholder}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
            >
                <Text style={styles.cancelButtonText}>
                  {translations.cancel || textsToTranslate.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleUpdateBasicInfo}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {translations.save || textsToTranslate.save}
                  </Text>
                )}
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </Modal>

      {/* Edit Visa Info Modal */}
      <Modal
        visible={showVisaEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowVisaEditModal(false);
          Keyboard.dismiss();
        }}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {translations.editVisaInfoTitle || textsToTranslate.editVisaInfoTitle}
                </Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {translations.editVisaInfoType || textsToTranslate.editVisaInfoType}
                  </Text>
                  <View style={styles.visaTypeContainer}>
        <TouchableOpacity 
                      style={[
                        styles.visaTypeButton,
                        editVisaType === 'E-8' && styles.visaTypeButtonSelected
                      ]}
                      onPress={() => setEditVisaType('E-8')}
        >
                      <Text style={[
                        styles.visaTypeButtonText,
                        editVisaType === 'E-8' && styles.visaTypeButtonTextSelected
                      ]}>E-8</Text>
        </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.visaTypeButton,
                        editVisaType === 'E-9' && styles.visaTypeButtonSelected
                      ]}
                      onPress={() => setEditVisaType('E-9')}
                    >
                      <Text style={[
                        styles.visaTypeButtonText,
                        editVisaType === 'E-9' && styles.visaTypeButtonTextSelected
                      ]}>E-9</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {translations.editVisaInfoEntryDate || textsToTranslate.editVisaInfoEntryDate}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={editEntryDate}
                    onChangeText={(text) => {
                      const numbers = text.replace(/[^0-9]/g, '');
                      if (numbers.length <= 8) {
                        let formatted = numbers;
                        if (numbers.length > 4) {
                          formatted = numbers.slice(0, 4) + '-' + numbers.slice(4);
                        }
                        if (numbers.length > 6) {
                          formatted = formatted.slice(0, 7) + '-' + formatted.slice(7);
                        }
                        setEditEntryDate(formatted);
                      }
                    }}
                    placeholder={translations.editVisaInfoEntryDatePlaceholder || textsToTranslate.editVisaInfoEntryDatePlaceholder}
                    keyboardType="numeric"
                    maxLength={10}
                    onBlur={() => Keyboard.dismiss()}
                  />
                </View>

                <View style={styles.infoContainer}>
  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{translations.editVisaInfoExpiryDate || textsToTranslate.editVisaInfoExpiryDate}</Text>
                    <Text style={styles.infoValue}>{editVisaExpiry || '-'}</Text>
  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{translations.editVisaInfoExtensionStart || textsToTranslate.editVisaInfoExtensionStart}</Text>
                    <Text style={styles.infoValue}>{editExtensionStart || '-'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{translations.editVisaInfoExtensionEnd || textsToTranslate.editVisaInfoExtensionEnd}</Text>
                    <Text style={styles.infoValue}>{editExtensionEnd || '-'}</Text>
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowVisaEditModal(false);
                      Keyboard.dismiss();
                    }}
                  >
                    <Text style={styles.cancelButtonText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={() => {
                      handleUpdateVisaInfo();
                      Keyboard.dismiss();
                    }}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>저장</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Extension Confirmation Modal */}
      <Modal
        visible={showExtensionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExtensionModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {translations.extendVisaTitle || textsToTranslate.extendVisaTitle}
            </Text>
            <Text style={styles.modalText}>
              {translations.extendVisaMessage || textsToTranslate.extendVisaMessage}
              {userInfo?.visa?.visa_type === 'E-8' ? translations.extendVisaE8Message || textsToTranslate.extendVisaE8Message : translations.extendVisaE9Message || textsToTranslate.extendVisaE9Message}
              {userInfo?.visa?.extension_end && new Date(userInfo.visa.extension_end) < new Date() ? translations.extendVisaExpiredMessage || textsToTranslate.extendVisaExpiredMessage : translations.extendVisaAvailableMessage || textsToTranslate.extendVisaAvailableMessage}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowExtensionModal(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.confirmButton,
                  userInfo?.visa?.extension_end && new Date(userInfo.visa.extension_end) < new Date() && styles.disabledButton
                ]}
                onPress={handleExtendVisa}
                disabled={isExtending || (userInfo?.visa?.extension_end && new Date(userInfo.visa.extension_end) < new Date())}
              >
                {isExtending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmButtonText}>확인</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {translations.deleteAccount || textsToTranslate.deleteAccount}
            </Text>
            <Text style={styles.modalText}>
              {translations.deleteAccountWarning || textsToTranslate.deleteAccountWarning}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={translations.enterPassword || textsToTranslate.enterPassword}
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>
                  {translations.cancel || textsToTranslate.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton]}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>
                    {translations.delete || textsToTranslate.delete}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 16,
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
    marginBottom: 10,
  },
  sectionHeaderWithMore: {
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
  },
  infoContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  infoLabel: {
    fontSize: 14,
    color: '#4a5568',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#2d3748',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ebf8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  editButtonText: {
    color: '#2c5282',
    fontSize: 14,
    fontWeight: '600',
  },
  noPassportContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  noPassportText: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 16,
    textAlign: 'center',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c5282',
    paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 8,
    gap: 8,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#2c5282',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2c5282',
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: '#e53e3e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#4a5568',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmButton: {
    backgroundColor: '#e53e3e',
  },
  deleteConfirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  emptyCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c5282',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 15,
    color: '#2d3748',
  },
  confirmButton: {
    backgroundColor: '#2c5282',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  visaTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  visaTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  visaTypeButtonSelected: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
  },
  visaTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a5568',
  },
  visaTypeButtonTextSelected: {
    color: '#ffffff',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  extendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2c5282',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    gap: 8,
  },
  extendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#a0aec0',
    opacity: 0.7,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#2c5282',
    fontWeight: '500',
  },
  applicationsContainer: {
    marginTop: 8,
  },
  applicationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  applicationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  applicationType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2d3748',
  },
  applicationCount: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  applicationStatusContainer: {
    gap: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#4a5568',
    flex: 1,
  },
  statusCount: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  emptyApplicationsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyApplicationsText: {
    fontSize: 16,
    color: '#4a5568',
    marginTop: 10,
    fontWeight: '500',
  },
  emptyApplicationsSubText: {
    fontSize: 14,
    color: '#718096',
    marginTop: 5,
  },
  recentApplicationsContainer: {
    marginTop: 8,
  },
  recentApplicationItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  recentApplicationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentApplicationType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2d3748',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  recentApplicationDate: {
    fontSize: 13,
    color: '#718096',
  },
});

export default MyPageScreen;
