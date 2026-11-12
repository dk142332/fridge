/**
 * ==========================================================================
 * 냉장고 AI 레시피 웹앱 - 메인 스크립트 (script.js)
 * 1단계(재료 인식) + 2단계(조리 조건 필터) + 3단계(사용자 프로필 및 LocalStorage 저장)
 * 순수 바닐라 JavaScript (No Framework, No Bundler)
 * ==========================================================================
 */

// 엄격 모드 적용
'use strict';

/**
 * LocalStorage 키 상수
 */
const STORAGE_KEYS = {
  PROFILE: 'fridge_ai_user_profile_v1',     // 사용자 프로필 키
  SAVED_RECIPES: 'fridge_ai_saved_recipes_v1', // 저장된 레시피 키
};

/**
 * 전역 애플리케이션 상태 (Application State)
 */
const AppState = {
  currentStep: 1,           // 현재 진행 단계 (1: 재료 인식, 2: 레시피 추천, 3: 보관함)
  selectedFile: null,       // 사용자가 선택한 원본 이미지 파일
  compressedBase64: null,   // 압축된 Base64 이미지 문자열 (OpenRouter API 전송용)
  
  // 1단계: 기본 선택된 식재료 샘플 (1단계에서 인식 및 추가된 목록)
  ingredients: ['계란', '대파', '김치', '두부'],
  
  // 2단계: 조리 조건 및 기본 양념 필터 상태
  filters: {
    cuisine: 'all',         // 요리 종류: all, korean, western, asian, snack, diet
    maxTime: 'any',         // 최대 조리 시간: any, 15, 30, 60
    difficulty: 'any',      // 난이도: any, easy, medium
    seasonings: ['소금', '설탕', '간장', '식용유', '고춧가루'], // 보유 양념 목록
  },

  // 3단계: 사용자 맞춤 프로필 상태
  profile: {
    nickname: '알뜰 요리사',
    dietType: 'normal',     // 식단 유형: normal, high_protein, low_carb, low_salt, vegan
    allergies: ['새우', '땅콩'], // 알레르기 식재료 목록
    dislikes: ['오이'],          // 비선호/기피 식재료 목록
  }
};

/**
 * 주요 DOM 요소를 참조하여 객체에 보관합니다.
 */
let DOM = {};

/**
 * DOM이 모두 로드되었을 때 애플리케이션을 초기화합니다.
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. 초기 UI 요소 캐싱
  initDOMElements();

  // 2. LocalStorage에서 저장된 프로필 로드
  loadProfileFromStorage();

  // 3. 1, 2, 3단계 이벤트 바인딩
  bindStep1Events();
  bindStep2Events();
  bindStep3Events();

  // 4. 초기 화면 상태 렌더링
  renderStep1SummaryInStep2();
  renderProfileUI();
  goToStep(AppState.currentStep);

  console.log('✅ [냉장고 AI 레시피] 3단계: 사용자 프로필 관리 및 LocalStorage 시스템이 초기화되었습니다.');
});

/**
 * 주요 DOM 요소를 찾아 DOM 객체에 등록합니다.
 */
function initDOMElements() {
  DOM = {
    // 스텝 인디케이터
    stepItems: document.querySelectorAll('.step-item'),

    // 섹션 컨테이너
    step1Section: document.getElementById('step1-section'),
    step2Section: document.getElementById('step2-section'),
    step3Section: document.getElementById('step3-section'),
    
    // 1단계 요소
    imageInput: document.getElementById('image-input'),
    dropzone: document.getElementById('dropzone'),
    btnSelectFile: document.getElementById('btn-select-file'),
    previewContainer: document.getElementById('preview-container'),
    previewImage: document.getElementById('preview-image'),
    btnAnalyze: document.getElementById('btn-analyze'),
    resultContainer: document.getElementById('result-container'),
    ingredientTags: document.getElementById('ingredient-tags'),
    btnGoToStep2: document.getElementById('btn-go-to-step2'),

    // 2단계 요소
    btnBackToStep1: document.getElementById('btn-back-to-step1'),
    selectedIngredientsCount: document.getElementById('selected-ingredients-count'),
    selectedIngredientsSummary: document.getElementById('selected-ingredients-summary'),
    filterCuisine: document.getElementById('filter-cuisine'),
    filterTime: document.getElementById('filter-time'),
    filterDifficulty: document.getElementById('filter-difficulty'),
    seasoningSelector: document.getElementById('seasoning-selector'),
    btnGenerateRecipes: document.getElementById('btn-generate-recipes'),

    // 3단계 요소
    btnBackToStep2: document.getElementById('btn-back-to-step2'),
    subTabBtns: document.querySelectorAll('.sub-tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    formUserProfile: document.getElementById('form-user-profile'),
    inputProfileNickname: document.getElementById('input-profile-nickname'),
    profileDietGroup: document.getElementById('profile-diet-group'),
    
    // 3단계: 알레르기 관리
    allergyTagsContainer: document.getElementById('allergy-tags-container'),
    inputAddAllergy: document.getElementById('input-add-allergy'),
    btnAddAllergy: document.getElementById('btn-add-allergy'),
    
    // 3단계: 기피재료 관리
    dislikeTagsContainer: document.getElementById('dislike-tags-container'),
    inputAddDislike: document.getElementById('input-add-dislike'),
    btnAddDislike: document.getElementById('btn-add-dislike'),
    
    // 3단계: 빠른 추천 칩
    quickChips: document.querySelectorAll('.quick-chip'),
  };
}

/**
 * LocalStorage에서 사용자 프로필을 불러옵니다.
 */
function loadProfileFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 기존 기본값과 안전하게 병합
      AppState.profile = {
        ...AppState.profile,
        ...parsed
      };
      console.log('📦 [LocalStorage] 프로필을 성공적으로 불러왔습니다:', AppState.profile);
    }
  } catch (error) {
    console.error('LocalStorage 프로필 로드 실패:', error);
  }
}

/**
 * 현재 프로필 상태를 LocalStorage에 저장합니다.
 */
function saveProfileToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(AppState.profile));
    console.log('💾 [LocalStorage] 프로필이 성공적으로 저장되었습니다:', AppState.profile);
  } catch (error) {
    console.error('LocalStorage 프로필 저장 실패:', error);
    alert('프로필을 저장하는 중 오류가 발생했습니다.');
  }
}

/**
 * 1단계 이벤트 바인딩 (이미지 선택, 드래그 앤 드롭, 미리보기 및 압축)
 */
function bindStep1Events() {
  // 1. 파일 선택 버튼 클릭 시 숨겨진 input[type="file"] 트리거
  if (DOM.btnSelectFile && DOM.imageInput) {
    DOM.btnSelectFile.addEventListener('click', (e) => {
      e.stopPropagation();
      DOM.imageInput.click();
    });
  }

  // 2. 드롭존 클릭 시에도 파일 선택창 열기
  if (DOM.dropzone && DOM.imageInput) {
    DOM.dropzone.addEventListener('click', () => {
      DOM.imageInput.click();
    });

    // 드래그 앤 드롭 이벤트 처리 (dragover, dragleave, drop)
    ['dragenter', 'dragover'].forEach(eventName => {
      DOM.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        DOM.dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      DOM.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        DOM.dropzone.classList.remove('dragover');
      });
    });

    // 파일이 드롭되었을 때 처리
    DOM.dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleImageSelected(files[0]);
      }
    });
  }

  // 3. input[type="file"]로 파일이 선택되었을 때 처리
  if (DOM.imageInput) {
    DOM.imageInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleImageSelected(files[0]);
      }
    });
  }

  // 4. 미리보기 이미지 삭제(✕) 버튼 클릭 시 초기화
  if (DOM.btnRemoveImage) {
    DOM.btnRemoveImage.addEventListener('click', (e) => {
      e.stopPropagation();
      resetImageSelection();
    });
  }

  // 5. 식재료 분석 시작 버튼 클릭 (1-2단계에서는 유효성 및 압축 데이터 확인)
  if (DOM.btnAnalyze) {
    DOM.btnAnalyze.addEventListener('click', () => {
      if (!AppState.compressedBase64) {
        alert('먼저 냉장고 사진을 업로드해 주세요.');
        return;
      }
      alert(`[1-2 압축 완료 확인]\n\n파일명: ${AppState.selectedFile.name}\n압축된 Base64 길이: ${AppState.compressedBase64.length.toLocaleString()} 자\n\n다음 마이크로 태스크(1-3. api/analyze-fridge.js 서버리스 함수)에서 실제 AI 분석이 진행됩니다!`);
    });
  }

  // 6. 1단계 -> 2단계 이동 버튼
  if (DOM.btnGoToStep2) {
    DOM.btnGoToStep2.addEventListener('click', () => {
      goToStep(2);
    });
  }
}

/**
 * 사용자가 선택/드롭한 이미지를 검증하고 Canvas를 통해 최적화 압축합니다.
 * @param {File} file - 업로드된 이미지 파일
 */
async function handleImageSelected(file) {
  // 이미지 파일 여부 확인
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일(JPG, PNG, WebP 등)만 업로드할 수 있습니다.');
    return;
  }

  console.log(`📸 [이미지 선택] 파일명: ${file.name}, 원본 크기: ${(file.size / 1024).toFixed(1)} KB`);
  AppState.selectedFile = file;

  try {
    // 1. Canvas를 이용한 이미지 리사이징 및 Base64 압축 (최대 너비 1280px, 화질 82%)
    const compressedDataUrl = await compressImageFile(file, 1280, 0.82);
    AppState.compressedBase64 = compressedDataUrl;

    // 압축 결과 계산 (Base64 헤더 제외 대략적 바이트 계산)
    const base64Length = compressedDataUrl.length - 'data:image/jpeg;base64,'.length;
    const approximateBytes = (base64Length * 3) / 4;
    const compressedKb = (approximateBytes / 1024).toFixed(1);

    console.log(`✨ [이미지 압축 완료] 압축 후 크기: 약 ${compressedKb} KB (OpenRouter API 전송 최적화)`);

    // 2. UI 미리보기 갱신
    if (DOM.previewImage) {
      DOM.previewImage.src = compressedDataUrl;
    }
    if (DOM.previewFilename) {
      DOM.previewFilename.textContent = file.name;
    }
    if (DOM.previewFilesize) {
      DOM.previewFilesize.textContent = `약 ${compressedKb} KB (AI 전송 최적화)`;
    }

    // 드롭존 숨기고 미리보기 컨테이너 표시
    if (DOM.dropzone) DOM.dropzone.classList.add('hidden');
    if (DOM.previewContainer) DOM.previewContainer.classList.remove('hidden');

    // 분석 시작 버튼 활성화
    if (DOM.btnAnalyze) {
      DOM.btnAnalyze.disabled = false;
    }

  } catch (error) {
    console.error('이미지 압축 중 오류 발생:', error);
    alert('이미지를 처리하는 중 오류가 발생했습니다. 다른 사진을 시도해 주세요.');
    resetImageSelection();
  }
}

/**
 * HTML5 Canvas API를 이용하여 이미지를 리사이징하고 압축하는 함수
 * @param {File} file - 원본 파일 객체
 * @param {number} maxWidth - 허용 최대 가로 너비 (기본 1280px)
 * @param {number} quality - JPEG 압축 품질 (0.0 ~ 1.0, 기본 0.82)
 * @returns {Promise<string>} Base64 Data URL
 */
function compressImageFile(file, maxWidth = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // 1. 파일을 FileReader로 읽기
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 2. 종횡비를 유지하면서 최대 너비/높이에 맞게 크기 계산
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        // 3. Canvas 생성 및 이미지 그리기
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // 부드러운 이미지 축소를 위한 이미지 스무딩 설정
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // 4. JPEG 형식으로 압축하여 Base64 반환
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * 이미지 선택 상태를 초기화하고 드롭존을 다시 노출합니다.
 */
function resetImageSelection() {
  AppState.selectedFile = null;
  AppState.compressedBase64 = null;

  if (DOM.imageInput) DOM.imageInput.value = '';
  if (DOM.previewImage) DOM.previewImage.src = '';
  
  if (DOM.previewContainer) DOM.previewContainer.classList.add('hidden');
  if (DOM.dropzone) DOM.dropzone.classList.remove('hidden');
  
  if (DOM.btnAnalyze) DOM.btnAnalyze.disabled = true;
  console.log('🔄 이미지 선택이 초기화되었습니다.');
}

/**
 * 2단계 이벤트 바인딩
 */
function bindStep2Events() {
  if (DOM.btnBackToStep1) {
    DOM.btnBackToStep1.addEventListener('click', () => {
      goToStep(1);
    });
  }

  setupSingleSelectChips(DOM.filterCuisine, (value) => {
    AppState.filters.cuisine = value;
  });

  setupSingleSelectChips(DOM.filterTime, (value) => {
    AppState.filters.maxTime = value;
  });

  setupSingleSelectChips(DOM.filterDifficulty, (value) => {
    AppState.filters.difficulty = value;
  });

  if (DOM.seasoningSelector) {
    DOM.seasoningSelector.addEventListener('change', (e) => {
      if (e.target.name === 'seasoning') {
        const checkedInputs = DOM.seasoningSelector.querySelectorAll('input[name="seasoning"]:checked');
        AppState.filters.seasonings = Array.from(checkedInputs).map(input => input.value);
      }
    });
  }

  if (DOM.btnGenerateRecipes) {
    DOM.btnGenerateRecipes.addEventListener('click', () => {
      alert(`[2단계 레시피 요청 준비]\n프로필 알레르기 제외: [${AppState.profile.allergies.join(', ')}]\n프로필 기피재료: [${AppState.profile.dislikes.join(', ')}]\n\n이 정보가 AI 프롬프트에 자동으로 연동됩니다!`);
    });
  }
}

/**
 * 3단계(사용자 프로필 관리) 이벤트 바인딩
 */
function bindStep3Events() {
  // 3단계 -> 2단계로 돌아가기 버튼
  if (DOM.btnBackToStep2) {
    DOM.btnBackToStep2.addEventListener('click', () => {
      goToStep(2);
    });
  }

  // 3단계 서브 탭 전환 (프로필 / 저장된 레시피 / 히스토리)
  DOM.subTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      DOM.subTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      DOM.tabContents.forEach(content => {
        if (content.id === `tab-content-${targetTab}`) {
          content.classList.remove('hidden');
          content.classList.add('active');
        } else {
          content.classList.add('hidden');
          content.classList.remove('active');
        }
      });
    });
  });

  // 식단 유형 칩 선택 이벤트
  setupSingleSelectChips(DOM.profileDietGroup, (value) => {
    AppState.profile.dietType = value;
  });

  // 알레르기 식재료 추가 버튼 클릭
  if (DOM.btnAddAllergy && DOM.inputAddAllergy) {
    DOM.btnAddAllergy.addEventListener('click', () => {
      addAllergyItem(DOM.inputAddAllergy.value.trim());
      DOM.inputAddAllergy.value = '';
    });

    // 엔터키 추가 지원
    DOM.inputAddAllergy.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        DOM.btnAddAllergy.click();
      }
    });
  }

  // 기피 식재료 추가 버튼 클릭
  if (DOM.btnAddDislike && DOM.inputAddDislike) {
    DOM.btnAddDislike.addEventListener('click', () => {
      addDislikeItem(DOM.inputAddDislike.value.trim());
      DOM.inputAddDislike.value = '';
    });

    // 엔터키 추가 지원
    DOM.inputAddDislike.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        DOM.btnAddDislike.click();
      }
    });
  }

  // 빠른 추천 칩 클릭 이벤트 (+갑각류, +오이 등)
  DOM.quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const target = chip.getAttribute('data-target');
      const name = chip.getAttribute('data-name');
      if (target === 'allergy') {
        addAllergyItem(name);
      } else if (target === 'dislike') {
        addDislikeItem(name);
      }
    });
  });

  // 프로필 저장 폼 submit 이벤트
  if (DOM.formUserProfile) {
    DOM.formUserProfile.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // 닉네임 상태 동기화
      if (DOM.inputProfileNickname) {
        AppState.profile.nickname = DOM.inputProfileNickname.value.trim() || '알뜰 요리사';
      }

      // LocalStorage에 저장
      saveProfileToStorage();

      alert(`✅ [프로필 저장 완료]\n\n닉네임: ${AppState.profile.nickname}\n식단: ${AppState.profile.dietType}\n알레르기: [${AppState.profile.allergies.join(', ')}]\n기피 재료: [${AppState.profile.dislikes.join(', ')}]\n\n브라우저를 새로고침해도 설정이 안전하게 유지됩니다!`);
    });
  }

  // 상단 스텝 인디케이터 전체(1, 2, 3단계) 클릭 지원
  DOM.stepItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetStep = parseInt(item.getAttribute('data-step'), 10);
      goToStep(targetStep);
    });
  });
}

/**
 * 프로필 상태를 UI 입력 필드 및 태그 칩에 반영합니다.
 */
function renderProfileUI() {
  // 닉네임 입력란 반영
  if (DOM.inputProfileNickname) {
    DOM.inputProfileNickname.value = AppState.profile.nickname;
  }

  // 식단 유형 칩 활성화 상태 반영
  if (DOM.profileDietGroup) {
    const chips = DOM.profileDietGroup.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
      if (chip.getAttribute('data-value') === AppState.profile.dietType) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  // 알레르기 및 기피재료 태그 목록 렌더링
  renderAllergyTags();
  renderDislikeTags();
}

/**
 * 알레르기 태그 칩 렌더링
 */
function renderAllergyTags() {
  if (!DOM.allergyTagsContainer) return;
  DOM.allergyTagsContainer.innerHTML = '';

  if (AppState.profile.allergies.length === 0) {
    DOM.allergyTagsContainer.innerHTML = '<span class="quick-label">등록된 알레르기 재료가 없습니다.</span>';
    return;
  }

  AppState.profile.allergies.forEach((item, index) => {
    const chip = document.createElement('span');
    chip.className = 'allergy-chip';
    chip.innerHTML = `
      <span>⚠️ ${escapeHTML(item)}</span>
      <button type="button" class="chip-delete-btn" title="삭제" aria-label="삭제">✕</button>
    `;
    chip.querySelector('.chip-delete-btn').addEventListener('click', () => {
      removeAllergyItem(index);
    });
    DOM.allergyTagsContainer.appendChild(chip);
  });
}

/**
 * 알레르기 재료 추가
 * @param {string} name 
 */
function addAllergyItem(name) {
  if (!name) return;
  if (AppState.profile.allergies.includes(name)) {
    alert('이미 등록된 알레르기 식재료입니다.');
    return;
  }
  AppState.profile.allergies.push(name);
  renderAllergyTags();
}

/**
 * 알레르기 재료 삭제
 * @param {number} index 
 */
function removeAllergyItem(index) {
  AppState.profile.allergies.splice(index, 1);
  renderAllergyTags();
}

/**
 * 기피 식재료 태그 칩 렌더링
 */
function renderDislikeTags() {
  if (!DOM.dislikeTagsContainer) return;
  DOM.dislikeTagsContainer.innerHTML = '';

  if (AppState.profile.dislikes.length === 0) {
    DOM.dislikeTagsContainer.innerHTML = '<span class="quick-label">등록된 기피 재료가 없습니다.</span>';
    return;
  }

  AppState.profile.dislikes.forEach((item, index) => {
    const chip = document.createElement('span');
    chip.className = 'dislike-chip';
    chip.innerHTML = `
      <span>🙅 ${escapeHTML(item)}</span>
      <button type="button" class="chip-delete-btn" title="삭제" aria-label="삭제">✕</button>
    `;
    chip.querySelector('.chip-delete-btn').addEventListener('click', () => {
      removeDislikeItem(index);
    });
    DOM.dislikeTagsContainer.appendChild(chip);
  });
}

/**
 * 기피 재료 추가
 * @param {string} name 
 */
function addDislikeItem(name) {
  if (!name) return;
  if (AppState.profile.dislikes.includes(name)) {
    alert('이미 등록된 기피 식재료입니다.');
    return;
  }
  AppState.profile.dislikes.push(name);
  renderDislikeTags();
}

/**
 * 기피 재료 삭제
 * @param {number} index 
 */
function removeDislikeItem(index) {
  AppState.profile.dislikes.splice(index, 1);
  renderDislikeTags();
}

/**
 * 1단계 요약 칩을 2단계에 렌더링
 */
function renderStep1SummaryInStep2() {
  if (!DOM.selectedIngredientsSummary || !DOM.selectedIngredientsCount) return;

  DOM.selectedIngredientsCount.textContent = `${AppState.ingredients.length}개 선택됨`;
  DOM.selectedIngredientsSummary.innerHTML = '';

  AppState.ingredients.forEach(name => {
    const chip = document.createElement('span');
    chip.className = 'chip chip-ingredient';
    chip.textContent = name;
    DOM.selectedIngredientsSummary.appendChild(chip);
  });
}

/**
 * 단일 선택 칩 그룹 바인딩 유틸리티
 */
function setupSingleSelectChips(container, onChange) {
  if (!container) return;

  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;

    container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    const value = chip.getAttribute('data-value');
    if (onChange) onChange(value);
  });
}

/**
 * 단계 전환 함수
 * @param {number} step - 단계 번호 (1, 2, 3)
 */
function goToStep(step) {
  AppState.currentStep = step;
  updateStepIndicator(step);

  // 모든 섹션 숨김 처리
  if (DOM.step1Section) DOM.step1Section.classList.add('hidden');
  if (DOM.step2Section) DOM.step2Section.classList.add('hidden');
  if (DOM.step3Section) DOM.step3Section.classList.add('hidden');

  // 활성화할 섹션 표시
  if (step === 1 && DOM.step1Section) {
    DOM.step1Section.classList.remove('hidden');
  } else if (step === 2 && DOM.step2Section) {
    DOM.step2Section.classList.remove('hidden');
    renderStep1SummaryInStep2();
  } else if (step === 3 && DOM.step3Section) {
    DOM.step3Section.classList.remove('hidden');
    renderProfileUI();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 상단 스텝 인디케이터 상태 업데이트
 * @param {number} currentStep 
 */
function updateStepIndicator(currentStep) {
  DOM.stepItems.forEach(item => {
    const stepNum = parseInt(item.getAttribute('data-step'), 10);
    if (stepNum <= currentStep) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/**
 * XSS 방지를 위한 HTML 문자열 이스케이프 유틸리티
 * @param {string} str 
 * @returns {string}
 */
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
