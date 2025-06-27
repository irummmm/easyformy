import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  ScrollView,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

const SPEECH_KEY =
  "FoM5freZRdxxMOav8bKJO69UnFjgShnxOJWtMcI2E7yV5Y0kuMtOJQQJ99BEACYeBjFXJ3w3AAAEACOG2mxM";
const SPEECH_REGION = "eastus";

// 지원하는 언어 목록 (국가 이모지와 함께)
const LANGUAGES = {
  // 주요 언어 (상단에 표시)
  'ko-KR': '🇰🇷 한국어',
  'en-US': '🇺🇸 English',
  'ja-JP': '🇯🇵 日本語',
  'zh-CN': '🇨🇳 中文',
  'vi-VN': '🇻🇳 Tiếng Việt',
  'th-TH': '🇹🇭 ภาษาไทย',
  'id-ID': '🇮🇩 Bahasa Indonesia',
  'ms-MY': '🇲🇾 Bahasa Melayu',
  'tl-PH': '🇵🇭 Tagalog',
  'ne-NP': '🇳🇵 नेपाली',

  // 기타 지원 언어
  'af-ZA': '🇿🇦 Afrikaans',
  'sq-AL': '🇦🇱 Shqiptare',
  'am-ET': '🇪🇹 አማርኛ',
  'ar-SA': '🇸🇦 العربية',
  'hy-AM': '🇦🇲 Հայերեն',
  'az-AZ': '🇦🇿 Azərbaycan',
  'bn-BD': '🇧🇩 বাংলা',
  'bs-BA': '🇧🇦 Bosanski',
  'bg-BG': '🇧🇬 Български',
  'ca-ES': '🇪🇸 Català',
  'hr-HR': '🇭🇷 Hrvatski',
  'cs-CZ': '🇨🇿 Čeština',
  'da-DK': '🇩🇰 Dansk',
  'nl-NL': '🇳🇱 Nederlands',
  'et-EE': '🇪🇪 Eesti',
  'fi-FI': '🇫🇮 Suomi',
  'fr-FR': '🇫🇷 Français',
  'ka-GE': '🇬🇪 ქართული',
  'de-DE': '🇩🇪 Deutsch',
  'el-GR': '🇬🇷 Ελληνικά',
  'gu-IN': '🇮🇳 ગુજરાતી',
  'ht-HT': '🇭🇹 Kreyòl Ayisyen',
  'he-IL': '🇮🇱 עברית',
  'hi-IN': '🇮🇳 हिन्दी',
  'hu-HU': '🇭🇺 Magyar',
  'is-IS': '🇮🇸 Íslenska',
  'ga-IE': '🇮🇪 Gaeilge',
  'it-IT': '🇮🇹 Italiano',
  'kn-IN': '🇮🇳 ಕನ್ನಡ',
  'kk-KZ': '🇰🇿 Қазақ',
  'km-KH': '🇰🇭 ខ្មែរ',
  'lo-LA': '🇱🇦 ລາວ',
  'lv-LV': '🇱🇻 Latviešu',
  'lt-LT': '🇱🇹 Lietuvių',
  'lb-LU': '🇱🇺 Lëtzebuergesch',
  'mk-MK': '🇲🇰 Македонски',
  'mg-MG': '🇲🇬 Malagasy',
  'ml-IN': '🇮🇳 മലയാളം',
  'mt-MT': '🇲🇹 Malti',
  'mi-NZ': '🇳🇿 Māori',
  'mr-IN': '🇮🇳 मराठी',
  'mn-MN': '🇲🇳 Монгол',
  'my-MM': '🇲🇲 မြန်မာ',
  'nb-NO': '🇳🇴 Norsk',
  'or-IN': '🇮🇳 ଓଡ଼ିଆ',
  'ps-AF': '🇦🇫 پښتو',
  'fa-IR': '🇮🇷 فارسی',
  'pl-PL': '🇵🇱 Polski',
  'pt-PT': '🇵🇹 Português',
  'pa-IN': '🇮🇳 ਪੰਜਾਬੀ',
  'ro-RO': '🇷🇴 Română',
  'ru-RU': '🇷🇺 Русский',
  'sm-WS': '🇼🇸 Samoan',
  'sr-RS': '🇷🇸 Српски',
  'st-ZA': '🇿🇦 Sesotho',
  'sn-ZW': '🇿🇼 Shona',
  'sd-PK': '🇵🇰 سنڌي',
  'si-LK': '🇱🇰 සිංහල',
  'sk-SK': '🇸🇰 Slovenčina',
  'sl-SI': '🇸🇮 Slovenščina',
  'so-SO': '🇸🇴 Soomaali',
  'es-ES': '🇪🇸 Español',
  'su-ID': '🇮🇩 Sunda',
  'sw-TZ': '🇹🇿 Kiswahili',
  'sv-SE': '🇸🇪 Svenska',
  'ta-LK': '🇱🇰 தமிழ்',
  'te-IN': '🇮🇳 తెలుగు',
  'tr-TR': '🇹🇷 Türkçe',
  'uk-UA': '🇺🇦 Українська',
  'ur-PK': '🇵🇰 اردو',
  'uz-UZ': '🇺🇿 Oʻzbek',
  'cy-GB': '🇬🇧 Cymraeg',
  'xh-ZA': '🇿🇦 isiXhosa',
  'yi-IL': '🇮🇱 ייִדיש',
  'yo-NG': '🇳🇬 Yorùbá',
  'zu-ZA': '🇿🇦 isiZulu'
};

// 언어 그룹 (카테고리별 정렬)
const LANGUAGE_GROUPS = {
  '주요 언어': ['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'vi-VN', 'th-TH', 'id-ID', 'ms-MY', 'tl-PH', 'ne-NP'],
  '아시아': ['bn-BD', 'hi-IN', 'km-KH', 'lo-LA', 'my-MM', 'ta-LK', 'te-IN', 'ur-PK', 'uz-UZ'],
  '유럽': ['bg-BG', 'hr-HR', 'cs-CZ', 'da-DK', 'nl-NL', 'et-EE', 'fi-FI', 'fr-FR', 'de-DE', 'el-GR', 'hu-HU', 'is-IS', 'ga-IE', 'it-IT', 'lv-LV', 'lt-LT', 'mk-MK', 'mt-MT', 'nb-NO', 'pl-PL', 'pt-PT', 'ro-RO', 'ru-RU', 'sk-SK', 'sl-SI', 'es-ES', 'sv-SE', 'tr-TR', 'uk-UA'],
  '아프리카': ['af-ZA', 'am-ET', 'ar-SA', 'ht-HT', 'sw-TZ', 'yo-NG', 'zu-ZA'],
  '기타': ['sq-AL', 'hy-AM', 'az-AZ', 'bs-BA', 'ca-ES', 'ka-GE', 'gu-IN', 'he-IL', 'kn-IN', 'kk-KZ', 'lb-LU', 'mg-MG', 'ml-IN', 'mi-NZ', 'mr-IN', 'mn-MN', 'or-IN', 'ps-AF', 'fa-IR', 'pa-IN', 'sm-WS', 'sr-RS', 'st-ZA', 'sn-ZW', 'sd-PK', 'si-LK', 'so-SO', 'su-ID', 'cy-GB', 'xh-ZA', 'yi-IL']
};

// TTS 음성 매핑
const TTS_VOICES = {
  // 주요 언어
  'ko-KR': 'ko-KR-SoonBokNeural',
  'en-US': 'en-US-JennyNeural',
  'ja-JP': 'ja-JP-NanamiNeural',
  'zh-CN': 'zh-CN-XiaoxiaoNeural',
  'vi-VN': 'vi-VN-HoaiMyNeural',
  'th-TH': 'th-TH-PremwadeeNeural',
  'id-ID': 'id-ID-GadisNeural',
  'ms-MY': 'ms-MY-YasminNeural',
  'tl-PH': 'fil-PH-BlessicaNeural',
  'ne-NP': 'ne-NP-HemkalaNeural',

  // 기타 언어
  'af-ZA': 'af-ZA-AdriNeural',
  'sq-AL': 'sq-AL-AnilaNeural',
  'am-ET': 'am-ET-MekdesNeural',
  'ar-SA': 'ar-SA-ZariyahNeural',
  'hy-AM': 'hy-AM-AnahitNeural',
  'az-AZ': 'az-AZ-BabekNeural',
  'bn-BD': 'bn-BD-NabanitaNeural',
  'bs-BA': 'bs-BA-VesnaNeural',
  'bg-BG': 'bg-BG-KalinaNeural',
  'ca-ES': 'ca-ES-JoanaNeural',
  'hr-HR': 'hr-HR-GabrijelaNeural',
  'cs-CZ': 'cs-CZ-VlastaNeural',
  'da-DK': 'da-DK-ChristelNeural',
  'nl-NL': 'nl-NL-ColetteNeural',
  'et-EE': 'et-EE-AnuNeural',
  'fi-FI': 'fi-FI-NooraNeural',
  'fr-FR': 'fr-FR-DeniseNeural',
  'ka-GE': 'ka-GE-EkaNeural',
  'de-DE': 'de-DE-KatjaNeural',
  'el-GR': 'el-GR-AthinaNeural',
  'gu-IN': 'gu-IN-DhwaniNeural',
  'ht-HT': 'ht-HT-MichelleNeural',
  'he-IL': 'he-IL-HilaNeural',
  'hi-IN': 'hi-IN-SwaraNeural',
  'hu-HU': 'hu-HU-NoemiNeural',
  'is-IS': 'is-IS-GudrunNeural',
  'ga-IE': 'ga-IE-OrlaNeural',
  'it-IT': 'it-IT-ElsaNeural',
  'kn-IN': 'kn-IN-SapnaNeural',
  'kk-KZ': 'kk-KZ-AigulNeural',
  'km-KH': 'km-KH-SreymomNeural',
  'lo-LA': 'lo-LA-KeomanyNeural',
  'lv-LV': 'lv-LV-EveritaNeural',
  'lt-LT': 'lt-LT-OnaNeural',
  'lb-LU': 'lb-LU-LauraNeural',
  'mk-MK': 'mk-MK-MarijaNeural',
  'mg-MG': 'mg-MG-IarisoaNeural',
  'ml-IN': 'ml-IN-SobhanaNeural',
  'mt-MT': 'mt-MT-GraceNeural',
  'mi-NZ': 'mi-NZ-MereNeural',
  'mr-IN': 'mr-IN-AarohiNeural',
  'mn-MN': 'mn-MN-BolorNeural',
  'my-MM': 'my-MM-NilarNeural',
  'nb-NO': 'nb-NO-IselinNeural',
  'or-IN': 'or-IN-JnanaprabhaNeural',
  'ps-AF': 'ps-AF-LatifaNeural',
  'fa-IR': 'fa-IR-DilaraNeural',
  'pl-PL': 'pl-PL-AgnieszkaNeural',
  'pt-PT': 'pt-PT-RaquelNeural',
  'pa-IN': 'pa-IN-GurpreetNeural',
  'ro-RO': 'ro-RO-AlinaNeural',
  'ru-RU': 'ru-RU-SvetlanaNeural',
  'sm-WS': 'sm-WS-LinnaNeural',
  'sr-RS': 'sr-RS-SophieNeural',
  'st-ZA': 'st-ZA-LehlogonoloNeural',
  'sn-ZW': 'sn-ZW-TatendaNeural',
  'sd-PK': 'sd-PK-GulNeural',
  'si-LK': 'si-LK-ThiliniNeural',
  'sk-SK': 'sk-SK-ViktoriaNeural',
  'sl-SI': 'sl-SI-PetraNeural',
  'so-SO': 'so-SO-UbaxNeural',
  'es-ES': 'es-ES-ElviraNeural',
  'su-ID': 'su-ID-TutiNeural',
  'sw-TZ': 'sw-TZ-RehemaNeural',
  'sv-SE': 'sv-SE-HilleviNeural',
  'ta-LK': 'ta-LK-SaranyaNeural',
  'te-IN': 'te-IN-ShrutiNeural',
  'tr-TR': 'tr-TR-AhmetNeural',
  'uk-UA': 'uk-UA-PolinaNeural',
  'ur-PK': 'ur-PK-UzmaNeural',
  'uz-UZ': 'uz-UZ-MadinaNeural',
  'cy-GB': 'cy-GB-NiaNeural',
  'xh-ZA': 'xh-ZA-ThandoNeural',
  'yi-IL': 'yi-IL-ChavaNeural',
  'yo-NG': 'yo-NG-AdeolaNeural',
  'zu-ZA': 'zu-ZA-ThandoNeural'
};

const getFlagEmoji = (languageCode) => {
  const flagMap = {
    'ko-KR': '🇰🇷',
    'en-US': '🇺🇸',
    'ja-JP': '🇯🇵',
    'zh-CN': '🇨🇳',
    'vi-VN': '🇻🇳',
    'th-TH': '🇹🇭',
    'id-ID': '🇮🇩',
    'ms-MY': '🇲🇾',
    'tl-PH': '🇵🇭',
    'ne-NP': '🇳🇵',
    'af-ZA': '🇿🇦',
    'sq-AL': '🇦🇱',
    'am-ET': '🇪🇹',
    'ar-SA': '🇸🇦',
    'hy-AM': '🇦🇲',
    'az-AZ': '🇦🇿',
    'bn-BD': '🇧🇩',
    'bs-BA': '🇧🇦',
    'bg-BG': '🇧🇬',
    'ca-ES': '🇪🇸',
    'hr-HR': '🇭🇷',
    'cs-CZ': '🇨🇿',
    'da-DK': '🇩🇰',
    'nl-NL': '🇳🇱',
    'et-EE': '🇪🇪',
    'fi-FI': '🇫🇮',
    'fr-FR': '🇫🇷',
    'ka-GE': '🇬🇪',
    'de-DE': '🇩🇪',
    'el-GR': '🇬🇷',
    'gu-IN': '🇮🇳',
    'ht-HT': '🇭🇹',
    'he-IL': '🇮🇱',
    'hi-IN': '🇮🇳',
    'hu-HU': '🇭🇺',
    'is-IS': '🇮🇸',
    'ga-IE': '🇮🇪',
    'it-IT': '🇮🇹',
    'kn-IN': '🇮🇳',
    'kk-KZ': '🇰🇿',
    'km-KH': '🇰🇭',
    'lo-LA': '🇱🇦',
    'lv-LV': '🇱🇻',
    'lt-LT': '🇱🇹',
    'lb-LU': '🇱🇺',
    'mk-MK': '🇲🇰',
    'mg-MG': '🇲🇬',
    'ml-IN': '🇮🇳',
    'mt-MT': '🇲🇹',
    'mi-NZ': '🇳🇿',
    'mr-IN': '🇮🇳',
    'mn-MN': '🇲🇳',
    'my-MM': '🇲🇲',
    'nb-NO': '🇳🇴',
    'or-IN': '🇮🇳',
    'ps-AF': '🇦🇫',
    'fa-IR': '🇮🇷',
    'pl-PL': '🇵🇱',
    'pt-PT': '🇵🇹',
    'pa-IN': '🇮🇳',
    'ro-RO': '🇷🇴',
    'ru-RU': '🇷🇺',
    'sm-WS': '🇼🇸',
    'sr-RS': '🇷🇸',
    'st-ZA': '🇿🇦',
    'sn-ZW': '🇿🇼',
    'sd-PK': '🇵🇰',
    'si-LK': '🇱🇰',
    'sk-SK': '🇸🇰',
    'sl-SI': '🇸🇮',
    'so-SO': '🇸🇴',
    'es-ES': '🇪🇸',
    'su-ID': '🇮🇩',
    'sw-TZ': '🇹🇿',
    'sv-SE': '🇸🇪',
    'ta-LK': '🇱🇰',
    'te-IN': '🇮🇳',
    'tr-TR': '🇹🇷',
    'uk-UA': '🇺🇦',
    'ur-PK': '🇵🇰',
    'uz-UZ': '🇺🇿',
    'cy-GB': '🇬🇧',
    'xh-ZA': '🇿🇦',
    'yi-IL': '🇮🇱',
    'yo-NG': '🇳🇬',
    'zu-ZA': '🇿🇦'
  };
  return flagMap[languageCode] || '🌐';
};

const SpeechService = ({
  onSpeechInput,
  textToSpeak,
  language: propLanguage,
}) => {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(
    propLanguage || "ko-KR"  // propLanguage가 없으면 한국어 사용
  );
  const [showLanguages, setShowLanguages] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // propLanguage가 변경될 때 selectedLanguage 업데이트
  useEffect(() => {
    if (propLanguage) {
      setSelectedLanguage(propLanguage);
    }
  }, [propLanguage]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("권한 오류", "마이크 사용 권한이 필요합니다.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          extension: ".wav",
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          extension: ".wav",
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert("오류", `녹음을 시작할 수 없습니다: ${err.message}`);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) {
        return;
      }

      setIsRecording(false);
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      if (!uri) {
        throw new Error("녹음 파일을 찾을 수 없습니다.");
      }

      await sendToAzure(uri);
      setRecording(null);
    } catch (err) {
      Alert.alert("오류", `녹음 중지 중 문제가 발생했습니다: ${err.message}`);
    }
  };

  const sendToAzure = async (audioUri) => {
    try {
      const response = await fetch(audioUri);
      const blob = await response.blob();

      const apiUrl = `https://${SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${selectedLanguage}`;

      const azureResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": SPEECH_KEY,
          "Content-Type": "audio/wav",
        },
        body: blob,
      });

      if (!azureResponse.ok) {
        throw new Error(`Azure API 오류: ${azureResponse.status}`);
      }

      const result = await azureResponse.json();

      if (result.RecognitionStatus === "Success" && result.DisplayText) {
        onSpeechInput(result.DisplayText);
      } else {
        Alert.alert("음성 인식 실패", "다시 한 번 말씀해 주세요.");
      }
    } catch (error) {
      Alert.alert(
        "오류",
        `음성 인식 처리 중 문제가 발생했습니다: ${error.message}`
      );
    }
  };

  const speakText = async (text) => {
    if (!text || isSpeaking) return;

    try {
      setIsSpeaking(true);
      const voice = TTS_VOICES[selectedLanguage] || TTS_VOICES["en-US"];

      const ssml = `
        <speak version='1.0' xml:lang='${selectedLanguage}'>
          <voice name='${voice}'>
            ${text}
          </voice>
        </speak>`;

      const response = await fetch(
        `https://${SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": SPEECH_KEY,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3",
          },
          body: ssml,
        }
      );

      if (!response.ok) {
        throw new Error(`TTS API 오류: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const tempFilePath = `${
        FileSystem.cacheDirectory
      }/temp_audio_${Date.now()}.mp3`;

      const fr = new FileReader();
      fr.onload = async () => {
        const fileContent = fr.result.split(",")[1];
        await FileSystem.writeAsStringAsync(tempFilePath, fileContent, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const soundObject = new Audio.Sound();
        try {
          await soundObject.loadAsync({ uri: tempFilePath });
          await soundObject.playAsync();

          soundObject.setOnPlaybackStatusUpdate(async (status) => {
            if (status.didJustFinish) {
              await soundObject.unloadAsync();
              await FileSystem.deleteAsync(tempFilePath);
              setIsSpeaking(false);
            }
          });
        } catch (error) {
          setIsSpeaking(false);
        }
      };
      fr.readAsDataURL(audioBlob);
    } catch (error) {
      Alert.alert(
        "음성 합성 오류",
        "텍스트를 음성으로 변환하는데 실패했습니다."
      );
      setIsSpeaking(false);
    }
  };

  // textToSpeak가 변경될 때마다 자동으로 음성 재생
  useEffect(() => {
    if (textToSpeak) {
      speakText(textToSpeak);
    }
  }, [textToSpeak]);

  const toggleLanguageSelector = () => {
    setShowLanguages(!showLanguages);
  };

  const selectLanguage = (langCode) => {
    setSelectedLanguage(langCode);
    setShowLanguages(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isRecording && styles.activeButton]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Text style={[styles.buttonText, isRecording && styles.activeButtonText]}>
          {isRecording ? "🛑" : "🎤"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.languageButton, isSpeaking && styles.speakingButton]}
        onPress={toggleLanguageSelector}
      >
        <Text style={styles.buttonText}>
          {showLanguages ? LANGUAGES[selectedLanguage] : getFlagEmoji(selectedLanguage)}
        </Text>
      </TouchableOpacity>

      {showLanguages && (
        <View style={styles.languageMenu}>
          <ScrollView style={styles.languageScroll}>
            {Object.entries(LANGUAGE_GROUPS).map(([groupName, langCodes]) => (
              <View key={groupName} style={styles.languageGroup}>
                <Text style={styles.groupHeader}>{groupName}</Text>
                {langCodes.map((code) => (
                  <Pressable
                    key={code}
                    style={[
                      styles.languageOption,
                      selectedLanguage === code && styles.selectedLanguage,
                    ]}
                    onPress={() => selectLanguage(code)}
                  >
                    <Text
                      style={[
                        styles.languageText,
                        selectedLanguage === code && styles.selectedLanguageText,
                      ]}
                    >
                      {LANGUAGES[code]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 5,
    flexWrap: "wrap",
    position: "relative",
    zIndex: 1,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    marginHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  activeButton: {
    backgroundColor: "#ff4444",
    borderColor: "#ff4444",
  },
  buttonText: {
    fontSize: 18,
  },
  activeButtonText: {
    color: "#ffffff",
  },
  languageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e3f2fd",
    marginHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbdefb",
  },
  speakingButton: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  languageMenu: {
    position: "absolute",
    top: -280,
    right: 0,
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    width: 250,
    maxHeight: 280,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  languageScroll: {
    maxHeight: 280,
  },
  languageGroup: {
    marginBottom: 12,
  },
  groupHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1976d2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 6,
    borderLeftWidth: 4,
    borderLeftColor: "#1976d2",
  },
  languageOption: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 2,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  selectedLanguage: {
    backgroundColor: "#e3f2fd",
    borderColor: "#bbdefb",
  },
  languageText: {
    fontSize: 15,
    color: "#495057",
    fontWeight: "500",
  },
  selectedLanguageText: {
    color: "#1976d2",
    fontWeight: "700",
  },
});

export default SpeechService;
