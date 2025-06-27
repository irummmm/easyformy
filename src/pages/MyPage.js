import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/MyPage.css';

const MyPage = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchUserInfo = async () => {
      try {
        const response = await axios.get('http://localhost:5000/user-info', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserInfo(response.data);
      } catch (error) {
        console.error('Error fetching user info:', error);
        if (error.response && error.response.status === 401) {
          navigate('/login');
        }
      }
    };

    fetchUserInfo();
  }, [navigate]);

  if (!userInfo) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mypage-container">
      <div className="mypage-header">
        <h1>마이페이지</h1>
      </div>
      
      <div className="mypage-content">
        <div className="mypage-sidebar">
          <button 
            className={`sidebar-button ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            기본 정보
          </button>
          <button 
            className={`sidebar-button ${activeTab === 'passport' ? 'active' : ''}`}
            onClick={() => setActiveTab('passport')}
          >
            여권 정보
          </button>
          <button 
            className={`sidebar-button ${activeTab === 'residence' ? 'active' : ''}`}
            onClick={() => setActiveTab('residence')}
          >
            외국인등록증
          </button>
          <button 
            className={`sidebar-button ${activeTab === 'visa' ? 'active' : ''}`}
            onClick={() => setActiveTab('visa')}
          >
            비자 정보
          </button>
        </div>

        <div className="mypage-main">
          {activeTab === 'basic' && (
            <div className="info-section">
              <h2>기본 정보</h2>
              <div className="info-content">
                <div className="info-item">
                  <span className="info-label">이름:</span>
                  <span className="info-value">{userInfo.name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">생년월일:</span>
                  <span className="info-value">{userInfo.birth_date}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">이메일:</span>
                  <span className="info-value">{userInfo.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">아이디:</span>
                  <span className="info-value">{userInfo.username}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'passport' && (
            <div className="info-section">
              <h2>여권 정보</h2>
              {userInfo.passport ? (
                <div className="info-content">
                  <div className="info-item">
                    <span className="info-label">성:</span>
                    <span className="info-value">{userInfo.passport.surname}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">이름:</span>
                    <span className="info-value">{userInfo.passport.givenname}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">여권번호:</span>
                    <span className="info-value">{userInfo.passport.passport_number}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">국적:</span>
                    <span className="info-value">{userInfo.passport.nationality}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">성별:</span>
                    <span className="info-value">{userInfo.passport.sex}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">발급일:</span>
                    <span className="info-value">{userInfo.passport.issue_date}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">만료일:</span>
                    <span className="info-value">{userInfo.passport.expiry_date}</span>
                  </div>
                </div>
              ) : (
                <p>등록된 여권 정보가 없습니다.</p>
              )}
            </div>
          )}

          {activeTab === 'residence' && (
            <div className="info-section">
              <h2>외국인등록증 정보</h2>
              {userInfo.residence_card ? (
                <div className="info-content">
                  <div className="info-item">
                    <span className="info-label">한글 이름:</span>
                    <span className="info-value">{userInfo.residence_card.name_kor}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">외국인등록번호:</span>
                    <span className="info-value">{userInfo.residence_card.resident_id}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">체류자격:</span>
                    <span className="info-value">{userInfo.residence_card.visa_type}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">발급일:</span>
                    <span className="info-value">{userInfo.residence_card.issue_date}</span>
                  </div>
                </div>
              ) : (
                <p>등록된 외국인등록증 정보가 없습니다.</p>
              )}
            </div>
          )}

          {activeTab === 'visa' && (
            <div className="info-section">
              <h2>비자 정보</h2>
              {userInfo.visa ? (
                <div className="info-content">
                  <div className="info-item">
                    <span className="info-label">비자 종류:</span>
                    <span className="info-value">{userInfo.visa.visa_type}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">입국일:</span>
                    <span className="info-value">{userInfo.visa.entry_date}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">만료일:</span>
                    <span className="info-value">{userInfo.visa.expiry_date}</span>
                  </div>
                  {userInfo.visa.extension_start && (
                    <>
                      <div className="info-item">
                        <span className="info-label">연장 시작일:</span>
                        <span className="info-value">{userInfo.visa.extension_start}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">연장 만료일:</span>
                        <span className="info-value">{userInfo.visa.extension_end}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">연장 횟수:</span>
                        <span className="info-value">{userInfo.visa.extension_count}회</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p>등록된 비자 정보가 없습니다.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPage; 