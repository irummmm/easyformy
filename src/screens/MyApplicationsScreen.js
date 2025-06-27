import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
const SERVER_URL = 'http://192.168.35.173:5000';

const STATUS_COLORS = {
  '신청중': '#FFA500',  // 주황색
  '접수완료': '#4169E1',  // 파란색
  '신청완료': '#32CD32',  // 초록색
  '신청실패': '#FF0000',  // 빨간색
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

// 화면에 표시할 타입 (TYPE_MAPPING의 값과 동일하게 설정)
const APPLICATION_TYPES = Object.fromEntries(
  Object.entries(TYPE_MAPPING).map(([_, value]) => [value, value])
);

const MyApplicationsScreen = ({ navigation }) => {
  const [applications, setApplications] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchApplications().finally(() => setRefreshing(false));
  }, []);

  const fetchApplications = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('알림', '로그인이 필요합니다.');
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${SERVER_URL}/my/applications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.status === 401) {
        await AsyncStorage.removeItem('userToken');
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

      // 데이터 변환 및 유형별 그룹화
      const formattedData = data.map(app => ({
        ...app,
        type: TYPE_MAPPING[app.type] || app.type, // 타입을 한글로 변환
        status: statusMap[app.status] || app.status,
        submitted_at: new Date(app.submitted_at).toLocaleString('ko-KR'),
        updated_at: app.updated_at ? new Date(app.updated_at).toLocaleString('ko-KR') : null,
        files: app.files || []
      }));

      // 유형별로 그룹화
      const groupedApplications = formattedData.reduce((acc, app) => {
        const type = app.type;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(app);
        return acc;
      }, {});

      setApplications(groupedApplications);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError(error.message || '신청 내역을 가져오는데 실패했습니다.');
      setLoading(false);
    }
  };

  const renderApplicationItem = (app) => (
    <View style={styles.applicationItem}>
      <View style={styles.applicationHeader}>
        <View style={styles.applicationInfo}>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[app.status] || '#718096' }]}>
            <Ionicons 
              name={app.status === '신청완료' ? "checkmark-circle-outline" :
                    app.status === '신청실패' ? "close-circle-outline" :
                    app.status === '접수완료' ? "time-outline" : "hourglass-outline"} 
              size={16} 
              color="#fff" 
            />
            <Text style={styles.statusText}>{app.status}</Text>
    </View>
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
        </View>
        
      {app.files && app.files.length > 0 && (
        <View style={styles.filesContainer}>
          {app.files.map((file, index) => (
            <View key={index} style={styles.fileItem}>
              <View style={styles.fileInfo}>
                <Ionicons name="document-text-outline" size={16} color="#4a5568" />
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.file_name}
                  </Text>
                  <Text style={styles.fileType}>
                    {file.doc_id}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderTypeSection = (type, applications) => {
    if (!applications || applications.length === 0) return null;

    const iconName = type.includes('외국인등록') ? "document-text-outline" : 
                    type.includes('체류기간') ? "time-outline" : 
                    "business-outline";

    return (
      <View key={type} style={styles.typeSection}>
        <View style={styles.typeHeader}>
          <View style={styles.typeInfo}>
            <Ionicons 
              name={iconName}
              size={20} 
              color="#2c5282" 
            />
            <Text style={styles.typeTitle}>{type}</Text>
            <Text style={styles.typeCount}>{applications.length}건</Text>
          </View>
        </View>
        {applications.map((app, index) => (
          <View key={index}>
            {renderApplicationItem(app)}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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
              <Text style={styles.headerTitle}>나의 신청 내역</Text>
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

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#2c5282']}
            tintColor="#2c5282"
          />
        }
      >
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
        ) : Object.keys(applications).length === 0 ? (
        <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#cbd5e0" />
            <Text style={styles.emptyText}>신청된 내역이 없습니다</Text>
        </View>
      ) : (
          <View style={styles.listContent}>
            {Object.entries(applications).map(([type, apps]) => renderTypeSection(type, apps))}
          </View>
        )}
        </ScrollView>
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
  typeSection: {
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
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
  applicationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  applicationHeader: {
    marginBottom: 12,
  },
  applicationInfo: {
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  applicationDate: {
    fontSize: 14,
    color: '#4a5568',
  },
  notes: {
    fontSize: 14,
    color: '#718096',
    fontStyle: 'italic',
  },
  filesContainer: {
    marginTop: 12,
    gap: 8,
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileDetails: {
    flex: 1,
    marginLeft: 8,
  },
  fileName: {
    fontSize: 14,
    color: '#4a5568',
  },
  fileType: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
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
});

export default MyApplicationsScreen; 