# 창호 견적 관리 V29

주요 수정
- 고객용 인쇄 상단의 현장명 제목 제거(목록/상세 화면에서만 유지)
- 5행 견적정보 표와 세부 견적표가 겹치지 않도록 출력 상단 높이/행 높이 조정
- 창호 입력 화면에서 제품 색상을 명확하게 선택 가능
- 기본색 + 12개 선택 색상 지원
- 기존 저장 견적 수정 시 선택 색상 유지
- 상세/고객용 견적서에 선택 색상 표시

색상 목록
기본색, 퓨어 화이트, 스노우 화이트, 모노 화이트, 크림 화이트, 라이트 베이지, 크리미, 크레마, 내추럴 오크, 워시 베이지, 모던 그레이, 어반 그레이, 모던 블랙

Supabase
- `supabase-migration-v29.sql` 실행 권장. 기존 V28에서 color 컬럼이 이미 생성된 경우 다시 실행해도 안전합니다.


## V30 changes
- Color is selected once per estimate, not per window item. Saved in estimates.extras_data.color.
- Existing estimates fall back to legacy color data when available.
- Fixed windows display handle status as '무'; normal windows as '유'.
