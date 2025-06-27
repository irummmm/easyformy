import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { SERVER_URL } from '../config/azureStorage';
const SERVER_URL = 'http://192.168.35.173:5000';

const PassportVerificationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [passportData, setPassportData] = useState(route.params?.passportData || {});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      setIsAnalyzing(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
        return;
      }

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
      setIsAnalyzing(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }

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
      setIsAnalyzing(false);
    }
  };

  const processImage = async (uri) => {
    setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('passport_image', {
        uri: uri,
        type: 'image/jpeg',
        name: 'passport.jpg',
      });

      // 회원가입 과정인지 확인
      const isSignUp = route.params?.isSignUp;
      const headers = {
        'Content-Type': 'multipart/form-data',
      };

      // 마이페이지에서의 수정인 경우에만 토큰 추가
      if (!isSignUp) {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetch(`${SERVER_URL}/analyze-passport`, {
        method: 'POST',
        body: formData,
        headers: headers,
      });

      const data = await response.json();
      
      if (response.ok) {
        setPassportData({
          ...data,
          imageUri: uri
        });
      } else {
        Alert.alert('오류', data.error || '여권 정보 추출에 실패했습니다.');
      }
    } catch (error) {
      console.error('여권 분석 오류:', error);
      Alert.alert('오류', '여권 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      
      // 회원가입 과정인지 확인
      const isSignUp = route.params?.isSignUp;
      
      if (isSignUp) {
        // 회원가입 과정에서는 콜백 함수를 통해 데이터 전달
        if (route.params?.onVerify) {
          route.params.onVerify(passportData);
        }
        navigation.goBack();
      } else {
        // 마이페이지에서의 수정은 토큰이 필요
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          Alert.alert('오류', '로그인이 필요합니다.');
          navigation.navigate('Login');
          return;
        }

        const response = await fetch(`${SERVER_URL}/update-passport`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passportData),
      });

        if (response.status === 401) {
          await AsyncStorage.removeItem('userToken');
          Alert.alert('오류', '세션이 만료되었습니다. 다시 로그인해주세요.');
          navigation.navigate('Login');
          return;
        }

      const data = await response.json();
      if (response.ok) {
        Alert.alert('성공', '여권 정보가 업데이트되었습니다.');
        navigation.goBack();
      } else {
        Alert.alert('오류', data.error || '여권 정보 업데이트에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('여권 정보 업데이트 오류:', error);
      Alert.alert('오류', '여권 정보 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="document-text" size={24} color="#2c5282" />
            </View>
            <Text style={styles.headerTitle}>여권 정보 확인</Text>
            <Text style={styles.headerSubtitle}>추출된 정보를 확인하고 필요한 경우 수정해주세요.</Text>
          </View>

          <View style={styles.imageSection}>
            {passportData.imageUri ? (
              <Image source={{ uri: passportData.imageUri }} style={styles.passportImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image" size={40} color="#cbd5e0" />
        </View>
      )}
            <TouchableOpacity style={styles.reuploadButton} onPress={pickImage}>
              <Ionicons name="cloud-upload" size={18} color="#2c5282" style={{marginRight: 6}} />
              <Text style={styles.reuploadButtonText}>여권 이미지 업로드</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
          <View style={styles.inputContainer}>
              <Text style={styles.label}>성 (Surname)</Text>
            <TextInput
              style={styles.input}
              value={passportData.surname || ''}
                onChangeText={text => setPassportData({ ...passportData, surname: text })}
                placeholder="성 (Surname)을 입력하세요"
            />
          </View>

          <View style={styles.inputContainer}>
              <Text style={styles.label}>이름 (Given Name)</Text>
            <TextInput
              style={styles.input}
              value={passportData.givenname || ''}
                onChangeText={text => setPassportData({ ...passportData, givenname: text })}
                placeholder="이름 (Given Name)을 입력하세요"
            />
          </View>

          <View style={styles.inputContainer}>
              <Text style={styles.label}>여권번호 (Passport No)</Text>
            <TextInput
              style={styles.input}
              value={passportData.passport_number || ''}
                onChangeText={text => setPassportData({ ...passportData, passport_number: text })}
                placeholder="여권번호를 입력하세요"
            />
          </View>

          <View style={styles.inputContainer}>
              <Text style={styles.label}>국적 (Nationality)</Text>
            <TextInput
              style={styles.input}
              value={passportData.nationality || ''}
                onChangeText={text => setPassportData({ ...passportData, nationality: text })}
                placeholder="국적을 입력하세요"
            />
          </View>

          <View style={styles.inputContainer}>
              <Text style={styles.label}>성별 (Sex)</Text>
            <TextInput
              style={styles.input}
              value={passportData.sex || ''}
                onChangeText={text => setPassportData({ ...passportData, sex: text })}
                placeholder="성별을 입력하세요"
            />
          </View>

          <View style={styles.inputContainer}>
              <Text style={styles.label}>국가코드 (Country Code)</Text>
            <TextInput
              style={styles.input}
              value={passportData.country_code || ''}
                onChangeText={text => setPassportData({ ...passportData, country_code: text })}
                placeholder="국가코드를 입력하세요"
            />
          </View>

          <View style={styles.inputContainer}>
              <Text style={styles.label}>발급일자 (Issue Date)</Text>
            <TextInput
              style={styles.input}
              value={passportData.issue_date || ''}
                onChangeText={text => setPassportData({ ...passportData, issue_date: text })}
                placeholder="발급일자를 입력하세요"
            />
          </View>

          <View style={styles.inputContainer}>
              <Text style={styles.label}>만료일자 (Expiry Date)</Text>
            <TextInput
              style={styles.input}
              value={passportData.expiry_date || ''}
                onChangeText={text => setPassportData({ ...passportData, expiry_date: text })}
                placeholder="만료일자를 입력하세요"
            />
          </View>

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>확인</Text>
              )}
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
    backgroundColor: '#f5f7fa',
  },
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#4a5568',
    marginBottom: 8,
    textAlign: 'center',
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  passportImage: {
    width: 140,
    height: 90,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: 140,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  reuploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebf8ff',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  reuploadButtonText: {
    color: '#2c5282',
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2d3748',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  button: {
    backgroundColor: '#2c5282',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PassportVerificationScreen; 