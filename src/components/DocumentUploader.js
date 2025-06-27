import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFileToBlob } from '../config/azureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';

const SERVER_URL = 'http://192.168.35.173:5000';

const DocumentUploader = ({ 
  applicationType,
  onApplicationSubmit,
  onUploadComplete,
  requiredDocs = []
}) => {
  const { languageCode } = useLanguage();
  const [uploading, setUploading] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});
  const [applicationId, setApplicationId] = useState(null);
  const [isNewApplication, setIsNewApplication] = useState(false);

  const isEnglish = languageCode === 'en';

  const getLocalizedText = (text, defaultText = '') => {
    if (!text) return defaultText;
    if (typeof text === 'string') return text;
    if (typeof text === 'object' && text !== null) {
      return isEnglish ? (text.en || defaultText) : (text.ko || defaultText);
    }
    return defaultText;
  };

  const pickDocument = async (documentId) => {
    if (!documentId) return;
    
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
        type: ['application/pdf', 'image/*'], 
        copyToCacheDirectory: true 
      });
      if (result.canceled) return;
      setSelectedFiles(prev => ({ ...prev, [documentId]: result.assets[0] }));
    } catch (err) { 
      console.error('Error picking document:', err); 
    }
  };

  const handleSubmit = async () => {
    if (!requiredDocs || requiredDocs.length === 0) {
      Alert.alert(
        isEnglish ? 'Error' : '오류',
        isEnglish ? 'No documents required.' : '필요한 문서가 없습니다.'
      );
      return;
    }

    try {
      setUploading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert(
          isEnglish ? 'Error' : '오류',
          isEnglish ? 'Login required.' : '로그인이 필요합니다.'
        );
        return;
      }

      const missingDocs = requiredDocs.filter(doc => doc && !selectedFiles[doc.id]);
      if (missingDocs.length > 0) {
        const missingDocNames = missingDocs
          .map(doc => doc ? getLocalizedText(doc.title, 'Unknown Document') : 'Unknown Document')
          .filter(Boolean);

        Alert.alert(
          isEnglish ? 'Missing Documents' : '필수 문서 누락',
          isEnglish 
            ? `Please upload the following documents:\n${missingDocNames.join('\n')}`
            : `다음 문서를 업로드해주세요:\n${missingDocNames.join('\n')}`
        );
        return;
      }

      for (const [docId, file] of Object.entries(selectedFiles)) {
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          type: file.type,
          name: file.name
        });
        formData.append('doc_id', docId);
        formData.append('type', applicationType);

        const response = await fetch(`${SERVER_URL}/upload/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || '파일 업로드 실패');
        }

        const result = await response.json();
        
        if (!applicationId) {
          setApplicationId(result.application_id);
          setIsNewApplication(result.is_new_application);
        }
      }

      if (onApplicationSubmit) {
        await onApplicationSubmit(applicationId || selectedFiles[Object.keys(selectedFiles)[0]].application_id);
      }

      if (onUploadComplete) {
        onUploadComplete();
      }

      Alert.alert(
        isEnglish ? 'Success' : '성공',
        isEnglish 
          ? (isNewApplication ? 'New application created.' : 'Files uploaded successfully.')
          : (isNewApplication ? '새로운 신청서가 생성되었습니다.' : '파일이 성공적으로 업로드되었습니다.')
      );

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert(
        isEnglish ? 'Error' : '오류',
        isEnglish ? 'Error occurred while uploading files.' : '파일 업로드 중 오류가 발생했습니다.'
      );
    } finally {
      setUploading(false);
    }
  };

  const allUploaded = requiredDocs && requiredDocs.length > 0 && 
    requiredDocs.every(doc => doc && doc.id && selectedFiles[doc.id]);

  if (!requiredDocs || requiredDocs.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {isEnglish ? 'No documents required.' : '필요한 문서가 없습니다.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        {isEnglish ? 'Required Documents Upload' : '필요 서류 업로드'}
      </Text>
      <Text style={styles.subtitle}>
        {isEnglish ? 'Please upload the required documents' : '필수 서류를 업로드해주세요'}
      </Text>
      {requiredDocs.map((doc, index) => {
        if (!doc || !doc.id) return null;
        
        return (
          <View key={`${doc.id}-${index}`} style={styles.documentItem}>
          <View style={styles.documentHeader}>
              <Text style={styles.documentTitle}>
                {getLocalizedText(doc.title, isEnglish ? 'Document' : '서류')}
              </Text>
            <TouchableOpacity 
              style={[
                styles.uploadButton,
                selectedFiles[doc.id] && styles.uploadedButton
              ]} 
              onPress={() => pickDocument(doc.id)}
              disabled={uploading[doc.id]}
            >
              {uploading[doc.id] ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.uploadButtonText}>
                    {selectedFiles[doc.id] 
                      ? (isEnglish ? 'Uploaded' : '업로드 완료')
                      : (isEnglish ? 'Select File' : '파일 선택')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
            {doc.description && (
              <Text style={styles.documentDescription}>
                {getLocalizedText(doc.description, '')}
              </Text>
            )}
          {selectedFiles[doc.id] && (
            <Text style={styles.uploadedFileName}>
                {isEnglish ? 'Selected file: ' : '선택된 파일: '}
                {selectedFiles[doc.id].name}
            </Text>
          )}
        </View>
        );
      })}
      <TouchableOpacity
        style={[
          styles.submitButton,
          allUploaded ? styles.uploadedButton : styles.disabledButton
        ]}
        disabled={!allUploaded || Object.values(uploading).some(Boolean)}
        onPress={handleSubmit}
      >
        <Text style={styles.uploadButtonText}>
          {isEnglish ? 'Submit Application' : '신청서 제출'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4a5568',
    marginBottom: 24,
  },
  documentItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
    flex: 1,
    marginRight: 16,
  },
  documentDescription: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
  },
  uploadButton: {
    backgroundColor: '#2c5282',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  uploadedButton: {
    backgroundColor: '#38a169',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  uploadedFileName: {
    fontSize: 14,
    color: '#38a169',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#2c5282',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    backgroundColor: '#cbd5e0',
  },
  errorText: {
    fontSize: 16,
    color: '#e53e3e',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default DocumentUploader; 