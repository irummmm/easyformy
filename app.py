from flask import Flask, jsonify, request, send_file, make_response, g
from flask_cors import CORS
import openai
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import requests
import re
import json
import time
from PIL import Image
import io
import jwt
from functools import wraps
from difflib import SequenceMatcher
from werkzeug.security import check_password_hash
import PyPDF2
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import letter
from azure.storage.blob import BlobServiceClient, ContentSettings, generate_blob_sas, BlobSasPermissions, AccountSasPermissions, ResourceTypes, generate_account_sas
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from io import BytesIO
import tempfile
import urllib.parse
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser
from langchain_openai import AzureChatOpenAI
from langchain.memory import ConversationSummaryMemory
from langchain.chains import ConversationalRetrievalChain
from openai import AzureOpenAI
import mysql.connector
from mysql.connector import Error
#from langchain_community.retrievers.azure_cognitive_search import AzureCognitiveSearchRetriever
from langchain_community.retrievers import AzureCognitiveSearchRetriever

# 명시적으로 .env.txt 파일 경로 지정
load_dotenv('.env.txt', encoding='utf-8')

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})


@app.route("/")
def home():
    return "Flask 앱이 정상적으로 실행되고 있습니다."

# 서버 URL 설정
SERVER_URL = 'http://192.168.35.173:5000'  # 새로운 서버 IP 주소

# DB 설정
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_HOST = os.getenv("MYSQL_HOST")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")  # 기본값 3306
MYSQL_DB = os.getenv("MYSQL_DB")

# SQLAlchemy URI 생성
app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT 설정
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)

# DB 초기화
db = SQLAlchemy(app)




# Azure Storage 설정
AZURE_ACCOUNT_NAME = os.getenv("AZURE_ACCOUNT_NAME")
AZURE_ACCOUNT_KEY =  os.getenv("AZURE_ACCOUNT_KEY")
AZURE_CONTAINER =  os.getenv("AZURE_CONTAINER")

# Blob Service Client 생성
blob_service_client = BlobServiceClient(
    account_url=f"https://{AZURE_ACCOUNT_NAME}.blob.core.windows.net",
    credential=AZURE_ACCOUNT_KEY
)

# Container Client 가져오기
container_client = blob_service_client.get_container_client(AZURE_CONTAINER)

# 상대 경로 기반으로 폰트 경로 지정
font_path = os.path.join(os.path.dirname(__file__), 'fonts', 'NotoSansKR-VariableFont_wght.ttf')

if os.path.exists(font_path):
    pdfmetrics.registerFont(TTFont('NotoSansKR', font_path))
else:
    raise FileNotFoundError(f"폰트 파일을 찾을 수 없습니다: {font_path}")

# Passport 모델 정의
class Passport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    surname = db.Column(db.String(100))
    givenname = db.Column(db.String(100))
    passport_number = db.Column(db.String(20))
    nationality = db.Column(db.String(100))
    sex = db.Column(db.String(1))
    country_code = db.Column(db.String(3))
    issue_date = db.Column(db.Date)
    expiry_date = db.Column(db.Date)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'surname': self.surname,
            'givenname': self.givenname,
            'passport_number': self.passport_number,
            'nationality': self.nationality,
            'sex': self.sex,
            'country_code': self.country_code,
            'issue_date': self.issue_date.strftime('%Y-%m-%d') if self.issue_date else None,
            'expiry_date': self.expiry_date.strftime('%Y-%m-%d') if self.expiry_date else None,
            'is_verified': self.is_verified
        }

# ResidenceCard 모델 정의
class ResidenceCard(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name_kor = db.Column(db.String(100))
    resident_id = db.Column(db.String(20))
    visa_type = db.Column(db.String(100))
    issue_date = db.Column(db.Date)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name_kor': self.name_kor,
            'resident_id': self.resident_id,
            'visa_type': self.visa_type,
            'issue_date': self.issue_date.strftime('%Y-%m-%d') if self.issue_date else None,
            'is_verified': self.is_verified
        }

# Visa 모델 정의
class Visa(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    visa_type = db.Column(db.String(10), nullable=False)  # E-8 or E-9
    entry_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date, nullable=False)
    extension_start = db.Column(db.Date)
    extension_end = db.Column(db.Date)
    extension_count = db.Column(db.Integer, default=0)  # 연장 횟수 추가
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'visa_type': self.visa_type,
            'entry_date': self.entry_date.strftime('%Y-%m-%d') if self.entry_date else None,
            'expiry_date': self.expiry_date.strftime('%Y-%m-%d') if self.expiry_date else None,
            'extension_start': self.extension_start.strftime('%Y-%m-%d') if self.extension_start else None,
            'extension_end': self.extension_end.strftime('%Y-%m-%d') if self.extension_end else None,
            'extension_count': self.extension_count
        }

# User 모델 정의
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    birth_date = db.Column(db.Date, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    passport = db.relationship('Passport', backref='user', uselist=False)
    residence_card = db.relationship('ResidenceCard', backref='user', uselist=False)
    visa = db.relationship('Visa', backref='user', uselist=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'birth_date': self.birth_date.strftime('%Y-%m-%d') if self.birth_date else None,
            'email': self.email,
            'username': self.username,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'passport': self.passport.to_dict() if self.passport else None,
            'residence_card': self.residence_card.to_dict() if self.residence_card else None,
            'visa': self.visa.to_dict() if self.visa else None
        }

# OCR 설정
OCR_ENDPOINT =  os.getenv("OCT_ENDPOINT")
OCR_KEY =  os.getenv("OCR_KEY")
OCR_URL = f"{OCR_ENDPOINT}/vision/v3.2/read/analyze"

def process_passport_image(image_data):
    try:
        print("OCR 설정 확인:")
        print(f"Endpoint: {OCR_ENDPOINT}")
        print(f"URL: {OCR_URL}")
        print(f"이미지 데이터 크기: {len(image_data)} bytes")

        headers = {
            "Ocp-Apim-Subscription-Key": OCR_KEY,
            "Content-Type": "application/octet-stream"
        }
        params = {
            "language": "ko",
            "detectOrientation": "true"
        }

        print("OCR API 호출 시작")
        try:
            response = requests.post(OCR_URL, headers=headers, data=image_data)
            response.raise_for_status()  # HTTP 오류 체크
            print(f"OCR API 응답 상태 코드: {response.status_code}")
            print(f"OCR API 응답 헤더: {response.headers}")
        except requests.exceptions.RequestException as e:
            print(f"OCR API 호출 실패: {str(e)}")
            return None

        if "Operation-Location" not in response.headers:
            print("Operation-Location 헤더 없음")
            return None

        operation_url = response.headers["Operation-Location"]
        print(f"Operation URL: {operation_url}")

        print("OCR 결과 대기 시작")
        max_attempts = 10
        for attempt in range(max_attempts):
            try:
                result_response = requests.get(operation_url, headers={"Ocp-Apim-Subscription-Key": OCR_KEY})
                result_response.raise_for_status()
                result = result_response.json()
                
                print(f"OCR 상태 확인 ({attempt + 1}/{max_attempts}): {result.get('status')}")
                
                if result["status"] == "succeeded":
                    break
                elif result["status"] == "failed":
                    print("OCR 분석 실패:", result)
                    return None
                elif result["status"] == "running":
                    time.sleep(0.5)
                else:
                    print(f"예상치 못한 상태: {result['status']}")
                    return None
            except requests.exceptions.RequestException as e:
                print(f"OCR 결과 확인 실패: {str(e)}")
                return None
        else:
            print("OCR 처리 시간 초과")
            return None

        print("OCR 결과 추출 시작")
        full_text = ""
        for read_result in result.get("analyzeResult", {}).get("readResults", []):
            for line in read_result.get("lines", []):
                full_text += line["text"] + "\n"

        print("추출된 텍스트:", full_text)

        # 여권 정보 추출
        surname_match = re.search(r"성\s*/\s*Surname\s*([A-Z]+)", full_text)
        givenname_match = re.search(r"이름\s*/\s*Givenname\s*([A-Z]+)", full_text)
        passport_match = re.search(r"\bM[A-Z0-9]{6,8}\b", full_text)
        nationality_match = re.search(r"국적\s*/\s*Nationality\s*\n.*\n([A-Z ]+)", full_text)
        sex_match = re.search(r"성별\s*/\s*Sex\s*\n.*\n([FM])\b", full_text)
        code_match = re.search(r"국가코드\s*/\s*Country Code\s*\n.*\n.*\n([A-Z]+)", full_text)

        lines = full_text.splitlines()
        def extract_date_by_label(label_en):
            for i, line in enumerate(lines):
                if label_en.lower() in line.lower():
                    if i + 2 < len(lines):
                        return lines[i + 2].strip()
            return None

        passport_data = {
            "surname": surname_match.group(1) if surname_match else None,
            "givenname": givenname_match.group(1) if givenname_match else None,
            "passport_number": passport_match.group(0) if passport_match else None,
            "nationality": nationality_match.group(1).strip() if nationality_match else None,
            "sex": sex_match.group(1) if sex_match else None,
            "country_code": code_match.group(1) if code_match else None,
            "issue_date": extract_date_by_label("Date of issue"),
            "expiry_date": extract_date_by_label("Date of expiry")
        }

        print("추출된 여권 정보:", passport_data)
        return passport_data

    except Exception as e:
        print("OCR 처리 중 오류:", str(e))
        import traceback
        print("상세 오류:", traceback.format_exc())
        return None

def process_residence_card(image_data):
    try:
        print("OCR 설정 확인:")
        print(f"Endpoint: {OCR_ENDPOINT}")
        print(f"URL: {OCR_URL}")
        print(f"이미지 데이터 크기: {len(image_data)} bytes")

        headers = {
            "Ocp-Apim-Subscription-Key": OCR_KEY,
            "Content-Type": "application/octet-stream"
        }
        params = {
            "language": "ko",
            "detectOrientation": "true"
        }

        print("OCR API 호출 시작")
        try:
            response = requests.post(OCR_URL, headers=headers, data=image_data)
            response.raise_for_status()
            print(f"OCR API 응답 상태 코드: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"OCR API 호출 실패: {str(e)}")
            return None

        if "Operation-Location" not in response.headers:
            print("Operation-Location 헤더 없음")
            return None

        operation_url = response.headers["Operation-Location"]
        print(f"Operation URL: {operation_url}")

        print("OCR 결과 대기 시작")
        max_attempts = 10
        for attempt in range(max_attempts):
            try:
                result_response = requests.get(operation_url, headers={"Ocp-Apim-Subscription-Key": OCR_KEY})
                result_response.raise_for_status()
                result = result_response.json()
                
                if result["status"] == "succeeded":
                    break
                elif result["status"] == "failed":
                    print("OCR 분석 실패:", result)
                    return None
                elif result["status"] == "running":
                    time.sleep(0.5)
                else:
                    print(f"예상치 못한 상태: {result['status']}")
                    return None
            except requests.exceptions.RequestException as e:
                return None
        else:
            print("OCR 처리 시간 초과")
            return None

        print("OCR 결과 추출 시작")
        full_text = ""
        for read_result in result.get("analyzeResult", {}).get("readResults", []):
            for line in read_result.get("lines", []):
                full_text += line["text"] + "\n"

        print("추출된 텍스트:", full_text)

        # 외국인 등록증 정보 추출
        name_kor_match = re.search(r"\(([가-힣]{2,5})\)", full_text)
        resident_id_match = re.search(r"외국인등록번호\s*([A-Z0-9-]+)", full_text)
        visa_type_match = re.search(r"체류자격\s*([가-힣]+)", full_text)
        issue_date_match = re.search(r"발급일자\s*Issue Date\s*(\d{4}\.\d{2}\.\d{2}\.)", full_text)

        if not all([name_kor_match, resident_id_match, visa_type_match, issue_date_match]):
            raise ValueError("Failed to extract all required information from residence card")

        # 날짜 형식 변환 (YYYY.MM.DD. -> YYYY-MM-DD)
        issue_date = issue_date_match.group(1).replace('.', '-').rstrip('-')

        residence_data = {
            'name_kor': name_kor_match.group(1),
            'resident_id': resident_id_match.group(1),
            'visa_type': visa_type_match.group(1),
            'issue_date': issue_date
        }

        print("추출된 외국인 등록증 정보:", residence_data)
        return residence_data

    except Exception as e:
        print("OCR 처리 중 오류:", str(e))
        import traceback
        print("상세 오류:", traceback.format_exc())
        return None

# Application 모델 정의
class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # e8Registration, e9Extension 등
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, approved, rejected
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = db.Column(db.Text)
    
    # 관계 설정
    user = db.relationship('User', backref=db.backref('applications', lazy=True))
    files = db.relationship('ApplicationFile', backref='application', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'status': self.status,
            'submitted_at': self.submitted_at.strftime('%Y-%m-%d %H:%M:%S') if self.submitted_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
            'notes': self.notes,
            'files': [file.to_dict() for file in self.files]
        }

# ApplicationFile 모델 정의
class ApplicationFile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey('application.id'), nullable=False)
    doc_id = db.Column(db.String(50), nullable=False)  # application_form, passport 등
    file_name = db.Column(db.String(255), nullable=False)
    file_url = db.Column(db.String(500), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'doc_id': self.doc_id,
            'file_name': self.file_name,
            'file_url': self.file_url,
            'uploaded_at': self.uploaded_at.strftime('%Y-%m-%d %H:%M:%S') if self.uploaded_at else None
        }

# 데이터베이스 테이블 생성 부분 수정
with app.app_context():
    try:
        # 기존 테이블 삭제 (개발 환경에서만 사용)
        # db.drop_all()
        # 테이블 생성 (없는 경우에만)
        db.create_all()
        print("데이터베이스 연결 성공!")
        print("데이터베이스 URL:", app.config['SQLALCHEMY_DATABASE_URI'])
    except Exception as e:
        print("데이터베이스 연결 실패!")
        print("에러 메시지:", str(e))

# 데이터베이스 연결 상태 확인 엔드포인트
@app.route('/check-db', methods=['GET'])
def check_db():
    try:
        # 간단한 쿼리 실행
        db.session.execute('SELECT 1')
        return jsonify({
            'status': 'success',
            'message': '데이터베이스 연결 정상',
            'database_url': app.config['SQLALCHEMY_DATABASE_URI']
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': '데이터베이스 연결 실패',
            'error': str(e)
        }), 500

openai.api_key = "YOUR_AZURE_OPENAI_KEY"

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            data = decode_token(token)
            # user_id로 사용자 조회
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
            g.user = data
        except Exception as e:
            print(f"Token validation error: {str(e)}")
            return jsonify({'error': str(e)}), 401

        return f(current_user, *args, **kwargs)
    return decorated

def create_access_token(user_data):
    """JWT 토큰 생성"""
    try:
        now = datetime.utcnow()
        # user_id를 필수로 포함하고 username은 추가 정보로 포함
        payload = {
            'user_id': user_data['id'],  # 데이터베이스의 user_id 사용
            'username': user_data['username'],  # 추가 정보로 username 포함
            'name': user_data['name'],
            'email': user_data.get('email', ''),
            'exp': now + app.config['JWT_ACCESS_TOKEN_EXPIRES'],
            'iat': now
        }
        print(f"Creating token with payload: {payload}")  # 디버깅용
        token = jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')
        if isinstance(token, bytes):
            token = token.decode('utf-8')
        print(f"Generated token: {token[:20]}...")  # 디버깅용
        return token
    except Exception as e:
        print(f"Token creation error: {str(e)}")
        raise

def decode_token(token):
    """JWT 토큰 검증 및 디코딩"""
    try:
        print(f"Attempting to decode token: {token[:20]}...")  # 디버깅용
        payload = jwt.decode(
            token, 
            app.config['JWT_SECRET_KEY'], 
            algorithms=['HS256'],
            options={
                'verify_exp': True,
                'verify_iat': True,
                'require': ['exp', 'iat', 'user_id']  # user_id를 필수 필드로 지정
            }
        )
        print(f"Decoded payload: {payload}")  # 디버깅용
        return payload
    except jwt.ExpiredSignatureError:
        print("Token has expired")
        raise Exception('Token has expired')
    except jwt.InvalidTokenError as e:
        print(f"Invalid token: {str(e)}")
        raise Exception(f'Invalid token: {str(e)}')
    except Exception as e:
        print(f"Token decode error: {str(e)}")
        raise

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            print("No Authorization header")  # 디버깅용
            return jsonify({'message': 'Missing authorization header'}), 401
            
        try:
            # Bearer 토큰 형식 검증
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                print(f"Invalid auth header format: {auth_header}")  # 디버깅용
                return jsonify({'message': 'Invalid token format'}), 401
                
            token = parts[1]
            payload = decode_token(token)
            g.user = payload
            print(f"User authenticated: {payload['username']}")  # 디버깅용
            return f(*args, **kwargs)
        except Exception as e:
            print(f"Authentication error: {str(e)}")  # 디버깅용
            return jsonify({'message': str(e)}), 401
            
    return decorated_function

def authenticate_user(username, password):
    """사용자 인증 함수"""
    try:
        # 관리자 계정 체크
        if username == 'ms7team' and password == 'ms7team':
            admin_user = User.query.filter_by(username='ms7team').first()
            if not admin_user:
                # 관리자 계정이 없으면 생성
                admin_user = User(
                    id=10000101,  # 지정된 ID
                    username='ms7team',
                    name='관리자',
                    email='admin@example.com',
                    password='ms7team',
                    birth_date=datetime.strptime('1990-01-01', '%Y-%m-%d').date()  # 기본 생년월일
                )
                db.session.add(admin_user)
                db.session.commit()
                print(f"Admin user created with ID: {admin_user.id}")  # 디버깅용
            return admin_user
            
        # 일반 사용자 인증
        user = User.query.filter_by(username=username).first()
        if user and user.password == password:  # 실제 구현시에는 비밀번호 해싱 필요
            return user
            
        return None
    except Exception as e:
        print(f"사용자 인증 중 오류 발생: {str(e)}")
        return None

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': '아이디와 비밀번호를 모두 입력해주세요.'}), 400
        
        user = authenticate_user(username, password)
        if not user:
            print(f"Authentication failed for user: {username}")  # 디버깅용
            return jsonify({'error': '아이디 또는 비밀번호가 올바르지 않습니다.'}), 401
        
        # 사용자 정보에 id 포함
        user_data = {
            'id': user.id,  # 데이터베이스의 user_id
            'username': user.username,
            'name': user.name,
            'email': user.email
        }
        
        # JWT 토큰 생성
        access_token = create_access_token(user_data)
        print(f"Login successful for user: {username}")  # 디버깅용
        
        return jsonify({
            'message': '로그인 성공',
            'token': access_token,
            'user': user_data
        })
    except Exception as e:
        print(f"Login error: {str(e)}")  # 디버깅용
        return jsonify({'error': '로그인 처리 중 오류가 발생했습니다.'}), 500

@app.route('/user-info', methods=['GET'])
@login_required
def get_user_info():
    try:
        # user_id로 사용자 정보 조회
        user = User.query.get(g.user['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        user_info = {
            'id': user.id,
            'name': user.name,
            'username': user.username,
            'email': user.email,
            'birth_date': user.birth_date.strftime('%Y-%m-%d') if user.birth_date else None,
            'passport': user.passport.to_dict() if user.passport else None,
            'residence_card': user.residence_card.to_dict() if user.residence_card else None,
            'visa': user.visa.to_dict() if user.visa else None
        }
        return jsonify(user_info)
    except Exception as e:
        print(f"User info error: {str(e)}")
        return jsonify({'error': '사용자 정보를 가져오는데 실패했습니다.'}), 500

@app.route('/update', methods=['POST'])
def update_info():
    data = request.json
    print('Received from client:', data)
    return jsonify({'message': '정보 업데이트 완료'})

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("message", "")

    response = openai.ChatCompletion.create(
        engine="gpt-4",  # Azure에서 설정한 deployment 이름
        messages=[
            {"role": "system", "content": "출입국/체류 관련 전문 챗봇입니다."},
            {"role": "user", "content": user_input}
        ],
        temperature=0.7,
        max_tokens=1000
    )

    answer = response["choices"][0]["message"]["content"]
    return jsonify({"reply": answer})

@app.route('/register', methods=['POST'])
def register():
    try:
        print("회원가입 요청 수신")
        print("요청 데이터:", request.form)
        print("Content-Type:", request.headers.get('Content-Type'))
        
        # JSON 데이터 확인
        if request.is_json:
            data = request.get_json()
            print("JSON 데이터:", data)
        else:
            data = request.form
            print("Form 데이터:", data)
        
        # 필수 필드 확인
        required_fields = ['name', 'birth_date', 'email', 'username', 'password']
        for field in required_fields:
            if field not in data:
                print(f"필수 필드 누락: {field}")
                return jsonify({'error': f'{field} is required'}), 400
        
        # 이메일 중복 확인
        if User.query.filter_by(email=data['email']).first():
            print("이메일 중복")
            return jsonify({'error': 'Email already exists'}), 400
        
        # 사용자명 중복 확인
        if User.query.filter_by(username=data['username']).first():
            print("사용자명 중복")
            return jsonify({'error': 'Username already exists'}), 400
        
        # 생년월일 형식 변환
        try:
            birth_date = datetime.strptime(data['birth_date'], '%Y-%m-%d').date()
        except ValueError as e:
            print(f"생년월일 형식 오류: {str(e)}")
            return jsonify({'error': 'Invalid birth date format. Use YYYY-MM-DD'}), 400
        
        # 새 사용자 생성
        new_user = User(
            name=data['name'],
            birth_date=birth_date,
            email=data['email'],
            username=data['username'],
            password=data['password']
        )
        
        print("새 사용자 생성:", {
            'name': new_user.name,
            'birth_date': new_user.birth_date,
            'email': new_user.email,
            'username': new_user.username
        })
        
        db.session.add(new_user)
        db.session.flush()  # ID 생성
        
        # 여권 정보가 있는 경우에만 처리
        if 'passport_data' in data and data['passport_data']:
            try:
                passport_data = json.loads(data['passport_data']) if isinstance(data['passport_data'], str) else data['passport_data']
                print("여권 데이터:", passport_data)
                
                # 날짜 형식 변환
                issue_date = None
                expiry_date = None
                
                if passport_data.get('issue_date'):
                    try:
                        issue_date = datetime.strptime(passport_data['issue_date'], '%d %m월/%b %Y').date()
                    except ValueError as e:
                        print(f"발급일 형식 오류: {str(e)}")
                
                if passport_data.get('expiry_date'):
                    try:
                        expiry_date = datetime.strptime(passport_data['expiry_date'], '%d %m월/%b %Y').date()
                    except ValueError as e:
                        print(f"만료일 형식 오류: {str(e)}")
                
                new_passport = Passport(
                    user_id=new_user.id,
                    surname=passport_data.get('surname'),
                    givenname=passport_data.get('givenname'),
                    passport_number=passport_data.get('passport_number'),
                    nationality=passport_data.get('nationality'),
                    sex=passport_data.get('sex'),
                    country_code=passport_data.get('country_code'),
                    issue_date=issue_date,
                    expiry_date=expiry_date,
                    is_verified=True
                )
                
                print("새 여권 정보 생성:", {
                    'surname': new_passport.surname,
                    'givenname': new_passport.givenname,
                    'passport_number': new_passport.passport_number,
                    'issue_date': new_passport.issue_date,
                    'expiry_date': new_passport.expiry_date
                })
                
                db.session.add(new_passport)
            except json.JSONDecodeError as e:
                print(f"여권 데이터 JSON 파싱 오류: {str(e)}")
                return jsonify({'error': 'Invalid passport data format'}), 400
            except Exception as e:
                print(f"여권 정보 처리 중 오류: {str(e)}")
                import traceback
                print("상세 오류:", traceback.format_exc())
        
        # 외국인 등록증 정보가 있는 경우에만 처리
        if 'name_kor' in data and data['name_kor']:
            try:
                issue_date = None
                if data.get('issue_date'):
                    try:
                        issue_date = datetime.strptime(data['issue_date'], '%Y-%m-%d').date()
                    except ValueError as e:
                        print(f"발급일 형식 오류: {str(e)}")
                
                new_residence_card = ResidenceCard(
                    user_id=new_user.id,
                    name_kor=data.get('name_kor'),
                    resident_id=data.get('resident_id'),
                    visa_type=data.get('visa_type'),
                    issue_date=issue_date,
                    is_verified=True
                )
                
                print("새 외국인 등록증 정보 생성:", {
                    'name_kor': new_residence_card.name_kor,
                    'resident_id': new_residence_card.resident_id,
                    'visa_type': new_residence_card.visa_type,
                    'issue_date': new_residence_card.issue_date
                })
                
                db.session.add(new_residence_card)
            except Exception as e:
                print(f"외국인 등록증 정보 처리 중 오류: {str(e)}")
                import traceback
                print("상세 오류:", traceback.format_exc())
        
        db.session.commit()
        print("회원가입 완료")
        
        return jsonify({
            'message': '회원가입이 완료되었습니다.',
            'user': new_user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"회원가입 중 오류 발생: {str(e)}")
        import traceback
        print("상세 오류:", traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/analyze-passport', methods=['POST'])
def analyze_passport():
    try:
        if 'passport_image' not in request.files:
            return jsonify({'error': 'No passport image provided'}), 400

        passport_image = request.files['passport_image']
        if not passport_image:
            return jsonify({'error': 'No passport image provided'}), 400

        # 이미지 처리
        image_bytes = passport_image.read()
        image = Image.open(io.BytesIO(image_bytes))

        # 이미지 형식 확인
        if image.format not in ['JPEG', 'PNG']:
            return jsonify({'error': 'Unsupported image format. Please upload JPEG or PNG'}), 400

        # RGBA 이미지를 RGB로 변환
        if image.mode == 'RGBA':
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3])  # 3은 알파 채널
            image = background

        # 이미지 크기 최적화
        if image.size[0] > 800 or image.size[1] > 800:
            image.thumbnail((800, 800), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=85)
            image_bytes = buffer.getvalue()

        # OCR 처리
        passport_data = process_passport_image(image_bytes)
        if not passport_data:
            return jsonify({'error': 'Failed to extract passport information'}), 400

        return jsonify(passport_data)

    except Exception as e:
        print(f"Error in analyze_passport: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/update-passport', methods=['POST'])
@token_required
def update_passport(current_user):
    try:
        data = request.json
        print("여권 정보 업데이트 요청:", data)

        passport = Passport.query.filter_by(user_id=current_user.id).first()
        if not passport:
            passport = Passport(user_id=current_user.id)
            db.session.add(passport)

        # 날짜 형식 변환
        issue_date = None
        expiry_date = None
        
        if data.get('issue_date'):
            try:
                issue_date = datetime.strptime(data['issue_date'], '%d %m월/%b %Y').date()
            except ValueError:
                print("발급일 형식 오류")
        
        if data.get('expiry_date'):
            try:
                expiry_date = datetime.strptime(data['expiry_date'], '%d %m월/%b %Y').date()
            except ValueError:
                print("만료일 형식 오류")

        # 여권 정보 업데이트
        passport.surname = data.get('surname')
        passport.givenname = data.get('givenname')
        passport.passport_number = data.get('passport_number')
        passport.nationality = data.get('nationality')
        passport.sex = data.get('sex')
        passport.country_code = data.get('country_code')
        passport.issue_date = issue_date
        passport.expiry_date = expiry_date
        passport.is_verified = True

        db.session.commit()
        print("여권 정보 업데이트 완료")

        return jsonify({
            'message': '여권 정보가 업데이트되었습니다.',
            'passport': passport.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        print(f"여권 정보 업데이트 중 오류 발생: {str(e)}")
        import traceback
        print("상세 오류:", traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/delete-account', methods=['POST'])
@token_required
def delete_account(current_user):
    try:
        # 1. 사용자의 모든 신청서와 파일 정보 가져오기
        applications = Application.query.filter_by(user_id=current_user.id).all()
        
        # 2. Azure Blob Storage에서 파일 삭제
        for application in applications:
            for file in application.files:
                try:
                    # blob 이름 추출
                    blob_name = file.file_url.split(f'/{AZURE_CONTAINER}/')[1]
                    blob_client = container_client.get_blob_client(blob_name)
                    if blob_client.exists():
                        blob_client.delete_blob()
                except Exception as e:
                    print(f"Error deleting blob {file.file_url}: {str(e)}")
                    # 파일 삭제 실패는 계속 진행

        # 3. 데이터베이스에서 관련 데이터 삭제
        # ApplicationFile은 Application과의 관계로 인해 자동 삭제됨 (cascade)
        for application in applications:
            db.session.delete(application)
        
        # 4. 여권, 거주카드, 비자 정보 삭제
        if current_user.passport:
            db.session.delete(current_user.passport)
        if current_user.residence_card:
            db.session.delete(current_user.residence_card)
        if current_user.visa:
            db.session.delete(current_user.visa)
        
        # 5. 사용자 정보 삭제
        db.session.delete(current_user)
        
        # 6. 변경사항 저장
        db.session.commit()

        return jsonify({
            'message': '계정이 성공적으로 삭제되었습니다.',
            'success': True
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error deleting account: {str(e)}")
        return jsonify({
            'error': '계정 삭제 중 오류가 발생했습니다.',
            'success': False
        }), 500

# Azure OpenAI 및 Search 설정 (직접 할당)
AZURE_OPENAI_API_KEY =  os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-4o"

AZURE_AI_SEARCH_ENDPOINT = os.getenv("AZURE_AI_SEARCH_ENDPOINT")
AZURE_AI_SEARCH_KEY = os.getenv("AZURE_AI_SEARCH_KEY")
AZURE_AI_SEARCH_INDEX = os.getenv("AZURE_AI_SEARCH_INDEX")
AZURE_AI_SEARCH_SEMANTIC_CONFIG = "default"

# 검색 설정
TOP_N_DOCUMENTS = 5
STRICTNESS = 3

def get_search_results(query, top_n=TOP_N_DOCUMENTS, strictness=STRICTNESS):
    client = AzureOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version="2025-01-01-preview",
    )

    completion = client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT_NAME,
        messages=[
            {
                "role": "system",
                "content": "You are an AI assistant that helps people find information. Provide detailed and accurate information from the search results."
            },
            {
                "role": "user",
                "content": query
            }
        ],
        max_tokens=1500,
        temperature=0.7,
        top_p=0.95,
        frequency_penalty=0,
        presence_penalty=0,
        stop=None,
        stream=False,
        extra_body={
            "data_sources": [{
                "type": "azure_search",
                "parameters": {
                    "endpoint": AZURE_AI_SEARCH_ENDPOINT,
                    "index_name": AZURE_AI_SEARCH_INDEX,
                    "semantic_configuration": AZURE_AI_SEARCH_SEMANTIC_CONFIG,
                    "query_type": "vector_semantic_hybrid",
                    "fields_mapping": {},
                    "in_scope": True,
                    "filter": None,
                    "strictness": strictness,
                    "top_n_documents": top_n,
                    "authentication": {
                        "type": "api_key",
                        "key": AZURE_AI_SEARCH_KEY
                    },
                    "embedding_dependency": {
                        "type": "deployment_name",
                        "deployment_name": "text-embedding-ada-002"
                    }
                }
            }]
        }
    )

    return completion.choices[0].message.content

# LLM 설정
llm = AzureChatOpenAI(
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
    deployment_name=AZURE_OPENAI_DEPLOYMENT_NAME,
            api_version="2025-01-01-preview",
    api_key=AZURE_OPENAI_API_KEY,
            temperature=0.7,
            top_p=0.95,
    max_tokens=1500
)

# 메모리 설정
memory = ConversationSummaryMemory(
    llm=llm,
    memory_key="chat_history",
    return_messages=True,
    output_key="answer"
)

# 검색기 설정
retriever = AzureCognitiveSearchRetriever(
    service_name=AZURE_AI_SEARCH_ENDPOINT.split("//")[1].split(".")[0],
    index_name=AZURE_AI_SEARCH_INDEX,
    api_key=AZURE_AI_SEARCH_KEY,
    top_k=TOP_N_DOCUMENTS
)

# 프롬프트 템플릿
prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an AI assistant that helps people find information about immigration and residence in Korea. 
    Your task is to provide detailed and accurate answers based on the provided context and conversation history.
                    Follow these guidelines:
                    1. Use the search results as your primary source of information
    2. Consider the conversation history for context
    3. Include specific details and examples when available
    4. If the search results are not sufficient, acknowledge the limitations
                    5. Structure your response in a clear and organized manner
    6. If there are multiple relevant pieces of information, present them in a logical order
    7. Always respond in Korean

    Context: {context}
    Chat History: {chat_history}
    """),
    ("human", "{question}")
])

# ConversationalRetrievalChain 설정
qa_chain = ConversationalRetrievalChain.from_llm(
    llm=llm,
    retriever=retriever,
    memory=memory,
    combine_docs_chain_kwargs={"prompt": prompt},
    return_source_documents=True,
    verbose=True
)

def remove_redundant_sentences(text, threshold=0.85):
    sentences = text.strip().split('\n')
    result = []
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if not any(SequenceMatcher(None, sentence, r).ratio() > threshold for r in result):
            result.append(sentence)
    return '\n'.join(result)

@app.route('/chat-rag', methods=['POST'])
def chat_rag():
    try:
        data = request.get_json()
        message = data.get('message')
        chat_history = data.get('chat_history', [])

        if not message:
            return jsonify({'error': '메시지가 없습니다.'}), 400

        # RAG 챗봇 처리
        result = qa_chain({"question": message})
        response = result["answer"]
        
        # 중복 문장 제거
        final_response = remove_redundant_sentences(response)

        return jsonify({
            'reply': final_response,
            'chat_history': chat_history + [{'role': 'user', 'content': message}, {'role': 'assistant', 'content': final_response}]
        })

    except Exception as e:
        print(f"Error in chat_rag: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/analyze-residence-card', methods=['POST'])
def analyze_residence_card():
    try:
        if 'residence_card_image' not in request.files:
            return jsonify({'error': 'No residence card image provided'}), 400

        residence_card_image = request.files['residence_card_image']
        if not residence_card_image:
            return jsonify({'error': 'No residence card image provided'}), 400

        # 이미지 처리
        image_bytes = residence_card_image.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        # 이미지 형식 확인
        if image.format not in ['JPEG', 'PNG']:
            return jsonify({'error': 'Unsupported image format. Please upload JPEG or PNG'}), 400

        # RGBA 이미지를 RGB로 변환
        if image.mode == 'RGBA':
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3])
            image = background

        # 이미지 크기 최적화
        if image.size[0] > 800 or image.size[1] > 800:
            image.thumbnail((800, 800), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=85)
            image_bytes = buffer.getvalue()

        # OCR 처리
        residence_data = process_residence_card(image_bytes)
        if not residence_data:
            return jsonify({'error': 'Failed to extract residence card information'}), 400

        return jsonify(residence_data)

    except Exception as e:
        print(f"Error in analyze_residence_card: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/get-residence-card', methods=['GET'])
@token_required
def get_residence_card(current_user):
    try:
        residence_card = ResidenceCard.query.filter_by(user_id=current_user.id).first()
        if residence_card:
            return jsonify(residence_card.to_dict())
        return jsonify({'error': 'No residence card found'}), 404
    except Exception as e:
        print(f"외국인 등록증 정보 조회 중 오류 발생: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/update-residence-card', methods=['POST'])
@token_required
def update_residence_card(current_user):
    try:
        data = request.json
        print("외국인 등록증 정보 업데이트 요청:", data)

        residence_card = ResidenceCard.query.filter_by(user_id=current_user.id).first()
        if not residence_card:
            residence_card = ResidenceCard(user_id=current_user.id)
            db.session.add(residence_card)

        # 날짜 형식 변환
        issue_date = None
        if data.get('issue_date'):
            try:
                issue_date = datetime.strptime(data['issue_date'], '%Y-%m-%d').date()
            except ValueError:
                print("발급일 형식 오류")

        # 외국인 등록증 정보 업데이트
        residence_card.name_kor = data.get('name_kor')
        residence_card.resident_id = data.get('resident_id')
        residence_card.visa_type = data.get('visa_type')
        residence_card.issue_date = issue_date
        residence_card.is_verified = True

        db.session.commit()
        print("외국인 등록증 정보 업데이트 완료")

        return jsonify({
            'message': '외국인 등록증 정보가 업데이트되었습니다.',
            'residence_card': residence_card.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        print(f"외국인 등록증 정보 업데이트 중 오류 발생: {str(e)}")
        import traceback
        print("상세 오류:", traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/update-basic-info', methods=['POST'])
@token_required
def update_basic_info(current_user):
    try:
        data = request.get_json()
        
        # 필수 필드 확인
        required_fields = ['name', 'username', 'birth_date', 'email']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # username 중복 확인 (다른 사용자의 username과 중복되지 않도록)
        if data['username'] != current_user.username:
            existing_user = User.query.filter(User.username == data['username'], User.id != current_user.id).first()
            if existing_user:
                return jsonify({'error': 'Username already exists'}), 400

        # email 중복 확인 (다른 사용자의 email과 중복되지 않도록)
        if data['email'] != current_user.email:
            existing_user = User.query.filter(User.email == data['email'], User.id != current_user.id).first()
            if existing_user:
                return jsonify({'error': 'Email already exists'}), 400

        # 생년월일 형식 변환
        try:
            birth_date = datetime.strptime(data['birth_date'], '%Y-%m-%d').date()
        except ValueError as e:
            return jsonify({'error': 'Invalid birth date format. Use YYYY-MM-DD'}), 400

        # 사용자 정보 업데이트
        current_user.name = data['name']
        current_user.username = data['username']
        current_user.email = data['email']
        current_user.birth_date = birth_date
        
        db.session.commit()
        return jsonify({
            'message': '기본 정보가 성공적으로 업데이트되었습니다.',
            'user': current_user.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"기본 정보 업데이트 중 오류 발생: {str(e)}")
        return jsonify({'error': str(e)}), 500

def calculate_visa_dates(visa_type, entry_date):
    """비자 종류와 입국일을 기반으로 만료일과 연장 기간을 계산"""
    if not entry_date or not visa_type:
        return None, None, None, None

    entry = datetime.strptime(entry_date, '%Y-%m-%d').date()
    
    # 기본 만료일 계산
    if visa_type == 'E-8':
        expiry = entry + timedelta(days=150)  # 5개월
        extension_period = timedelta(days=90)  # 3개월
    elif visa_type == 'E-9':
        expiry = entry + timedelta(days=1095)  # 3년
        extension_period = timedelta(days=395)  # 1년 1개월
    else:
        return None, None, None, None

    return entry, expiry, expiry, expiry + extension_period

@app.route('/update-visa-info', methods=['POST'])
@token_required
def update_visa_info(current_user):
    try:
        data = request.get_json()
        
        # 필수 필드 확인
        required_fields = ['visaType', 'entryDate']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # 비자 종류 검증
        if data['visaType'] not in ['E-8', 'E-9']:
            return jsonify({'error': 'Invalid visa type. Must be E-8 or E-9'}), 400

        # 날짜 계산
        entry_date, expiry_date, _, _ = calculate_visa_dates(
            data['visaType'],
            data['entryDate']
        )

        if not all([entry_date, expiry_date]):
            return jsonify({'error': 'Failed to calculate visa dates'}), 400

        # 기존 비자 정보 확인
        visa = Visa.query.filter_by(user_id=current_user.id).first()
        if not visa:
            visa = Visa(user_id=current_user.id)
            db.session.add(visa)

        # 비자 정보 업데이트 및 연장 정보 초기화
        visa.visa_type = data['visaType']
        visa.entry_date = entry_date
        visa.expiry_date = expiry_date
        visa.extension_start = None
        visa.extension_end = None
        visa.extension_count = 0
        
        db.session.commit()
        
        return jsonify({
            'message': 'Visa information updated successfully',
            'visa_info': visa.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"비자 정보 업데이트 중 오류 발생: {str(e)}")
        import traceback
        print("상세 오류:", traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/extend-visa', methods=['POST'])
@token_required
def extend_visa(current_user):
    try:
        visa = Visa.query.filter_by(user_id=current_user.id).first()
        if not visa:
            return jsonify({'error': '비자 정보가 없습니다.'}), 404

        # 현재 날짜와 만료일 비교
        today = datetime.now().date()
        days_remaining = (visa.expiry_date - today).days

        if days_remaining <= 0:
            return jsonify({'error': '비자 만료일이 지났습니다. 비자 연장이 불가능합니다.'}), 400

        # 연장 횟수 확인
        if visa.extension_count >= 3:
            return jsonify({'error': '최대 연장 횟수(3회)를 초과했습니다.'}), 400

        # 연장 기간 계산 (3개월)
        extension_start = visa.expiry_date
        extension_end = extension_start + timedelta(days=90)

        # 연장 정보 업데이트
        visa.extension_start = extension_start
        visa.extension_end = extension_end
        visa.extension_count += 1
        visa.expiry_date = extension_end  # 만료일도 연장된 날짜로 업데이트

        db.session.commit()

        return jsonify({
            'message': '비자가 성공적으로 연장되었습니다.',
            'visa': visa.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        print(f"비자 연장 중 오류 발생: {str(e)}")
        return jsonify({'error': str(e)}), 500

# PDF 필드 좌표 정의
FIELD_COORDINATES = {
    1: {
        "cname": (142, 632, 261, 577),
        "cResident Registration": (342, 631, 505, 577),
        "cAddress": (141, 575, 506, 548),
        "cPhone (Landline)": (141, 546, 262, 505),
        "cPhone (Mobile)": (343, 547, 504, 507),
        "cEmail": (142, 505, 504, 464),
        "cReceive Processing Status Notifications yes": (147, 441, 156, 432),
        "cReceive Processing Status Notifications no": (197, 441, 205, 433),
        "cReceive Notifications via Labor Portal yes": (347, 441, 355, 433),
        "cReceive Notifications via Labor Portal no": (402, 441, 411, 433),
        "rname": (140, 333, 264, 306),
        "rPhone": (342, 333, 506, 305),
        "rAddress": (141, 305, 505, 278),
        "Workplace": (146, 269, 157, 258),
        "Construction site": (227, 269, 237, 259),
        "Name of Business": (141, 237, 505, 200),
        "Actual place of business": (143, 199, 506, 135),
        "rePhone": (143, 133, 262, 93),
        "Number of Employees": (341, 132, 506, 94)
    },
    2: {
        "Date of Employment": (141, 765, 263, 717),
        "Date of Resignation/Termination": (343, 765, 502, 718),
        "Total Amount of Unpaid Wages": (143, 713, 263, 664),
        "Resigned/terminated": (347, 712, 356, 704),
        "Currently employed": (347, 687, 356, 677),
        "Amount of Unpaid Severance Pay": (142, 662, 263, 605),
        "Other Unpaid Amounts": (341, 663, 505, 607),
        "Job Description": (141, 604, 505, 566),
        "Wage Payment Date": (142, 565, 263, 509),
        "Written": (347, 547, 357, 537),
        "Oral": (417, 547, 426, 537),
        "Details": (142, 508, 506, 386)
    }
}

def get_field_area(field, page_num):
    return FIELD_COORDINATES.get(page_num, {}).get(field, (100, 100, 300, 120))

def draw_text_in_area_centered(can, text, x1, y1, x2, y2):
    """
    지정된 영역 내에 중앙 정렬로 텍스트를 그리는 함수
    """
    if not text or not str(text).strip():
        return

    # 한글 폰트 설정
    can.setFont('NanumGothic', 10)
    line_height = 12
    max_width = x2 - x1
    box_height = y2 - y1

    # 텍스트를 여러 줄로 나누기
    lines = split_text_to_fit(str(text), max_width)
    total_text_height = len(lines) * line_height

    # 시작 y 좌표 계산 (상단에서 시작)
    start_y = y1 + (box_height - total_text_height) / 2 + (line_height * (len(lines) - 1))

    # 각 줄 그리기
    for i, line in enumerate(lines):
        text_width = pdfmetrics.stringWidth(line, 'NanumGothic', 10)
        text_x = x1 + (max_width - text_width) / 2
        text_y = start_y - i * line_height
        can.drawString(text_x, text_y, line)

def split_text_to_fit(text, max_width):
    """
    영역 너비에 맞게 텍스트를 줄 단위로 나누는 함수
    """
    if not text:
        return []

    words = str(text).split()
    lines = []
    current_line = ""

    for word in words:
        test_line = current_line + (" " if current_line else "") + word
        if pdfmetrics.stringWidth(test_line, 'NanumGothic', 10) <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)

    return lines

@app.route('/api/generate-complaint-pdf', methods=['POST'])
def generate_complaint_pdf():
    try:
        data = request.json
        print("Received data:", data)  # 데이터 수신 확인

        template_path = os.path.join(os.path.dirname(__file__), '진정서.pdf')
        output_path = os.path.join(os.path.dirname(__file__), 'uploads', 'complaint_filled.pdf')

        # uploads 디렉토리가 없으면 생성
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # PDF 처리
        with open(template_path, 'rb') as template_file:
            pdf_reader = PyPDF2.PdfReader(template_file)
            pdf_writer = PyPDF2.PdfWriter()

            # 페이지별 필드 정의
            page_fields = {
                1: ["cname", "cResident Registration", "cAddress", "cPhone (Landline)", 
                    "cPhone (Mobile)", "cEmail", "cReceive Processing Status Notifications yes",
                    "cReceive Processing Status Notifications no", "cReceive Notifications via Labor Portal yes",
                    "cReceive Notifications via Labor Portal no", "rname", "rPhone", "rAddress",
                    "Workplace", "Construction site", "Name of Business", "Actual place of business",
                    "rePhone", "Number of Employees"],
                2: ["Date of Employment", "Date of Resignation/Termination", "Total Amount of Unpaid Wages",
                    "Resigned/terminated", "Currently employed", "Amount of Unpaid Severance Pay",
                    "Other Unpaid Amounts", "Job Description", "Wage Payment Date", "Written", "Oral", "Details"]
            }

            # 각 페이지 처리
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                packet = io.BytesIO()
                can = canvas.Canvas(packet, pagesize=letter)
                can.setFont('NanumGothic', 10)

                current_page_fields = page_fields.get(page_num + 1, [])
                
                for field, value in data.items():
                    if field in current_page_fields:
                        try:
                            if field in ["cReceive Processing Status Notifications yes", "cReceive Processing Status Notifications no",
                                       "cReceive Notifications via Labor Portal yes", "cReceive Notifications via Labor Portal no",
                                       "Workplace", "Construction site", "Resigned/terminated", "Currently employed",
                                       "Written", "Oral"]:
                                if value.lower() == 'y':
                                    x1, y1, x2, y2 = get_field_area(field, page_num + 1)
                                    center_x = x1 + (x2 - x1) / 2
                                    center_y = y1 + (y2 - y1) / 2
                                    can.setLineWidth(2)
                                    can.line(center_x - 4, center_y, center_x, center_y - 4)
                                    can.line(center_x, center_y - 4, center_x + 6, center_y + 4)
                                    can.setLineWidth(1)
                            else:
                                x1, y1, x2, y2 = get_field_area(field, page_num + 1)
                                draw_text_in_area_centered(can, str(value), x1, y1, x2, y2)
                        except Exception as e:
                            print(f"Error processing field {field}: {str(e)}")
                            continue

                can.save()
                packet.seek(0)
                new_pdf = PyPDF2.PdfReader(packet)
                
                if len(new_pdf.pages) > 0:
                    page.merge_page(new_pdf.pages[0])
                pdf_writer.add_page(page)

            # 결과 저장
            with open(output_path, 'wb') as output_file:
                pdf_writer.write(output_file)

        print(f"PDF successfully generated at: {output_path}")  # PDF 생성 확인
        return jsonify({
            'success': True,
            'message': 'PDF가 성공적으로 생성되었습니다.',
            'file_path': output_path
        })

    except Exception as e:
        print(f"Error generating PDF: {str(e)}")  # 에러 로깅
        import traceback
        print(traceback.format_exc())  # 상세 에러 정보 출력
        return jsonify({
            'success': False,
            'message': f'PDF 생성 중 오류가 발생했습니다: {str(e)}'
        }), 500

@app.route('/uploads/<filename>')
def serve_pdf(filename):
    try:
        return send_file(
            os.path.join(os.path.dirname(__file__), 'uploads', filename),
            mimetype='application/pdf'
        )
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'PDF 파일을 찾을 수 없습니다: {str(e)}'
        }), 404

# 외국인 등록신청서 PDF 필드 좌표 정의
REGISTRATION_FIELD_COORDINATES = {
    "FOREIGN  RESIDENT  REGISTRATION": (61, 702, 77, 688),
    "REISSUANCE OF REGISTRATION CARD": (60, 667, 75, 655),
    "EXTENSION  OF  SOJOURN  PERIOD": (61, 643, 75, 633),
    "CHANGE  OF  STATUS  OF  SOJOURN": (60, 620, 75, 609),
    "Status to apply for1": (187, 620, 209, 609),
    "GRANTING  STATUS  OF  SOJOURN": (61, 584, 74, 573),
    "Status to apply for2": (187, 583, 209, 575),
    "ENGAGE IN ACTIVITIES NOT COVERED BY THE STATUS OF SOJOURN": (219, 701, 233, 689),
    "Status to apply for3": (363, 701, 391, 691),
    "CHANGE  OR  ADDITION  OF  WORKPLACE": (219, 667, 234, 655),
    "REENTRY  PERMIT  (SINGLE,  MULTIPLE)": (219, 644, 234, 632),
    "ALTERATION  OF  RESIDENCE": (219, 619, 235, 611),
    "CHANGE OF INFORMATION ON REGISTRATION": (219, 583, 233, 574),
    'surname': (129, 534, 263, 525),
    'givenname': (270, 534, 428, 526),
    'birth_year': (148, 508, 224, 498),
    'birth_month': (228, 507, 265, 498),
    'birth_day': (269, 507, 305, 499),
    "boy": (364, 519, 373, 510),
    "girl": (364, 508, 374, 499),
    'nationality': (479, 523, 537, 476),
    'passport_number': (125, 475, 226, 455),
    "passport_issue_date": (310, 472, 395, 456),
    "passport_expiry_date": (481, 472, 539, 457),
    'address_korea': (128, 452, 536, 435),
    "phone": (185, 430, 295, 420),
    "cell_phone": (418, 430, 540, 421),
    "address_home": (185, 418, 414, 400),
    "phone_home": (484, 417, 537, 401),
    "Non-school": (159, 396, 168, 387),
    "Elementary": (212, 396, 220, 388),
    "Middle": (247, 396, 255, 387),
    "High": (277, 397, 283, 387),
    "Name of School": (365, 396, 415, 378),
    "Phone No2": (484, 395, 539, 379),
    "Accredited school by Education Office": (367, 374, 377, 365),
    "Non-accredited, Alternative school": (504, 375, 512, 365),
    "workplace_current": (207, 356, 258, 335),
    "workplace_registration1": (355, 355, 415, 334),
    "workplace_phone1": (481, 355, 529, 335),
    "workplace_new": (208, 335, 259, 314),
    "workplace_registration2": (354, 335, 415, 313),
    "workplace_phone2": (481, 335, 537, 313),
    "annual_income": (207, 313, 253, 300),
    "occupation": (481, 313, 531, 300),
    "reentry_period": (207, 299, 259, 287),
    "email": (355, 299, 532, 286),
    "bank_account": (354, 285, 543, 266),
    "application_date": (207, 265, 293, 253)
}

def get_registration_field_area(field):
    """
    각 필드에 대한 텍스트 영역 좌표 반환 (x1, y1, x2, y2)
    """
    return REGISTRATION_FIELD_COORDINATES.get(field, (100, 100, 300, 120))

@app.route('/api/generate-registration-pdf', methods=['POST'])
def generate_registration_pdf():
    try:
        data = request.json
        print("Received registration data:", data)

        template_path = os.path.join(os.path.dirname(__file__), '외국인등록신청서.pdf')
        output_path = os.path.join(os.path.dirname(__file__), 'uploads', 'registration_filled.pdf')

        # uploads 디렉토리가 없으면 생성
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # PDF 처리
        with open(template_path, 'rb') as template_file:
            pdf_reader = PyPDF2.PdfReader(template_file)
            pdf_writer = PyPDF2.PdfWriter()

            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                packet = io.BytesIO()
                can = canvas.Canvas(packet, pagesize=letter)
                can.setFont('NanumGothic', 10)  # 한글 폰트 설정

                for field, value in data.items():
                    try:
                        if field in ["FOREIGN  RESIDENT  REGISTRATION", "REISSUANCE OF REGISTRATION CARD",
                                   "EXTENSION  OF  SOJOURN  PERIOD", "CHANGE  OF  STATUS  OF  SOJOURN",
                                   "GRANTING  STATUS  OF  SOJOURN", "ENGAGE IN ACTIVITIES NOT COVERED BY THE STATUS OF SOJOURN",
                                   "CHANGE  OR  ADDITION  OF  WORKPLACE", "REENTRY  PERMIT  (SINGLE,  MULTIPLE)",
                                   "ALTERATION  OF  RESIDENCE", "CHANGE OF INFORMATION ON REGISTRATION",
                                   "boy", "girl", "Non-school", "Elementary", "Middle", "High",
                                   "Accredited school by Education Office", "Non-accredited, Alternative school"]:
                                if value.lower() == 'y':
                                    x1, y1, x2, y2 = get_registration_field_area(field)
                                    center_x = x1 + (x2 - x1) / 2
                                    center_y = y1 + (y2 - y1) / 2
                                    can.setLineWidth(2)
                                    can.line(center_x - 4, center_y, center_x, center_y - 4)
                                    can.line(center_x, center_y - 4, center_x + 6, center_y + 4)
                                    can.setLineWidth(1)
                        else:
                            x1, y1, x2, y2 = get_registration_field_area(field)
                            if value is not None and str(value).strip():
                                draw_text_in_area_centered(can, str(value), x1, y1, x2, y2)
                    except Exception as e:
                        print(f"Error processing field {field}: {str(e)}")
                        continue

                can.save()
                packet.seek(0)
                new_pdf = PyPDF2.PdfReader(packet)
                
                if len(new_pdf.pages) > 0:
                    page.merge_page(new_pdf.pages[0])
                pdf_writer.add_page(page)

            # 결과 저장
            with open(output_path, 'wb') as output_file:
                pdf_writer.write(output_file)

        print(f"Registration PDF successfully generated at: {output_path}")
        return jsonify({
            'success': True,
            'message': '외국인 등록신청서가 성공적으로 생성되었습니다.',
            'file_path': output_path
        })

    except Exception as e:
        print(f"Error generating registration PDF: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': f'PDF 생성 중 오류가 발생했습니다: {str(e)}'
        }), 500

@app.route("/upload/", methods=["POST"])
@token_required
def upload_file(current_user):
    conn = None
    cursor = None
    try:
        if 'file' not in request.files:
            return jsonify({'error': '파일이 없습니다.'}), 400

        file = request.files['file']
        doc_id = request.form.get('doc_id')
        application_type = request.form.get('type')  # 신청 유형 (e8Registration, e9Extension 등)
        application_id = request.form.get('application_id')  # 기존 신청서 ID (있는 경우)
        
        if not file or not doc_id or not application_type:
            return jsonify({'error': '파일, 문서 유형, 신청 유형이 필요합니다.'}), 400

        if file.filename == '':
            return jsonify({'error': '선택된 파일이 없습니다.'}), 400

        # MySQL 연결
        conn = mysql.connector.connect(
            host='team7.mysql.database.azure.com',
            user='dlatjdals',
            password='dhlrnrdls486@',
            database='dhlrnrdls'
        )
        cursor = conn.cursor(dictionary=True)

        # application_id가 제공된 경우, 해당 신청서가 현재 사용자의 것인지 확인
        if application_id:
            cursor.execute("""
                SELECT id, type, status 
                FROM application 
                WHERE id = %s AND user_id = %s
            """, (application_id, current_user.id))
            existing_application = cursor.fetchone()
            
            if not existing_application:
                return jsonify({'error': '해당 신청서를 찾을 수 없거나 접근 권한이 없습니다.'}), 403
            
            if existing_application['status'] != 'pending':
                return jsonify({'error': '이미 제출된 신청서는 수정할 수 없습니다.'}), 400
            
            application_id = existing_application['id']
        else:
            # 현재 사용자의 가장 최근 신청서 확인
            cursor.execute("""
                SELECT id, type, status 
                FROM application 
                WHERE user_id = %s AND type = %s AND status = 'pending'
                ORDER BY submitted_at DESC 
                LIMIT 1
            """, (current_user.id, application_type))
            latest_application = cursor.fetchone()

            if latest_application:
                application_id = latest_application['id']
            else:
                # 새로운 신청서 생성
                cursor.execute("""
                    INSERT INTO application (user_id, type, status, submitted_at)
                    VALUES (%s, %s, 'pending', NOW())
                """, (current_user.id, application_type))
                conn.commit()
                application_id = cursor.lastrowid

        # 이미 같은 doc_id로 업로드된 파일이 있는지 확인
        cursor.execute("""
            SELECT id, file_url FROM application_file 
            WHERE application_id = %s AND doc_id = %s
        """, (application_id, doc_id))
        existing_file = cursor.fetchone()
        
        if existing_file:
            # Azure Blob Storage에서 기존 파일 삭제
            try:
                blob_name = existing_file['file_url'].split(f'/{AZURE_CONTAINER}/')[1]
                blob_client = container_client.get_blob_client(blob_name)
                blob_client.delete_blob()
            except Exception as e:
                print(f"Error deleting existing blob: {str(e)}")
            
            # MySQL에서 기존 파일 정보 삭제
            cursor.execute("""
                DELETE FROM application_file 
                WHERE application_id = %s AND doc_id = %s
            """, (application_id, doc_id))
            conn.commit()

        # 파일 내용 읽기
        file_content = file.read()
        file_name = file.filename

        # 고유한 파일명 생성
        unique_filename = f"{current_user.id}/{uuid.uuid4()}_{file_name}"
        
        # Azure Blob Storage에 업로드
        blob_client = container_client.get_blob_client(unique_filename)
        blob_client.upload_blob(
            file_content,
            overwrite=True,
            content_settings=ContentSettings(content_type=file.content_type)
        )

        # 파일 URL 생성
        file_url = f"https://{AZURE_ACCOUNT_NAME}.blob.core.windows.net/{AZURE_CONTAINER}/{unique_filename}"

        # MySQL에 파일 정보 저장
        cursor.execute("""
            INSERT INTO application_file 
            (application_id, doc_id, file_name, file_url, uploaded_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (application_id, doc_id, file_name, file_url))
        conn.commit()

        return jsonify({
            'message': '파일이 성공적으로 업로드되었습니다.',
            'file_url': file_url,
            'application_id': application_id,
            'is_new_application': not bool(existing_file)
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error uploading file: {str(e)}")
        return jsonify({'error': f'파일 업로드 중 오류가 발생했습니다: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.get("/files/{user_id}")
async def get_user_files(user_id: str):
    try:
        # 사용자의 모든 파일 목록 가져오기
        files = []
        prefix = f"{user_id}/"
        
        for blob in container_client.list_blobs(name_starts_with=prefix):
            files.append({
                "name": blob.name,
                "url": f"https://{AZURE_ACCOUNT_NAME}.blob.core.windows.net/{AZURE_CONTAINER}/{blob.name}",
                "size": blob.size,
                "last_modified": blob.last_modified
            })
        
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/files/{user_id}/{file_name}")
async def delete_file(user_id: str, file_name: str):
    try:
        # 파일 삭제
        blob_client = container_client.get_blob_client(f"{user_id}/{file_name}")
        blob_client.delete_blob()
        
        return {"message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 전역 변수로 applications 정의
applications = []

# applications.json 파일에서 데이터 로드
def load_applications():
    global applications
    try:
        if os.path.exists('applications.json'):
            with open('applications.json', 'r', encoding='utf-8') as f:
                applications = json.load(f)
    except Exception as e:
        print(f"Error loading applications: {str(e)}")
        applications = []

# 서버 시작 시 데이터 로드
load_applications()

def save_applications():
    try:
        with open('applications.json', 'w', encoding='utf-8') as f:
            json.dump(applications, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving applications: {str(e)}")

# 관리자 인증 데코레이터
ADMIN_ID = 10000101  # 관리자 ID를 숫자로 변경
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            print("No Authorization header for admin request")  # 디버깅용
            return jsonify({'message': 'Missing authorization header'}), 401
            
        try:
            # Bearer 토큰 형식 검증
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                print(f"Invalid auth header format for admin: {auth_header}")  # 디버깅용
                return jsonify({'message': 'Invalid token format'}), 401
                
            token = parts[1]
            payload = decode_token(token)
            
            # 관리자 권한 확인
            if payload.get('user_id') != ADMIN_ID:  # 숫자 ID로 비교
                print(f"Non-admin user attempted admin access: {payload.get('user_id')}")  # 디버깅용
                return jsonify({'message': 'Admin access required'}), 403
                
            g.user = payload
            print(f"Admin authenticated: {payload['user_id']}")  # 디버깅용
            return f(*args, **kwargs)
        except Exception as e:
            print(f"Admin authentication error: {str(e)}")  # 디버깅용
            return jsonify({'message': str(e)}), 401
            
    return decorated_function

def generate_sas_token(blob_name):
    try:
        # 계정 수준의 SAS 토큰 생성
        sas_token = generate_account_sas(
            account_name=AZURE_ACCOUNT_NAME,
            account_key=AZURE_ACCOUNT_KEY,
            resource_types=ResourceTypes(container=True, object=True),
            permission=AccountSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=1),  # 1시간 동안 유효
            start=datetime.utcnow() - timedelta(minutes=5)  # 5분 전부터 유효
        )
        return sas_token
    except Exception as e:
        print(f"Error generating SAS token: {str(e)}")
        return None

@app.route('/admin/files', methods=['GET'])
@admin_required
def get_admin_files():
    try:
        # User, Application, ApplicationFile 테이블 JOIN하여 조회
        applications = db.session.query(
            User.id,  # User.id 추가
            User.name,
            User.username,
            Application.id,
            Application.type,
            Application.status,
            Application.submitted_at,
            Application.updated_at,
            Application.notes,
            ApplicationFile.id.label('file_id'),
            ApplicationFile.doc_id,
            ApplicationFile.file_name,
            ApplicationFile.file_url,
            ApplicationFile.uploaded_at
        ).join(
            User, Application.user_id == User.id
        ).outerjoin(
            ApplicationFile, Application.id == ApplicationFile.application_id
        ).order_by(
            User.name,
            Application.submitted_at.desc()
        ).all()

        # 결과를 사용자별, 신청 유형별, 문서 유형별로 구조화
        organized_data = {}
        
        for app in applications:
            user_name = app.name
            username = app.username
            user_id = app.id  # User.id 사용
            app_type = app.type
            doc_id = app.doc_id

            # 사용자 정보 초기화
            if user_name not in organized_data:
                organized_data[user_name] = {
                    'username': username,
                    'user_id': user_id,  # user_id 추가
                    'applications': {}
                }

            # 신청 유형별 정보 초기화
            if app_type not in organized_data[user_name]['applications']:
                organized_data[user_name]['applications'][app_type] = {
                    'id': app.id,
                    'status': app.status,
                    'submitted_at': app.submitted_at.strftime('%Y-%m-%d %H:%M:%S') if app.submitted_at else None,
                    'updated_at': app.updated_at.strftime('%Y-%m-%d %H:%M:%S') if app.updated_at else None,
                    'notes': app.notes,
                    'files': {}
                }

            # 파일이 있는 경우에만 파일 정보 추가
            if app.file_id:
                if doc_id not in organized_data[user_name]['applications'][app_type]['files']:
                    organized_data[user_name]['applications'][app_type]['files'][doc_id] = {
                        'id': app.file_id,
                        'file_name': app.file_name,
                        'file_url': app.file_url,
                        'uploaded_at': app.uploaded_at.strftime('%Y-%m-%d %H:%M:%S') if app.uploaded_at else None
                    }
        
        return jsonify(organized_data)
    except Exception as e:
        print(f"Error fetching admin files: {str(e)}")
        return jsonify({'error': '신청 내역을 가져오는데 실패했습니다.'}), 500

@app.route('/admin/application/<int:application_id>/status', methods=['PUT'])
@admin_required
def update_application_status(application_id):
    """신청 상태를 업데이트하는 엔드포인트"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        notes = data.get('notes')

        if not new_status:
            return jsonify({'error': '상태 정보가 필요합니다.'}), 400

        if new_status not in ['pending', 'processing', 'approved', 'rejected']:
            return jsonify({'error': '유효하지 않은 상태입니다.'}), 400

        application = Application.query.get(application_id)
        if not application:
            return jsonify({'error': '신청서를 찾을 수 없습니다.'}), 404

        # 상태 업데이트 (제한 없이 모든 상태로 변경 가능)
        application.status = new_status
        application.notes = notes
        application.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': '상태가 업데이트되었습니다.',
            'application': application.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        print(f"상태 업데이트 중 오류 발생: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/admin/delete_application', methods=['POST'])
@admin_required
def delete_application():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        app_type = data.get('type')
        application_id = data.get('application_id')
        
        if not all([user_id, app_type]):
            return jsonify({'error': '필수 정보가 누락되었습니다.'}), 400
            
        # 신청 내역 찾기
        for i, app in enumerate(applications):
            if app.get('user_id') == user_id and app.get('type') == app_type:
                # Azure Storage에서 파일 삭제
                for file in app.get('files', []):
                    try:
                        blob_url = file.get('file_url')
                        if blob_url:
                            blob_name = blob_url.split(f'/{AZURE_CONTAINER}/')[1]
                            blob_client = container_client.get_blob_client(blob_name)
                            blob_client.delete_blob()
                    except Exception as e:
                        print(f"Error deleting blob {blob_url}: {str(e)}")
                
                # 신청 내역에서 삭제
                applications.pop(i)
                save_applications()
                return jsonify({'success': True, 'message': '신청 내역이 삭제되었습니다.'})
                
            return jsonify({'error': '해당 신청 내역을 찾을 수 없습니다.'}), 404
            
    except Exception as e:
        print(f"Error deleting application: {str(e)}")
        return jsonify({'error': '신청 내역 삭제에 실패했습니다.'}), 500

@app.route('/admin/delete_blob', methods=['POST'])
@admin_required
def delete_blob():
    try:
        data = request.get_json()
        blob_name = data.get('blob_name')
        
        if not blob_name:
            return jsonify({'error': '파일 이름이 필요합니다.'}), 400
        
        # Azure Storage에서 파일 삭제
        blob_client = container_client.get_blob_client(blob_name)
        blob_client.delete_blob()
        return jsonify({'success': True, 'message': '파일이 삭제되었습니다.'})
        
    except Exception as e:
        print(f"Error in delete_blob: {str(e)}")
        return jsonify({'error': '파일 삭제 중 오류가 발생했습니다.'}), 500

@app.route('/admin/delete_application_type', methods=['POST'])
@admin_required
def delete_application_type():
    try:
        data = request.get_json()
        username = data.get('username')  # user_id 대신 username 사용
        app_type = data.get('type')
        print(f"Delete request received - username: {username}, type: {app_type}")
        
        if not all([username, app_type]):
            return jsonify({'error': '필수 정보가 누락되었습니다.'}), 400
            
        # username으로 사용자 찾기
        user = User.query.filter_by(username=username).first()
        if not user:
            print(f"User not found with username: {username}")
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
            
        print(f"Found user: id={user.id}, username={user.username}")
        
        # 해당 사용자의 해당 타입의 모든 신청서 찾기
        applications = Application.query.filter(
            Application.user_id == user.id,
            Application.type == app_type
        ).all()
        
        print(f"Found {len(applications)} applications to delete")
        if not applications:
            print(f"No applications found for user_id: {user.id}, type: {app_type}")
            return jsonify({'error': '해당 타입의 신청 내역을 찾을 수 없습니다.'}), 404
            
        # 각 신청서의 파일들 삭제
        for application in applications:
            print(f"Processing application {application.id}")
            # Azure Storage에서 파일 삭제
            for file in application.files:
                try:
                    if file.file_url:
                        print(f"Deleting file: {file.file_url}")
                        blob_name = file.file_url.split(f'/{AZURE_CONTAINER}/')[1]
                        blob_client = container_client.get_blob_client(blob_name)
                        blob_client.delete_blob()
                except Exception as e:
                    print(f"Error deleting blob {file.file_url}: {str(e)}")
                    
            # 데이터베이스에서 신청서 삭제
            db.session.delete(application)
            print(f"Deleted application {application.id} from database")
            
        db.session.commit()
        print(f"Successfully deleted {len(applications)} applications")
        return jsonify({
            'success': True, 
            'message': f'{len(applications)}개의 신청 내역이 삭제되었습니다.'
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error in delete_application_type: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/download/<path:file_path>', methods=['GET'])
@admin_required
def download_file(file_path):
    try:
        # Azure Blob Storage에서 파일 가져오기
        blob_client = blob_service_client.get_blob_client(container=AZURE_CONTAINER, blob=file_path)
        
        # 파일 스트림 가져오기
        stream = blob_client.download_blob()
        file_data = stream.readall()
        
        # 파일 이름 추출
        file_name = file_path.split('/')[-1]
        
        # BytesIO 객체 생성
        file_stream = BytesIO(file_data)
        
        # 파일 전송
        return send_file(
            file_stream,
            mimetype='application/octet-stream',
            as_attachment=True,
            download_name=file_name
        )
    except Exception as e:
        print(f"Error downloading file: {str(e)}")
        return jsonify({'error': '파일 다운로드에 실패했습니다.'}), 500

@app.route('/admin/files/<int:user_id>/<doc_id>', methods=['GET'])
@admin_required
def admin_download_file(user_id, doc_id):
    try:
        # 사용자와 파일 찾기
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
            
        # 해당 사용자의 모든 신청서에서 파일 찾기
        for application in user.applications:
            for file in application.files:
                if file.doc_id == doc_id:
                    try:
                        # blob 이름 추출
                        blob_name = file.file_url.split(f'/{AZURE_CONTAINER}/')[1]
                        blob_client = container_client.get_blob_client(blob_name)
                        
                        # blob 존재 여부 확인
                        if not blob_client.exists():
                            print(f"Blob does not exist: {blob_name}")
                            return jsonify({'error': '파일이 Azure Storage에 존재하지 않습니다.'}), 404
                        
                        print(f"Blob exists, downloading: {blob_name}")
                        
                        # 파일 다운로드
                        download_stream = blob_client.download_blob()
                        file_data = download_stream.readall()
                        
                        # 파일명 URL 인코딩
                        encoded_filename = urllib.parse.quote(file.file_name)
                        
                        # 파일 다운로드 응답 생성
                        response = send_file(
                            io.BytesIO(file_data),
                            as_attachment=True,
                            download_name=file.file_name,
                            mimetype='application/octet-stream'
                        )
                        
                        # Content-Disposition 헤더 설정
                        response.headers['Content-Disposition'] = f"attachment; filename*=UTF-8''{encoded_filename}"
                        return response
                        
                    except Exception as e:
                        print(f"Error with Azure Blob Storage: {str(e)}")
                        return jsonify({'error': f'파일 다운로드에 실패했습니다: {str(e)}'}), 500

        return jsonify({'error': '파일을 찾을 수 없습니다.'}), 404

    except Exception as e:
        print(f"Error in admin_download_file: {str(e)}")
        return jsonify({'error': '파일 다운로드 중 오류가 발생했습니다.'}), 500

@app.route('/admin/files/<user_id>/<doc_id>', methods=['DELETE'])
@admin_required
def admin_delete_file(user_id, doc_id):
    for app_entry in applications:
        if app_entry['user_id'] == user_id:
            for file in app_entry['files']:
                if file['doc_id'] == doc_id:
                    blob_url = file['file_url']
                    blob_name = blob_url.split(f'/{AZURE_CONTAINER}/')[1]
                    blob_client = blob_service_client.get_blob_client(container=AZURE_CONTAINER, blob=blob_name)
                    blob_client.delete_blob()
                    app_entry['files'].remove(file)
                    save_applications()
                    return jsonify({'success': True})
    return jsonify({'error': '파일을 찾을 수 없습니다.'}), 404

@app.route('/admin/blob-files', methods=['GET'])
@admin_required
def get_admin_blob_files():
    try:
        # 모든 blob 파일 목록 가져오기
        blob_list = container_client.list_blobs()
        organized_files = {}
        
        for blob in blob_list:
            # blob 이름에서 사용자 ID와 파일명 추출
            parts = blob.name.split('/')
            if len(parts) >= 2:
                user_id = parts[0]
                file_name = parts[-1]
                
                # 사용자 ID로 그룹화
                if user_id not in organized_files:
                    organized_files[user_id] = {
                        'files': [],
                        'total_files': 0
                    }
                
                # 파일 정보 추가
                file_info = {
                    'file_name': file_name,
                    'blob_name': blob.name,
                    'url': f"https://{AZURE_ACCOUNT_NAME}.blob.core.windows.net/{AZURE_CONTAINER}/{blob.name}",
                    'last_modified': blob.last_modified.isoformat() if blob.last_modified else None,
                    'size': blob.size
                }
                
                # 파일 유형 분류 (파일명이나 확장자 기반)
                file_type = '기타'
                if file_name.endswith('.pdf'):
                    if 'application_form' in blob.name:
                        file_type = '신청서'
                    elif 'residence_confirmation' in blob.name:
                        file_type = '거주확인서'
                    elif 'insurance_certificate' in blob.name:
                        file_type = '보험증명서'
                    elif 'travel_insurance' in blob.name:
                        file_type = '여행자보험'
                    elif 'drug_test' in blob.name:
                        file_type = '약물검사'
                    elif 'accommodation_inspection' in blob.name:
                        file_type = '숙소점검서'
                
                file_info['type'] = file_type
                organized_files[user_id]['files'].append(file_info)
                organized_files[user_id]['total_files'] += 1
        
        print(f"Found {len(organized_files)} users with files")  # 디버깅용
        return jsonify(organized_files)
    except Exception as e:
        print(f"Error fetching blob files: {str(e)}")  # 디버깅용
        return jsonify({'error': '파일 목록을 가져오는데 실패했습니다.'}), 500

@app.route('/admin/blob-files/<path:blob_name>', methods=['GET'])
@admin_required
def admin_download_blob_file(blob_name):
    try:
        # URL 디코딩
        decoded_blob_name = urllib.parse.unquote(blob_name)
        print(f"Original blob name: {blob_name}")
        print(f"Decoded blob name: {decoded_blob_name}")
        
        # blob 경로를 직접 사용
        blob_client = container_client.get_blob_client(container=AZURE_CONTAINER, blob=decoded_blob_name)
        
        try:
            # blob 존재 여부 확인
            blob_properties = blob_client.get_blob_properties()
            print(f"Blob size: {blob_properties.size} bytes")
        except Exception as e:
            print(f"Blob not found: {str(e)}")
            return jsonify({'error': '파일을 찾을 수 없습니다.'}), 404

        # 임시 파일 생성
        temp_dir = tempfile.gettempdir()
        file_name = decoded_blob_name.split('/')[-1]  # 파일 이름만 추출
        temp_path = os.path.join(temp_dir, file_name)
        
        try:
            # Azure Blob에서 파일 다운로드
            download_stream = blob_client.download_blob()
            
            # 임시 파일로 저장
            with open(temp_path, 'wb') as f:
                f.write(download_stream.readall())
            
            # 파일 전송
            response = send_file(
                temp_path,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=file_name
            )
            
            # 응답 후 임시 파일 삭제를 위한 콜백 설정
            @response.call_on_close
            def cleanup():
                try:
                    os.remove(temp_path)
                except:
                    pass
            
            return response
            
        except Exception as e:
            print(f"Error during file download: {str(e)}")
            # 임시 파일이 있다면 삭제
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except:
                pass
            raise
        
    except Exception as e:
        print(f"Error downloading blob file: {str(e)}")
        return jsonify({'error': '파일 다운로드에 실패했습니다.'}), 500

@app.route('/admin/blob-files/<path:blob_name>', methods=['DELETE'])
@admin_required
def admin_delete_blob_file(blob_name):
    blob_client = container_client.get_blob_client(container=AZURE_CONTAINER, blob=blob_name)
    try:
        blob_client.delete_blob()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/my/applications', methods=['GET'])
@token_required
def get_my_applications(current_user):
    try:
        # 사용자의 모든 신청서 조회
        applications = Application.query.filter_by(user_id=current_user.id).order_by(Application.submitted_at.desc()).all()
        return jsonify([app.to_dict() for app in applications])
    except Exception as e:
        print(f"신청 내역 조회 중 오류 발생: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/submit_application', methods=['POST'])
@token_required
def submit_application(current_user):
    try:
        data = request.get_json()
        app_type = data.get('type')
        uploaded_files = data.get('uploadedFiles', {})
        # 현재 사용자의 진행 중인 신청서 찾기
        application = Application.query.filter_by(
            user_id=current_user.id,
            status='pending'
        ).order_by(Application.submitted_at.desc()).first()
        if not application:
            # 진행 중인 신청서가 없는 경우에만 새로 생성
            application = Application(
                user_id=current_user.id,
                type=app_type,
                status='pending'
            )
            db.session.add(application)
            db.session.flush()  # ID 생성
        # 신청서 타입 업데이트
        application.type = app_type
        application.submitted_at = datetime.utcnow()
        # 이미 업로드된 파일들은 그대로 유지
        # 새로운 파일 정보는 이미 /upload/ 엔드포인트에서 저장되었으므로
        # 여기서는 추가 작업이 필요 없음
        db.session.commit()
        return jsonify({
            'success': True,
            'message': '신청이 완료되었습니다.',
            'application': application.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"신청서 제출 중 오류 발생: {str(e)}")
        return jsonify({'error': str(e)}), 500

# 신청 유형별 필요 서류 정의
REQUIRED_DOCUMENTS = {
    'e8Registration': {
        'name': 'E-8 외국인등록',
        'documents': [
            {'id': 'application_form', 'name': '신청서', 'required': True},
            {'id': 'passport', 'name': '여권', 'required': True},
            {'id': 'photo', 'name': '사진 1부', 'required': True},
            {'id': 'fee_receipt', 'name': '수수료 영수증', 'required': True},
            {'id': 'employment_contract', 'name': '고용계약서', 'required': True},
            {'id': 'company_registration', 'name': '사업자등록증', 'required': True},
            {'id': 'company_contract', 'name': '계약서', 'required': True}
        ]
    },
    'e8Extension': {
        'name': 'E-8 체류기간 연장',
        'documents': [
            {'id': 'application_form', 'name': '신청서', 'required': True},
            {'id': 'passport', 'name': '여권', 'required': True},
            {'id': 'residence_card', 'name': '외국인등록증', 'required': True},
            {'id': 'fee_receipt', 'name': '수수료 영수증', 'required': True},
            {'id': 'employment_contract', 'name': '고용계약서', 'required': True},
            {'id': 'company_registration', 'name': '사업자등록증', 'required': True},
            {'id': 'company_contract', 'name': '계약서', 'required': True}
        ]
    },
    'e8WorkplaceChange': {
        'name': 'E-8 근무처 변경',
        'documents': [
            {'id': 'application_form', 'name': '신청서', 'required': True},
            {'id': 'passport', 'name': '여권', 'required': True},
            {'id': 'residence_card', 'name': '외국인등록증', 'required': True},
            {'id': 'fee_receipt', 'name': '수수료 영수증', 'required': True},
            {'id': 'employment_contract', 'name': '고용계약서', 'required': True},
            {'id': 'company_registration', 'name': '사업자등록증', 'required': True},
            {'id': 'company_contract', 'name': '계약서', 'required': True}
        ]
    },
    'e9Registration': {
        'name': 'E-9 외국인등록',
        'documents': [
            {'id': 'application_form', 'name': '신청서', 'required': True},
            {'id': 'passport', 'name': '여권', 'required': True},
            {'id': 'photo', 'name': '사진 1부', 'required': True},
            {'id': 'fee_receipt', 'name': '수수료 영수증', 'required': True},
            {'id': 'employment_contract', 'name': '고용계약서', 'required': True},
            {'id': 'company_registration', 'name': '사업자등록증', 'required': True},
            {'id': 'company_contract', 'name': '계약서', 'required': True}
        ]
    },
    'e9Extension': {
        'name': 'E-9 체류기간 연장',
        'documents': [
            {'id': 'application_form', 'name': '신청서', 'required': True},
            {'id': 'passport', 'name': '여권', 'required': True},
            {'id': 'residence_card', 'name': '외국인등록증', 'required': True},
            {'id': 'fee_receipt', 'name': '수수료 영수증', 'required': True},
            {'id': 'employment_contract', 'name': '고용계약서', 'required': True},
            {'id': 'company_registration', 'name': '사업자등록증', 'required': True},
            {'id': 'company_contract', 'name': '계약서', 'required': True}
        ]
    },
    'e9WorkplaceChange': {
        'name': 'E-9 근무처 변경',
        'documents': [
            {'id': 'application_form', 'name': '신청서', 'required': True},
            {'id': 'passport', 'name': '여권', 'required': True},
            {'id': 'residence_card', 'name': '외국인등록증', 'required': True},
            {'id': 'fee_receipt', 'name': '수수료 영수증', 'required': True},
            {'id': 'employment_contract', 'name': '고용계약서', 'required': True},
            {'id': 'company_registration', 'name': '사업자등록증', 'required': True},
            {'id': 'company_contract', 'name': '계약서', 'required': True}
        ]
    }
}

# 신청 상태 정의
APPLICATION_STATUS = {
    'pending': {
        'name': '신청중',
        'description': '신청서가 제출되었으나 아직 접수되지 않은 상태입니다.',
        'next_statuses': ['processing', 'rejected']
    },
    'processing': {
        'name': '접수완료',
        'description': '신청서가 접수되어 심사 중인 상태입니다.',
        'next_statuses': ['approved', 'rejected']
    },
    'approved': {
        'name': '신청완료',
        'description': '신청이 승인되어 처리가 완료된 상태입니다.',
        'next_statuses': []
    },
    'rejected': {
        'name': '신청실패',
        'description': '신청이 거절된 상태입니다.',
        'next_statuses': ['pending']
    }
}

@app.route('/api/application-types', methods=['GET'])
def get_application_types():
    """신청 유형별 필요 서류 정보를 반환하는 엔드포인트"""
    return jsonify(REQUIRED_DOCUMENTS)

@app.route('/api/application-status', methods=['GET'])
def get_application_status():
    """신청 상태 정보를 반환하는 엔드포인트"""
    return jsonify(APPLICATION_STATUS)

@app.route('/admin/applications/<username>/<application_type>', methods=['DELETE'])
@token_required
def delete_application_type_by_user(current_user, username, application_type):
    try:
        # 사용자 ID 가져오기
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404

        # 해당 사용자의 특정 타입의 신청서 찾기
        applications = Application.query.filter_by(
            user_id=user.id,
            type=application_type
        ).all()

        if not applications:
            return jsonify({'error': '해당 타입의 신청서를 찾을 수 없습니다.'}), 404

        # 신청서 삭제
        for application in applications:
            db.session.delete(application)
        db.session.commit()
        return jsonify({'message': '신청서가 성공적으로 삭제되었습니다.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/user-applications-summary', methods=['GET'])
@token_required
def get_user_applications_summary(current_user):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                a.id,
                a.type,
                a.status,
                a.submitted_at,
                a.updated_at,
                a.notes
            FROM application a
            WHERE a.user_id = %s
            ORDER BY a.submitted_at DESC
            LIMIT 5
        """, (current_user.id,))
        applications = cursor.fetchall()

        cursor.execute("""
            SELECT 
                type as application_type,
                status,
                COUNT(*) as count
            FROM application
            WHERE user_id = %s
            GROUP BY type, status
        """, (current_user.id,))
        status_counts = cursor.fetchall()

        summary = {
            'e8Registration': {'pending': 0, 'approved': 0, 'rejected': 0},
            'e8Extension': {'pending': 0, 'approved': 0, 'rejected': 0},
            'e9Registration': {'pending': 0, 'approved': 0, 'rejected': 0},
            'e9Extension': {'pending': 0, 'approved': 0, 'rejected': 0}
        }
        for count in status_counts:
            if count['application_type'] in summary:
                summary[count['application_type']][count['status']] = count['count']

        return jsonify({
            'recent_applications': applications,
            'status_summary': summary
        })
    except Exception as e:
        print(f"Error in get_user_applications_summary: {str(e)}")
        return jsonify({'error': 'Failed to fetch applications summary'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def complaint_content(query):
    client = AzureOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version="2025-01-01-preview",
    )

    chat_prompt = [
        {
            "role": "system",
            "content": "당신은 한국의 근로기준법, 최저임금법, 외국인근로자의 고용 등에 관한 법률, 퇴직급여보장법에 정통한 AI 노무사입니다. \n당신의 역할은 외국인 근로자가 제공한 정보를 바탕으로, 실제 고용노동부에 제출 가능한 임금체불 진정서의 '진정 내용' 부분을 500자 이내로 전문적으로 작성하는 것입니다.\n\n작성 시 유의사항:\n- 문장은 정중하고 간결하며 객관적인 진술 형태로 작성합니다.\n- 사실관계, 법률 위반 요소(퇴직금 미지급, 체불임금 등), 대응 과정 등을 포함합니다.\n- 관련 법령에 근거하여 체불 사유가 위법임을 명시하는 문장을 포함합니다.\n- JSON의 각 항목(work_detail, period, location, wage, response)을 모두 반영하십시오.\n- 불필요한 반복 없이 자연스럽게 연결된 문단으로 구성하십시오.\n- 출력은 '진정인은'으로 시작하고 내용 문단 한 개만 출력하십시오.\n- 반드시 500자를 초과하지 않도록 하십시오.\n"
        },
        {
            "role": "user",
            "content": query
        }
    ]

    completion = client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT_NAME,
        messages=chat_prompt,
        max_tokens=800,
        temperature=0.7,
        top_p=0.95,
        frequency_penalty=0,
        presence_penalty=0,
        stop=None,
        stream=False,
        extra_body={
            "data_sources": [{
                "type": "azure_search",
                "parameters": {
                    "endpoint": AZURE_AI_SEARCH_ENDPOINT,
                    "index_name": AZURE_AI_SEARCH_INDEX,
                    "semantic_configuration": AZURE_AI_SEARCH_SEMANTIC_CONFIG,
                    "query_type": "vector_semantic_hybrid",
                    "fields_mapping": {},
                    "in_scope": True,
                    "filter": None,
                    "strictness": 2,
                    "top_n_documents": 5,
                    "authentication": {
                        "type": "api_key",
                        "key": AZURE_AI_SEARCH_KEY
                    },
                    "embedding_dependency": {
                        "type": "deployment_name",
                        "deployment_name": "text-embedding-ada-002"
                    }
                }
            }]
        }
    )

    return completion.choices[0].message.content

@app.route('/api/generate_complaint_content', methods=['POST'])
def generate_complaint_content():
    try:
        data = request.json
        
        # 필수 필드 확인
        required_fields = ['work_detail', 'period', 'location', 'wage', 'response', 'extra_info']
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'message': '필수 필드 누락'}), 400

        # 하나의 텍스트로 이어붙이기
        query = "\n\n".join(f"{field}: {data[field]}" for field in required_fields)

        # Azure OpenAI를 사용하여 진정 내용 생성
        content = complaint_content(query)
        
        return jsonify({
            'success': True, 
            'content': content
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

def complaint_evidence(query):
    client = AzureOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version="2025-01-01-preview",
    )

    chat_prompt = [
        {
            "role": "system",
            "content": (
                "당신은 한국의 근로기준법, 최저임금법, 외국인근로자의 고용 등에 관한 법률, 퇴직급여보장법에 정통한 AI 노무사입니다. \n당신의 역할은 외국인 근로자가 제공한 정보를 바탕으로, 실제 고용노동부에 제출 가능한 임금체불 진정서의 '진정 내용' 부분을 500자 이내로 전문적으로 작성하는 것입니다.\n\n작성 시 유의사항:\n- 문장은 정중하고 간결하며 객관적인 진술 형태로 작성합니다.\n- 사실관계, 법률 위반 요소(퇴직금 미지급, 체불임금 등), 대응 과정 등을 포함합니다.\n- 관련 법령에 근거하여 체불 사유가 위법임을 명시하는 문장을 포함합니다.\n- JSON의 각 항목(work_detail, period, location, wage, response)을 모두 반영하십시오.\n- 불필요한 반복 없이 자연스럽게 연결된 문단으로 구성하십시오.\n- 출력은 '진정인은'으로 시작하고 내용 문단 한 개만 출력하십시오.\n- 반드시 500자를 초과하지 않도록 하십시오.\n또한 사용자는 다양한 언어를 사용하기 떄문에 전달받은 내용을 기반으로 답변하는 내용은 무조건 Korean, 한국어로 작성합니다."
            )
        },
        {
            "role": "user",
            "content": query
        }
    ]

    completion = client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT_NAME,
        messages=chat_prompt,
        max_tokens=800,
        temperature=0.7,
        top_p=0.95,
        frequency_penalty=0,
        presence_penalty=0,
        stop=None,
        stream=False,
        extra_body={
            "data_sources": [{
                "type": "azure_search",
                "parameters": {
                    "endpoint": AZURE_AI_SEARCH_ENDPOINT,
                    "index_name": AZURE_AI_SEARCH_INDEX,
                    "semantic_configuration": AZURE_AI_SEARCH_SEMANTIC_CONFIG,
                    "query_type": "vector_semantic_hybrid",
                    "fields_mapping": {},
                    "in_scope": True,
                    "filter": None,
                    "strictness": 2,
                    "top_n_documents": 5,
                    "authentication": {
                        "type": "api_key",
                        "key": AZURE_AI_SEARCH_KEY
                    },
                    "embedding_dependency": {
                        "type": "deployment_name",
                        "deployment_name": "text-embedding-ada-002"
                    }
                }
            }]
        }
    )

    return completion.choices[0].message.content

@app.route('/api/generate_complaint_evidence', methods=['POST'])
def generate_complaint_evidence():
    try:
        data = request.json
        if 'query' not in data:
            return jsonify({'success': False, 'message': 'query 필드가 필요합니다.'}), 400
        content = complaint_evidence(data['query'])
        return jsonify({'success': True, 'content': content})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
