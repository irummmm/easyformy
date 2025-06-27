import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import PassportVerificationScreen from './PassportVerificationScreen';
import { Ionicons } from '@expo/vector-icons';
// import { SERVER_URL } from '../config/azureStorage';
const SERVER_URL = 'http://192.168.35.173:5000';

const SignUpScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passportImage, setPassportImage] = useState(null);
  const [verifiedPassportData, setVerifiedPassportData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPassportVerification, setShowPassportVerification] = useState(false);
  const [passportData, setPassportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [residenceData, setResidenceData] = useState(null);
  const [residenceCardImage, setResidenceCardImage] = useState(null);
  const [isAnalyzingPassport, setIsAnalyzingPassport] = useState(false);
  const [isAnalyzingResidence, setIsAnalyzingResidence] = useState(false);

  useEffect(() => {
    if (route.params?.verifiedPassportData) {
      setVerifiedPassportData(route.params.verifiedPassportData);
      setPassportData(route.params.verifiedPassportData);
      navigation.setParams({ verifiedPassportData: undefined });
    }
    if (route.params?.verifiedResidenceData) {
      setResidenceData(route.params.verifiedResidenceData);
      navigation.setParams({ verifiedResidenceData: undefined });
    }
  }, [route.params]);

  const pickImage = async () => {
    try {
      Alert.alert(
        '여권 이미지 업로드',
        '이미지를 가져올 방법을 선택하세요',
        [
          {
            text: '카메라로 촬영',
            onPress: () => takePhoto()
          },
          {
            text: '갤러리에서 선택',
            onPress: () => pickFromGallery()
          },
          {
            text: '취소',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('이미지 선택 오류:', error);
      Alert.alert('오류', '이미지 선택 중 오류가 발생했습니다.');
      setIsAnalyzingPassport(false);
    }
  };

  const takePhoto = async () => {
    try {
      // 카메라 권한 요청
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
      return;
    }

      console.log('카메라 실행 시작');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3,
        maxWidth: 800,
        maxHeight: 800,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('카메라 오류:', error);
      Alert.alert('오류', '카메라 사용 중 오류가 발생했습니다.');
      setIsAnalyzingPassport(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      // 갤러리 권한 요청
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }

      console.log('갤러리 실행 시작');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3,
        maxWidth: 800,
        maxHeight: 800,
    });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processImage(result.assets[0].uri);
    }
    } catch (error) {
      console.error('갤러리 오류:', error);
      Alert.alert('오류', '갤러리 사용 중 오류가 발생했습니다.');
      setIsAnalyzingPassport(false);
    }
  };

  const processImage = async (uri) => {
    setPassportImage(uri);
    setIsAnalyzingPassport(true);
    
    try {
      console.log('이미지 업로드 시작');
      const formData = new FormData();
      formData.append('passport_image', {
        uri: uri,
        type: 'image/jpeg',
        name: 'passport.jpg',
      });

      console.log('서버 요청 시작');
      const response = await fetch(`${SERVER_URL}/analyze-passport`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('서버 응답 수신');
      const data = await response.json();
      
      if (response.ok) {
        console.log('여권 정보 추출 성공:', data);
        if (!data.surname || !data.givenname || !data.passport_number) {
          Alert.alert('알림', '일부 여권 정보를 추출하지 못했습니다. 수동으로 입력해주세요.');
        }
        setPassportData(data);
        navigation.navigate('PassportVerification', {
          passportData: data,
          isSignUp: true,
          onVerify: (verifiedData) => {
            setPassportData(verifiedData);
            setVerifiedPassportData(verifiedData);
          }
        });
      } else {
        console.error('서버 오류:', data.error);
        Alert.alert('오류', data.error || '여권 정보 추출에 실패했습니다.');
      }
    } catch (error) {
      console.error('여권 분석 오류:', error);
      if (error.message.includes('Network request failed')) {
        Alert.alert('오류', '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
      } else {
        Alert.alert('오류', '여권 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsAnalyzingPassport(false);
    }
  };

  const handleResidenceCardUpload = async () => {
    try {
      Alert.alert(
        '외국인 등록증 이미지 업로드',
        '이미지를 가져올 방법을 선택하세요',
        [
          {
            text: '카메라로 촬영',
            onPress: () => takeResidenceCardPhoto()
          },
          {
            text: '갤러리에서 선택',
            onPress: () => pickResidenceCardFromGallery()
          },
          {
            text: '취소',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Image selection error:', error);
      Alert.alert('오류', '이미지 선택 중 오류가 발생했습니다.');
      setIsAnalyzingResidence(false);
    }
  };

  const takeResidenceCardPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
      return;
    }

      console.log('Starting camera');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3,
        maxWidth: 800,
        maxHeight: 800,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processResidenceCardImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('오류', '카메라 사용 중 오류가 발생했습니다.');
      setIsAnalyzingResidence(false);
    }
  };

  const pickResidenceCardFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

      console.log('Starting gallery');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3,
        maxWidth: 800,
        maxHeight: 800,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processResidenceCardImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('오류', '갤러리 사용 중 오류가 발생했습니다.');
      setIsAnalyzingResidence(false);
    }
  };

  const processResidenceCardImage = async (uri) => {
    setResidenceCardImage(uri);
    setIsAnalyzingResidence(true);
    
    try {
      console.log('Starting image upload');
      const formData = new FormData();
      formData.append('residence_card_image', {
        uri: uri,
        type: 'image/jpeg',
        name: 'residence_card.jpg',
      });

      console.log('Sending server request');
      const response = await fetch(`${SERVER_URL}/analyze-residence-card`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Received server response');
      const data = await response.json();
      
      if (response.ok) {
        console.log('Residence card info extraction successful:', data);
        if (!data.name_kor || !data.resident_id || !data.visa_type) {
          Alert.alert('알림', '일부 외국인 등록증 정보를 추출하지 못했습니다. 수동으로 입력해주세요.');
        }
        setResidenceData(data);
        navigation.navigate('ResidenceCardVerification', {
          residenceData: data,
          isSignUp: true,
          onVerify: (verifiedData) => {
            setResidenceData(verifiedData);
          }
        });
      } else {
        console.error('Server error:', data.error);
        Alert.alert('오류', data.error || '외국인 등록증 정보 추출에 실패했습니다.');
      }
    } catch (error) {
      console.error('Residence card analysis error:', error);
      if (error.message.includes('Network request failed')) {
        Alert.alert('오류', '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
      } else {
        Alert.alert('오류', '외국인 등록증 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsAnalyzingResidence(false);
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('birth_date', birthDate);
      formData.append('email', email);
      formData.append('username', username);
      formData.append('password', password);

      // 여권 데이터가 있는 경우에만 추가
      if (passportData) {
        formData.append('passport_data', JSON.stringify(passportData));
      }

      // 외국인 등록증 데이터가 있는 경우에만 추가
      if (residenceData) {
        formData.append('name_kor', residenceData.name_kor || '');
        formData.append('resident_id', residenceData.resident_id || '');
        formData.append('visa_type', residenceData.visa_type || '');
        formData.append('issue_date', residenceData.issue_date || '');
      }

      console.log('회원가입 요청 데이터:', {
        name,
        birth_date: birthDate,
        email,
        username,
        password,
        passport_data: passportData,
        residence_data: residenceData
      });

      const response = await fetch(`${SERVER_URL}/register`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
    });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          '회원가입 완료',
          '회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.',
          [
            {
              text: '확인',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else {
        Alert.alert('회원가입 실패', data.error || '회원가입 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      Alert.alert('오류', '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (!name || !birthDate || !email || !username || !password || !confirmPassword) {
      Alert.alert('오류', '모든 필수 항목을 입력해주세요.');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return false;
    }

    return true;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Birth Date (YYYY-MM-DD)"
              value={birthDate}
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
                  setBirthDate(formatted);
                }
              }}
              keyboardType="numeric"
              maxLength={10}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            {/* 여권 등록 안내 및 업로드 버튼 */}
            <View style={styles.passportSection}>
              <Text style={styles.passportLabel}>Passport Registration (Optional)</Text>
              <TouchableOpacity 
                style={styles.passportButton} 
                onPress={pickImage}
                disabled={isAnalyzingPassport}
              >
                <Ionicons name="cloud-upload" size={18} color="#2c5282" style={{marginRight: 8}} />
                <Text style={styles.passportButtonText}>
                  {isAnalyzingPassport ? 'Analyzing passport...' :
                    passportData ? 'Passport Registered' : 'Upload Passport Image'}
                </Text>
              </TouchableOpacity>
              {passportImage && (
                <Image source={{ uri: passportImage }} style={styles.passportImage} />
              )}
              {/* 분석 결과 요약 */}
              {passportData && (
                <View style={styles.passportInfoCard}>
                  <View style={styles.passportInfoHeader}>
                    <Ionicons name="document-text" size={20} color="#2c5282" style={{marginRight: 6}} />
                    <Text style={styles.passportInfoTitle}>Passport Info</Text>
                  </View>
                  <View style={styles.passportInfoRow}>
                    <Text style={styles.passportInfoLabel}>Surname</Text>
                    <Text style={styles.passportInfoValue}>{passportData.surname || '-'}</Text>
                  </View>
                  <View style={styles.passportDivider} />
                  <View style={styles.passportInfoRow}>
                    <Text style={styles.passportInfoLabel}>Given Name</Text>
                    <Text style={styles.passportInfoValue}>{passportData.givenname || '-'}</Text>
                  </View>
                  <View style={styles.passportDivider} />
                  <View style={styles.passportInfoRow}>
                    <Text style={styles.passportInfoLabel}>Passport No</Text>
                    <Text style={styles.passportInfoValue}>{passportData.passport_number || '-'}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.verifyButton}
                    onPress={() => navigation.navigate('PassportVerification', {
                      passportData: passportData,
                      isSignUp: true
                    })}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#fff" style={{marginRight: 6}} />
                    <Text style={styles.verifyButtonText}>Verify Passport Info</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 분석 중 모달 */}
            <Modal
              transparent={true}
              visible={isAnalyzingPassport || isAnalyzingResidence}
              animationType="fade"
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <ActivityIndicator size="large" color="#2c5282" />
                  <Text style={styles.modalText}>Analyzing passport info...</Text>
                </View>
              </View>
            </Modal>

            {/* 외국인 등록증 섹션 */}
            <View style={styles.passportSection}>
              <Text style={styles.passportLabel}>Residence Card Registration (Optional)</Text>
              <TouchableOpacity 
                style={styles.passportButton} 
                onPress={handleResidenceCardUpload}
                disabled={isAnalyzingResidence}
              >
                <Ionicons name="cloud-upload" size={18} color="#2c5282" style={{marginRight: 8}} />
                <Text style={styles.passportButtonText}>
                  {isAnalyzingResidence ? 'Analyzing residence card...' :
                    residenceData ? 'Residence Card Registered' : 'Upload Residence Card Image'}
                </Text>
              </TouchableOpacity>
              {residenceCardImage && (
                <Image source={{ uri: residenceCardImage }} style={styles.passportImage} />
              )}
              {/* 분석 결과 요약 */}
              {residenceData && (
                <View style={styles.passportInfoCard}>
                  <View style={styles.passportInfoHeader}>
                    <Ionicons name="document-text" size={20} color="#2c5282" style={{marginRight: 6}} />
                    <Text style={styles.passportInfoTitle}>Residence Card Info</Text>
                  </View>
                  <View style={styles.passportInfoRow}>
                    <Text style={styles.passportInfoLabel}>Korean Name</Text>
                    <Text style={styles.passportInfoValue}>{residenceData.name_kor || '-'}</Text>
                  </View>
                  <View style={styles.passportDivider} />
                  <View style={styles.passportInfoRow}>
                    <Text style={styles.passportInfoLabel}>Resident ID</Text>
                    <Text style={styles.passportInfoValue}>{residenceData.resident_id || '-'}</Text>
                  </View>
                  <View style={styles.passportDivider} />
                  <View style={styles.passportInfoRow}>
                    <Text style={styles.passportInfoLabel}>Visa Type</Text>
                    <Text style={styles.passportInfoValue}>{residenceData.visa_type || '-'}</Text>
                  </View>
                  <View style={styles.passportDivider} />
                  <View style={styles.passportInfoRow}>
                    <Text style={styles.passportInfoLabel}>Issue Date</Text>
                    <Text style={styles.passportInfoValue}>{residenceData.issue_date || '-'}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.verifyButton}
                    onPress={() => navigation.navigate('ResidenceCardVerification', {
                      residenceData: residenceData,
                      isSignUp: true
                    })}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#fff" style={{marginRight: 6}} />
                    <Text style={styles.verifyButtonText}>Verify Residence Card Info</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, (!username || !password || !name) && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={!username || !password || !name || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkContainer}>
              <Text style={styles.linkText}>Already have an account? <Text style={styles.linkHighlight}>Login</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  form: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2c5282',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#b6c2d2',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  linkText: {
    color: '#2c5282',
    fontSize: 15,
  },
  linkHighlight: {
    fontWeight: 'bold',
    color: '#2c5282',
  },
  passportSection: {
    marginTop: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  passportLabel: {
    fontSize: 15,
    color: '#2c5282',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  passportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebf8ff',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  passportButtonText: {
    color: '#2c5282',
    fontSize: 14,
    fontWeight: '600',
  },
  passportImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'cover',
  },
  passportInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    marginBottom: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  passportInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  passportInfoTitle: {
    fontWeight: 'bold',
    color: '#2c5282',
    fontSize: 16,
  },
  passportInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  passportInfoLabel: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500',
  },
  passportInfoValue: {
    fontSize: 14,
    color: '#2d3748',
    fontWeight: '600',
  },
  passportDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 2,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c5282',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 14,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalText: {
    marginTop: 10,
    fontSize: 15,
    color: '#2c5282',
  },
});

export default SignUpScreen;
