V48 - LX Z:IN / 주식회사 도도 창호 견적 관리

변경사항
- 메인 화면을 LX Z:IN / 도도 스타일의 미니멀한 UI로 통일
- 메인 화면 문구는 "안녕하세요. / 담당자명"만 표시
- "오늘도 좋은 견적을 만들어보세요" 및 설명성 문구 제거
- 설정 메뉴/아이콘 기반 메뉴를 추가하지 않음
- 새 견적 작성 / 저장된 견적을 같은 디자인 시스템으로 연결
- 저장된 견적 전용 조회 화면 추가
- 최근 견적은 메인 화면에서 최근 5건 표시
- 전체 저장 견적은 검색 가능한 저장된 견적 화면에서 조회
- 견적 상세/수정/고객용/내부용 화면의 기존 기능은 유지하고 공통 색상/간격/카드 스타일을 통일
- 웹앱 favicon/app icon을 기존 주식회사 도도 로고의 '구멍 없는 d' 형태로 교체
- manifest theme/background 색상 변경
- V45 실행가 계산/요율/입력 순서(sort_order) 관련 로직은 유지

주의
- Supabase 연결/DB 동작은 실제 배포 환경의 설정과 DB 상태에 따라 확인 필요
- V48은 기능 변경보다 UI 통일을 중심으로 한 버전입니다.


V48.1 UI refinement: navigation buttons are more visible using LX RED styling; the top LX Z:IN logo is clickable and returns to the main screen; favicon/app icon references use the hole-free d asset with cache-busting.
