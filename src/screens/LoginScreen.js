import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = 'http://192.168.35.173:5000';

const LoginScreen = () => {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        // JWT 토큰 저장
        if (!data.token) {
          throw new Error('No token received from server');
        }
        
        await AsyncStorage.setItem('userToken', data.token);
        console.log('Token saved:', data.token.substring(0, 20) + '...'); // 토큰 일부만 로깅
        
        // 사용자 정보 저장
        if (data.user) {
        await AsyncStorage.setItem('userInfo', JSON.stringify(data.user));
        }
        
        Alert.alert('로그인 성공', `${data.user.name}님 환영합니다!`);
        
        // 관리자 계정 체크
        if (username === 'ms7team' && password === 'ms7team') {
          navigation.navigate('AdminApplications');
          return;
        }
        
        // 일반 사용자는 Welcome 화면으로
        navigation.navigate('Welcome', { userInfo: data.user });
      } else {
        Alert.alert('로그인 실패', data.error || '아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      Alert.alert('오류', '서버 연결에 실패했습니다.');
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
          <TouchableOpacity
            style={[styles.button, (!username || !password) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!username || !password || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={styles.linkContainer}>
            <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkHighlight}>Sign Up</Text></Text>
          </TouchableOpacity>
        </View>
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
    width: 180,
    height: 180,
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
});

export default LoginScreen;