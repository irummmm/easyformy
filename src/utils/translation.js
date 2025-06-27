// Azure Translator 설정
const AZURE_TRANSLATOR_KEY = '9kmogdvJYnnc7xMGvA291bO9blq8lTzZeMjpQeHaG7WmYehUZBOHJQQJ99BEACYeBjFXJ3w3AAAbACOGkRAG';
const AZURE_TRANSLATOR_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';
const AZURE_TRANSLATOR_LOCATION = 'eastus';

// 번역 캐시 설정
const MAX_CACHE_SIZE = 1000; // 최대 캐시 항목 수
const translationCache = new Map();
const cacheKeys = []; // LRU 캐시 구현을 위한 키 배열

// 에러 처리 함수
const handleTranslationError = (error, text = '') => {
  console.error('Translation error details:', {
    error,
    text,
    status: error.status,
    message: error.message,
    stack: error.stack
  });
  
  if (error.status === 401) {
    console.error('Azure Translator API key is invalid or expired');
  } else if (error.status === 429) {
    console.error('Azure Translator API quota exceeded');
  }
  
  throw error;
};

// 캐시 관리 함수
const manageCache = (key, value) => {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    // 가장 오래된 항목 제거 (LRU)
    const oldestKey = cacheKeys.shift();
    translationCache.delete(oldestKey);
  }
  
  // 새 항목 추가
  translationCache.set(key, value);
  cacheKeys.push(key);
};

// 에러 메시지 정의
const ERROR_MESSAGES = {
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  API_ERROR: '번역 서비스에 일시적인 문제가 있습니다.',
  INVALID_LANGUAGE: '지원하지 않는 언어입니다.',
  RATE_LIMIT: '번역 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.'
};

// 단일 텍스트 번역
export const translateText = async (text, targetLanguage) => {
  console.log('Translating single text:', { text, targetLanguage });
  
  if (!text || !targetLanguage) {
    console.error('Missing text or target language:', { text, targetLanguage });
    throw new Error('텍스트와 대상 언어가 필요합니다.');
  }

  // 캐시된 번역이 있는지 확인
  const cacheKey = `${text}-${targetLanguage}`;
  if (translationCache.has(cacheKey)) {
    console.log('Cache hit for:', cacheKey);
    // 캐시 히트 시 해당 키를 최신으로 이동
    const index = cacheKeys.indexOf(cacheKey);
    if (index > -1) {
      cacheKeys.splice(index, 1);
      cacheKeys.push(cacheKey);
    }
    return translationCache.get(cacheKey);
  }

  try {
    console.log('Making API request to Azure Translator');
    const response = await fetch(
      `${AZURE_TRANSLATOR_ENDPOINT}/translate?api-version=3.0&to=${targetLanguage}`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
          'Ocp-Apim-Subscription-Region': AZURE_TRANSLATOR_LOCATION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ text }]),
      }
    );

    console.log('API Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error response:', errorText);
      throw { 
        status: response.status, 
        message: response.statusText,
        details: errorText
      };
    }

    const data = await response.json();
    console.log('API Response data:', data);
    
    const translatedText = data[0].translations[0].text;
    
    // 번역 결과를 캐시에 저장
    manageCache(cacheKey, translatedText);
    
    return translatedText;
  } catch (error) {
    handleTranslationError(error, text);
  }
};

// 여러 텍스트를 한 번에 번역하는 함수 (최적화)
export const translateMultipleTexts = async (texts, targetLanguage) => {
  console.log('Translating multiple texts:', { 
    textCount: typeof texts === 'object' ? Object.keys(texts).length : texts.length,
    targetLanguage 
  });

  if (!texts || !targetLanguage) {
    console.error('Missing texts or target language:', { texts, targetLanguage });
    throw new Error('텍스트와 대상 언어가 필요합니다.');
  }

  // 입력이 객체인 경우 처리
  const isObject = typeof texts === 'object' && !Array.isArray(texts);
  const textEntries = isObject ? Object.entries(texts) : texts.map((text, index) => [index, text]);
  
  const textsToTranslate = [];
  const translations = {};
  const textToKeyMap = new Map();

  // 캐시 확인 및 번역이 필요한 텍스트 수집
  for (const [key, text] of textEntries) {
    const cacheKey = `${text}-${targetLanguage}`;
    if (translationCache.has(cacheKey)) {
      console.log('Cache hit for:', cacheKey);
      translations[key] = translationCache.get(cacheKey);
      // 캐시 히트 시 해당 키를 최신으로 이동
      const index = cacheKeys.indexOf(cacheKey);
      if (index > -1) {
        cacheKeys.splice(index, 1);
        cacheKeys.push(cacheKey);
      }
    } else {
      textsToTranslate.push(text);
      textToKeyMap.set(text, key);
    }
  }

  // 번역이 필요한 텍스트가 없는 경우 바로 반환
  if (textsToTranslate.length === 0) {
    console.log('All texts found in cache');
    return translations;
  }

  try {
    console.log('Translating', textsToTranslate.length, 'texts');
    // Azure Translator는 한 번에 최대 100개 텍스트를 처리할 수 있음
    const batchSize = 100;
    for (let i = 0; i < textsToTranslate.length; i += batchSize) {
      const batch = textsToTranslate.slice(i, i + batchSize);
      console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(textsToTranslate.length/batchSize)}`);
      
      const response = await fetch(
        `${AZURE_TRANSLATOR_ENDPOINT}/translate?api-version=3.0&to=${targetLanguage}`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
            'Ocp-Apim-Subscription-Region': AZURE_TRANSLATOR_LOCATION,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batch.map(text => ({ text }))),
        }
      );

      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw { 
          status: response.status, 
          message: response.statusText,
          details: errorText
        };
      }

      const data = await response.json();
      console.log('API Response data:', data);
      
      // 번역 결과 처리
      data.forEach((item, index) => {
        const originalText = batch[index];
        const translatedText = item.translations?.[0]?.text || originalText;
        const key = textToKeyMap.get(originalText);
        
        translations[key] = translatedText;
        manageCache(`${originalText}-${targetLanguage}`, translatedText);
      });
    }

    console.log('Translation completed successfully');
    return translations;
  } catch (error) {
    handleTranslationError(error);
    console.log('Falling back to original texts due to error');
    // 오류 발생 시 원본 텍스트 반환
    return isObject ? texts : Object.fromEntries(textEntries);
  }
}; 