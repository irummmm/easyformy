import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';

import StartScreen from '../screens/StartScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import ChatScreen from '../screens/ChatScreen';
import MyPageScreen from '../screens/MyPageScreen';
import DocsScreen from '../screens/DocsScreen';
import PassportVerificationScreen from '../screens/PassportVerificationScreen';
import ResidenceCardVerificationScreen from '../screens/ResidenceCardVerificationScreen';
import VisitReservationScreen from '../screens/VisitReservationScreen';
import ComplaintFormScreen from '../screens/ComplaintFormScreen';
import RegistrationFormScreen from '../screens/RegistrationFormScreen';
import MyApplicationsScreen from '../screens/MyApplicationsScreen';
import AdminApplicationsScreen from '../screens/AdminApplicationsScreen';
import DocsDetailScreen from '../screens/DocsDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Add a loading component
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Loading...</Text>
  </View>
);

// Wrap screen components with error boundary
const withErrorBoundary = (WrappedComponent) => {
  return function ErrorBoundaryWrapper(props) {
    try {
      return <WrappedComponent {...props} />;
    } catch (error) {
      console.error('Screen Error:', error);
      return <LoadingScreen />;
    }
  };
};

// Wrap each screen component
const SafeChatScreen = withErrorBoundary(ChatScreen);
const SafeMyPageScreen = withErrorBoundary(MyPageScreen);
const SafeDocsScreen = withErrorBoundary(DocsScreen);
const SafeStartScreen = withErrorBoundary(StartScreen);
const SafeLoginScreen = withErrorBoundary(LoginScreen);
const SafeSignUpScreen = withErrorBoundary(SignUpScreen);
const SafeWelcomeScreen = withErrorBoundary(WelcomeScreen);
const SafePassportVerificationScreen = withErrorBoundary(PassportVerificationScreen);
const SafeResidenceCardVerificationScreen = withErrorBoundary(ResidenceCardVerificationScreen);
const SafeVisitReservationScreen = withErrorBoundary(VisitReservationScreen);
const SafeComplaintFormScreen = withErrorBoundary(ComplaintFormScreen);
const SafeRegistrationFormScreen = withErrorBoundary(RegistrationFormScreen);
const SafeMyApplicationsScreen = withErrorBoundary(MyApplicationsScreen);
const SafeAdminApplicationsScreen = withErrorBoundary(AdminApplicationsScreen);
const SafeDocsDetailScreen = withErrorBoundary(DocsDetailScreen);

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Chat"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Chat') iconName = 'chatbubbles';
          else if (route.name === 'Docs') iconName = 'document-text';
          else if (route.name === 'MyPage') iconName = 'person';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Chat" component={SafeChatScreen} />
      <Tab.Screen name="Docs" component={SafeDocsScreen} />
      <Tab.Screen name="MyPage" component={SafeMyPageScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator 
      initialRouteName="Start" 
      screenOptions={{ 
        headerShown: false,
        // Add default screen options for better error handling
        animation: 'none', // Disable animations temporarily for debugging
        presentation: 'card',
      }}
    >
      <Stack.Screen name="Start" component={SafeStartScreen} />
      <Stack.Screen name="Login" component={SafeLoginScreen} />
      <Stack.Screen 
        name="SignUp" 
        component={SafeSignUpScreen}
        options={{ title: '회원가입' }}
      />
      <Stack.Screen 
        name="PassportVerification" 
        component={SafePassportVerificationScreen}
        options={{ title: '여권 정보 확인' }}
      />
      <Stack.Screen 
        name="ResidenceCardVerification" 
        component={SafeResidenceCardVerificationScreen}
        options={{ title: '외국인 등록증 정보 확인' }}
      />
      <Stack.Screen name="Welcome" component={SafeWelcomeScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="VisitReservation" component={SafeVisitReservationScreen} />
      <Stack.Screen name="ComplaintForm" component={SafeComplaintFormScreen} />
      <Stack.Screen 
        name="RegistrationForm" 
        component={SafeRegistrationFormScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Admin" component={SafeAdminApplicationsScreen} />
      <Stack.Screen 
        name="MyApplications" 
        component={SafeMyApplicationsScreen}
        options={{ title: '나의 신청 내역' }}
      />
      <Stack.Screen 
        name="AdminApplications" 
        component={SafeAdminApplicationsScreen}
        options={{ title: '신청 내역 관리' }}
      />
      <Stack.Screen 
        name="DocsDetail" 
        component={SafeDocsDetailScreen} 
        options={{ title: '신청 유형 상세' }} 
      />
    </Stack.Navigator>
  );
} 