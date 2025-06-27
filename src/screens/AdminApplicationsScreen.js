import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  FlatList,
  Modal,
  Dimensions,
  Linking,
  Platform,
  Image,
  ScrollView,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as MediaLibrary from 'expo-media-library';
import { container_name } from '../config/azureStorage';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
const SERVER_URL = 'http://192.168.35.173:5000';

const STATUS_FLOW = {
  '신청중': ['접수완료', '신청실패'],
  '접수완료': ['신청완료', '신청실패'],
  '신청완료': ['접수완료', '신청실패'],
  '신청실패': ['신청중', '접수완료']
};

const STATUS_DESCRIPTIONS = {
  '신청중': '신청서가 제출되어 검토 중입니다.',
  '접수완료': '신청서가 접수되어 처리 중입니다.',
  '신청완료': '신청이 승인되어 완료되었습니다.',
  '신청실패': '신청이 거절되었습니다. 재신청이 필요합니다.',
};

const STATUS_COLORS = {
  '신청중': '#FFA500',  // 주황색
  '접수완료': '#4169E1',  // 파란색
  '신청완료': '#32CD32',  // 초록색
  '신청실패': '#FF0000',  // 빨간색
};

const APPLICATION_TYPES = {
  'e8Registration': 'E-8 외국인등록',
  'e8Extension': 'E-8 체류기간 연장',
  'e8WorkplaceChange': 'E-8 근무처 변경',
  'e9Registration': 'E-9 외국인등록',
  'e9WorkplaceChange': 'E-9 근무처 변경',
  'e9Extension': 'E-9 체류기간 연장',
};

const STATUS_OPTIONS = [
  { value: 'pending', label: '신청중', color: '#718096' },
  { value: 'processing', label: '접수완료', color: '#4299e1' },
  { value: 'approved', label: '신청완료', color: '#48bb78' },
  { value: 'rejected', label: '신청실패', color: '#e53e3e' }
];

// 로깅 유틸리티 함수 추가
const log = (message, data = null) => {
  if (__DEV__) {
    if (data) {
      console.log(`[AdminApp] ${message}`, data);
    } else {
      console.log(`[AdminApp] ${message}`);
    }
  }
};

const AdminApplicationsScreen = ({ navigation }) => {
  const [applications, setApplications] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewType, setPreviewType] = useState(null); // 'image' or 'pdf' or 'other'
  const [localPreviewUri, setLocalPreviewUri] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingFileName, setDownloadingFileName] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [deleteTypeModalVisible, setDeleteTypeModalVisible] = useState(false);
  const [selectedTypeToDelete, setSelectedTypeToDelete] = useState(null);
  const [selectedUserToDelete, setSelectedUserToDelete] = useState(null);
  const [isDeletingType, setIsDeletingType] = useState(false);

  useEffect(() => {
    fetchApplications();
    const loadToken = async () => {
      const token = await AsyncStorage.getItem('userToken');
      setAuthToken(token);
    };
    loadToken();
  }, []);

  const fetchApplications = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('알림', '로그인이 필요합니다.');
        navigation.navigate('Login');
        return;
      }
      
      console.log('Fetching admin applications...');
      const response = await fetch(`${SERVER_URL}/admin/files`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Raw response data:', data);

      if (response.status === 401) {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userInfo');
        Alert.alert('알림', '로그인이 만료되었습니다. 다시 로그인해주세요.');
        navigation.navigate('Login');
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || '신청 내역을 가져오는데 실패했습니다.');
      }

      // 상태 매핑
      const statusMap = {
        'pending': '신청중',
        'approved': '신청완료',
        'rejected': '신청실패',
        'processing': '접수완료'
      };

      // 데이터 변환
      const transformedData = {};
      Object.entries(data).forEach(([userName, userData]) => {
        transformedData[userName] = {
          username: userData.username,
          user_id: userData.user_id,
          applications: {}
        };

        // 각 신청 유형별로 데이터 처리
        Object.entries(userData.applications).forEach(([appType, appData]) => {
          // 신청 유형을 한글로 변환
          const type = APPLICATION_TYPES[appType] || appType;
          
          // 해당 유형의 신청서가 없으면 초기화
          if (!transformedData[userName].applications[type]) {
            transformedData[userName].applications[type] = {
              id: appData.id,
              status: statusMap[appData.status] || appData.status,
              submitted_at: appData.submitted_at,
              updated_at: appData.updated_at,
              notes: appData.notes,
              files: []
            };
          }

          // 파일 정보 처리
          if (appData.files) {
            Object.entries(appData.files).forEach(([docId, fileData]) => {
              transformedData[userName].applications[type].files.push({
                ...fileData,
                doc_id: docId
              });
            });
          }
        });
      });

      console.log('Transformed data:', transformedData);
      setApplications(transformedData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError(error.message || '신청 내역을 가져오는데 실패했습니다.');
      setLoading(false);
    }
  };

  const handleStatusPress = (app) => {
    setSelectedApplication(app);
    setStatusModalVisible(true);
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!selectedApplication || updatingStatus) return;

    try {
      setUpdatingStatus(true);
      const userToken = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${SERVER_URL}/admin/application/${selectedApplication.id}/status`, {
        method: 'PUT',
                    headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '상태 업데이트에 실패했습니다.');
      }

      // 성공적으로 업데이트되면 애플리케이션 목록 새로고침
      await fetchApplications();
      Alert.alert('알림', '상태가 성공적으로 업데이트되었습니다.');
              } catch (error) {
                console.error('Error updating status:', error);
      Alert.alert('오류', error.message || '상태 업데이트에 실패했습니다.');
    } finally {
      setUpdatingStatus(false);
      setStatusModalVisible(false);
      setSelectedApplication(null);
    }
  };

  const handleDeleteApplication = async (applicationId) => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('알림', '로그인이 필요합니다.');
        navigation.navigate('Login');
        return;
      }

      Alert.alert(
        '신청 삭제',
        '이 신청을 삭제하시겠습니까?',
        [
          {
            text: '취소',
            style: 'cancel'
          },
          {
            text: '삭제',
            style: 'destructive',
            onPress: async () => {
              const response = await fetch(`${SERVER_URL}/admin/application/${applicationId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${userToken}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '신청 삭제에 실패했습니다.');
              }

              // 성공적으로 삭제되면 신청 목록 새로고침
              await fetchApplications();
              Alert.alert('성공', '신청이 삭제되었습니다.');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting application:', error);
      Alert.alert('오류', error.message || '신청 삭제에 실패했습니다.');
    }
  };

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      console.log('=== Fetch Files Debug ===');
      console.log('API URL:', SERVER_URL);
      console.log('Token:', token);

      const response = await fetch(`${SERVER_URL}/admin/files`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Server response:', JSON.stringify(data, null, 2));

      if (data.files) {
        // 서버에서 받은 파일 URL 구조 확인
        const firstFile = data.files[0];
        if (firstFile) {
          console.log('First file structure:', {
            original: firstFile,
            file_url: firstFile.file_url,
            download_url: firstFile.download_url
          });
        }

        setApplications(data.files);
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error('Fetch files error:', error);
      Alert.alert('오류', '파일 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewFile = async (file) => {
    try {
      if (!file.file_url) {
        console.error('No file URL:', file);
        Alert.alert('오류', '파일 URL이 없습니다.');
        return;
      }

      // Extract the actual user ID from the file URL
      const urlParts = file.file_url.split('/');
      const actualUserId = urlParts[urlParts.length - 2];
      console.log('Previewing file:', file, 'for actual user:', actualUserId);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      setPdfLoading(true);
      setPdfError(null);
      setSelectedFile({ ...file, userId: actualUserId });
      setPreviewModalVisible(true);
    } catch (error) {
      console.error('Preview error:', error);
      Alert.alert('오류', '파일 미리보기를 불러오는데 실패했습니다.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClosePreview = async () => {
    try {
      if (previewUrl && previewUrl.startsWith(FileSystem.cacheDirectory)) {
        await FileSystem.deleteAsync(previewUrl);
        console.log('Cache file deleted:', previewUrl);
      }
    } catch (error) {
      console.error('Error deleting cache file:', error);
    } finally {
      setPreviewModalVisible(false);
      setPreviewUrl(null);
      setPreviewType(null);
      setPreviewFileName(null);
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      // Extract the actual user ID from the file URL
      const urlParts = file.file_url.split('/');
      const actualUserId = urlParts[urlParts.length - 2]; // Get user ID from URL
      console.log('Downloading file:', file, 'for actual user:', actualUserId);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        return;
      }

      // Show download started alert
      Alert.alert('다운로드 시작', '파일 다운로드가 시작되었습니다.');

      // Download through our server
      const downloadResult = await FileSystem.downloadAsync(
        `${SERVER_URL}/admin/files/${actualUserId}/${file.doc_id}`,
        FileSystem.cacheDirectory + file.file_name,
        {
        headers: {
          'Authorization': `Bearer ${token}`
        }
        }
      );

      console.log('Download result:', downloadResult);

      if (downloadResult.status === 200) {
        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          try {
            await Sharing.shareAsync(downloadResult.uri, {
                  mimeType: 'application/pdf',
              dialogTitle: '파일 열기',
                  UTI: 'com.adobe.pdf'
                });
              } catch (error) {
            console.error('Error sharing file:', error);
            Alert.alert(
              '파일 열기 실패',
              '파일을 열 수 없습니다. 파일은 다음 위치에 저장되었습니다: ' + downloadResult.uri
            );
              }
            } else {
          Alert.alert(
            '알림',
            '파일이 다운로드되었지만, 이 기기에서는 파일을 열 수 없습니다. 파일은 다음 위치에 저장되었습니다: ' + downloadResult.uri
          );
        }

        // Clean up the temporary file after sharing
        try {
          await FileSystem.deleteAsync(downloadResult.uri);
          } catch (error) {
          console.error('Error deleting temporary file:', error);
        }
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert(
        '다운로드 실패',
        `파일 다운로드 중 오류가 발생했습니다: ${error.message}`
      );
    }
  };

  const handleDeleteType = async (userName, type) => {
    setSelectedUserToDelete(userName);
    setSelectedTypeToDelete(type);
    setDeleteTypeModalVisible(true);
  };

  const confirmDeleteType = async () => {
    try {
      setIsDeletingType(true);
      const userData = applications[selectedUserToDelete];
      if (!userData) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      console.log('Deleting application:', {
        type: selectedTypeToDelete,
        userData,
        username: userData.username
      });

      const response = await fetch(`${SERVER_URL}/admin/delete_application_type`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userData.username,  // user_id 대신 username 사용
          type: selectedTypeToDelete
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '신청 내역 삭제에 실패했습니다.');
      }

      Alert.alert('성공', '신청 내역이 삭제되었습니다.');
      await fetchApplications();  // 목록 새로고침
    } catch (error) {
      console.error('Error deleting application type:', error);
      Alert.alert('오류', error.message || '신청 내역 삭제에 실패했습니다.');
    } finally {
      setIsDeletingType(false);
      setDeleteTypeModalVisible(false);
      setSelectedTypeToDelete(null);
      setSelectedUserToDelete(null);
    }
  };

  const renderPreviewContent = () => {
    if (!selectedFile || !selectedFile.userId) return null;

    const isPdf = selectedFile.file_name.toLowerCase().endsWith('.pdf');
    const fileUrl = `${SERVER_URL}/admin/files/${selectedFile.userId}/${selectedFile.doc_id}`;

    console.log('Preview URL:', fileUrl);

    return (
      <Modal
        visible={previewModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setPreviewModalVisible(false);
          setSelectedFile(null);
          setPdfError(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.previewModalContent}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {selectedFile.file_name}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setPreviewModalVisible(false);
                  setSelectedFile(null);
                  setPdfError(null);
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {pdfLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2c5282" />
                <Text style={styles.loadingText}>파일을 불러오는 중...</Text>
              </View>
            ) : pdfError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#e53e3e" />
                <Text style={styles.errorText}>{pdfError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => handlePreviewFile(selectedFile)}
                >
                  <Text style={styles.retryButtonText}>다시 시도</Text>
                </TouchableOpacity>
              </View>
            ) : isPdf ? (
              <WebView
                source={{ 
                  uri: fileUrl,
                  headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/pdf'
                  }
                }}
                style={styles.webview}
                onLoadStart={() => {
                  console.log('WebView load started');
                  setPdfLoading(true);
                  setPdfError(null);
                }}
                onLoadEnd={() => {
                  console.log('WebView load ended');
                  setPdfLoading(false);
                }}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView error:', nativeEvent);
                  setPdfError(`PDF 파일을 불러오는데 실패했습니다. (${nativeEvent.description || '알 수 없는 오류'})`);
                  setPdfLoading(false);
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView HTTP error:', nativeEvent);
                  setPdfError(`서버 오류: ${nativeEvent.statusCode}`);
                  setPdfLoading(false);
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
                bounces={false}
                scrollEnabled={true}
                cacheEnabled={true}
                cacheMode="LOAD_CACHE_ELSE_NETWORK"
                onShouldStartLoadWithRequest={(request) => {
                  console.log('Loading request:', request);
                  return true;
                }}
              />
            ) : (
              <View style={styles.unsupportedContainer}>
                <Ionicons name="document" size={48} color="#a0aec0" />
                <Text style={styles.unsupportedText}>
                  이 파일 형식은 미리보기를 지원하지 않습니다.
                </Text>
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => handleDownloadFile(selectedFile)}
                >
                  <Ionicons name="download" size={20} color="#fff" />
                  <Text style={styles.downloadButtonText}>다운로드</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const renderUserSection = ({ item: userName }) => {
    const userData = applications[userName] || { applications: {} };
    const types = Object.keys(APPLICATION_TYPES);

    return (
      <View style={styles.userSection}>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={styles.userIconContainer}>
              <Ionicons name="person" size={24} color="#2c5282" />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userId}>{userName}</Text>
              <Text style={styles.userStats}>
                ID: {userData.username}
              </Text>
              <Text style={styles.userStats}>
                총 {Object.values(userData.applications).reduce((sum, app) => 
                  sum + (Array.isArray(app.files) ? app.files.length : 0), 0)}개의 파일
              </Text>
            </View>
          </View>
        </View>

        {types.map(type => {
          const appType = APPLICATION_TYPES[type];
          const app = userData.applications[type] || userData.applications[appType];
          if (!app) return null;

          return (
            <View key={`${userName}-${type}`} style={styles.typeSection}>
              <View style={styles.typeHeader}>
                <View style={styles.typeInfo}>
                  <Ionicons 
                    name={type.includes('Registration') ? "document-text-outline" : 
                          type.includes('Extension') ? "time-outline" : 
                          "business-outline"} 
                    size={20} 
                    color="#2c5282" 
                  />
                  <Text style={styles.typeTitle}>{appType || type}</Text>
                  <Text style={styles.typeCount}>
                    {Array.isArray(app.files) ? app.files.length : 0}개 파일
                  </Text>
                </View>
                <View style={styles.typeActions}>
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: STATUS_COLORS[app.status] || '#718096' }]}
                    onPress={() => handleStatusPress(app)}
                  >
                    <Ionicons 
                      name={app.status === '신청완료' ? "checkmark-circle-outline" :
                            app.status === '신청실패' ? "close-circle-outline" :
                            app.status === '접수완료' ? "time-outline" : "hourglass-outline"} 
                      size={16} 
                      color="#fff" 
                    />
                    <Text style={styles.statusButtonText}>{app.status}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteTypeButton}
                    onPress={() => handleDeleteType(userName, type)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#e53e3e" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.applicationInfo}>
                <Text style={styles.applicationDate}>
                  제출일시: {app.submitted_at}
                </Text>
                {app.updated_at && (
                  <Text style={styles.applicationDate}>
                    최종 수정: {app.updated_at}
                  </Text>
                )}
                {app.notes && (
                  <Text style={styles.notes}>
                    메모: {app.notes}
                  </Text>
                )}
              </View>

              {app.files && Array.isArray(app.files) && app.files.length > 0 && (
                <View style={styles.filesContainer}>
                  {app.files.map((file, fileIndex) => (
                    <View key={`${file.doc_id || fileIndex}-${file.file_name || 'unknown'}`} style={styles.fileItem}>
                      <TouchableOpacity
                        style={styles.fileInfo}
                        onPress={() => handlePreviewFile(file)}
                      >
                        <Ionicons name="document-text-outline" size={16} color="#4a5568" />
                        <View style={styles.fileDetails}>
                          <Text style={styles.fileName} numberOfLines={1}>
                            {file.file_name}
                          </Text>
                          <Text style={styles.fileType}>
                            {file.doc_id}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.fileButton}
                        onPress={() => handleDownloadFile(file)}
                      >
                        <Ionicons name="download-outline" size={20} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderStatusModal = () => (
    <Modal
      visible={statusModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setStatusModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>신청 상태 변경</Text>
            <TouchableOpacity
              onPress={() => setStatusModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#4a5568" />
            </TouchableOpacity>
          </View>

          <View style={styles.statusOptionsContainer}>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.statusOption,
                  { backgroundColor: option.color + '20' }, // 20% opacity
                  selectedApplication?.status === option.value && styles.selectedStatusOption
                ]}
                onPress={() => handleStatusUpdate(option.value)}
                disabled={updatingStatus}
              >
                <View style={[styles.statusIndicator, { backgroundColor: option.color }]} />
                <Text style={[
                  styles.statusOptionText,
                  { color: option.color }
                ]}>
                  {option.label}
                </Text>
                {selectedApplication?.status === option.value && (
                  <Ionicons name="checkmark-circle" size={20} color={option.color} style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {updatingStatus && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2c5282" />
              <Text style={styles.loadingText}>상태 업데이트 중...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderDeleteTypeModal = () => (
    <Modal
      visible={deleteTypeModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setDeleteTypeModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>신청 유형 삭제</Text>
            <TouchableOpacity
              onPress={() => setDeleteTypeModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#4a5568" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Ionicons name="warning" size={48} color="#e53e3e" style={styles.warningIcon} />
            <Text style={styles.modalText}>
              {selectedUserToDelete}님의 {APPLICATION_TYPES[selectedTypeToDelete]} 신청 내역을 모두 삭제하시겠습니까?
            </Text>
            <Text style={styles.modalSubText}>
              이 작업은 되돌릴 수 없으며, 모든 관련 파일도 함께 삭제됩니다.
            </Text>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setDeleteTypeModalVisible(false)}
              disabled={isDeletingType}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButton]}
              onPress={confirmDeleteType}
              disabled={isDeletingType}
            >
              {isDeletingType ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 추가 */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#2c5282" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>신청서 관리</Text>
              <Text style={styles.headerSubtitle}>외국인 근로자 신청서 관리</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchApplications}
          >
            <Ionicons name="refresh" size={24} color="#2c5282" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c5282" />
          <Text style={styles.loadingText}>신청서 목록을 불러오는 중...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchApplications}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={Object.keys(applications)}
          renderItem={renderUserSection}
          keyExtractor={username => username}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchApplications}
          refreshControl={
            <RefreshControl 
              refreshing={loading} 
              onRefresh={fetchApplications}
              colors={['#2c5282']}
              tintColor="#2c5282"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#cbd5e0" />
              <Text style={styles.emptyText}>신청된 내역이 없습니다</Text>
            </View>
          }
        />
      )}

      {renderStatusModal()}
      {renderDeleteTypeModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
  },
  userSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ebf8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  userStats: {
    fontSize: 13,
    color: '#718096',
  },
  expandButton: {
    padding: 8,
  },
  typeSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2d3748',
    marginLeft: 8,
    flex: 1,
  },
  typeCount: {
    fontSize: 13,
    color: '#718096',
    backgroundColor: '#edf2f7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  deleteTypeButton: {
    backgroundColor: '#fc8181',
    padding: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  applicationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  applicationInfo: {
    flex: 1,
  },
  applicationType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  applicationDate: {
    fontSize: 14,
    color: '#718096',
  },
  applicationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFA500',  // 기본값
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 4,
  },
  statusIcon: {
    marginHorizontal: 2,
  },
  fileList: {
    marginTop: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  fileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  fileName: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4a5568',
    flex: 1,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f7fafc',
  },
  previewButton: {
    backgroundColor: '#ebf8ff',
  },
  downloadButton: {
    backgroundColor: '#c6f6d5',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    padding: 0,
    overflow: 'hidden',
  },
  previewModalContent: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
    height: '100%',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2c5282',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  previewTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  statusInfoContainer: {
    padding: 16,
  },
  currentStatusContainer: {
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 8,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  statusDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
  statusDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  availableStatusContainer: {
    marginBottom: 16,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  statusOptionIcon: {
    marginRight: 8,
  },
  statusOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  modalButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    backgroundColor: '#f7fafc',
  },
  cancelButtonText: {
    color: '#4a5568',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#e53e3e',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2c5282',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#a0aec0',
    textAlign: 'center',
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageScrollView: {
    flex: 1,
  },
  imageScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdfViewer: {
    flex: 1,
  },
  unsupportedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  unsupportedText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  unsupportedSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  applicationInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f7fafc',
    borderRadius: 8,
  },
  notes: {
    fontSize: 14,
    color: '#4a5568',
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  statusOptionsContainer: {
    gap: 12,
  },
  selectedStatusOption: {
    borderWidth: 2,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  checkIcon: {
    marginLeft: 8,
  },
  fileDetails: {
    flex: 1,
    marginLeft: 8,
  },
  fileType: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
  filesContainer: {
    marginTop: 8,
  },
  fileButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#ebf8ff',
  },
  typeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalBody: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  warningIcon: {
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  deleteButton: {
    backgroundColor: '#e53e3e',
  },
  buttonIcon: {
    marginRight: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdminApplicationsScreen; 