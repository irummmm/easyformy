import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = 'http://192.168.35.173:5000';

// Storage Account 정보
const accountName = 'dhlrnrdls77';
const accountKey = 'your_account_key_here';  // 실제 키로 교체 필요
const containerName = 'documents';

// Create a SharedKeyCredential object
const sharedKeyCredential = new StorageSharedKeyCredential(
  accountName,
  accountKey
);

// Create a BlobServiceClient object
const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  sharedKeyCredential
);

// Get a container client
const containerClient = blobServiceClient.getContainerClient(containerName);

export { SERVER_URL, containerName };

export const uploadFileToBlob = async (file, userId, docId) => {
  try {
    // 토큰 가져오기
    const userToken = await AsyncStorage.getItem('userToken');
    if (!userToken) {
      throw new Error('로그인이 필요합니다.');
    }

    // FormData 생성
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
    });
    formData.append('doc_id', docId);

    console.log('Uploading file to:', `${SERVER_URL}/upload/`);  // 디버깅용
    console.log('FormData:', formData);  // 디버깅용

    // Flask 서버로 업로드 요청
    const response = await fetch(`${SERVER_URL}/upload/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${userToken}`
      },
      body: formData,
    });

    console.log('Upload response status:', response.status);  // 디버깅용
    const data = await response.json();
    console.log('Upload response data:', data);  // 디버깅용

    if (response.status === 401) {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userInfo');
      throw new Error('로그인이 만료되었습니다. 다시 로그인해주세요.');
    }

    if (response.ok) {
      return data.file_url;
    } else {
      throw new Error(data.error || data.message || '업로드 실패');
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}; 