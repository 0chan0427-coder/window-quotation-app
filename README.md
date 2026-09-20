
# 창호 견적 관리 앱 V23

## 이번 버전의 핵심 변경
- 고객용 견적서 A4 세로 출력 기본 적용
- 고객용 견적서에 본사 문서 느낌의 색상·테두리·표 스타일 적용
- 메모에는 사용자가 직접 입력한 메모만 저장
- 고객 연락처, 담당자, 부가시공비, 결제정보를 별도 필드로 저장하도록 변경
- 앱 실행 시 담당자 선택 화면 유지
- 고객용 견적서에서만 결제 조건 입력 및 저장

## 필수 Supabase SQL

아래 SQL을 Supabase SQL Editor에서 한 번만 실행해주세요.

```sql
alter table public.estimates
  add column if not exists customer_phone text,
  add column if not exists staff_id integer,
  add column if not exists staff_name text,
  add column if not exists extras_data jsonb default '{}'::jsonb,
  add column if not exists payment_data jsonb default null,
  add column if not exists estimate_no text;
```

기존 `product_prices` 데이터는 삭제하거나 다시 업로드하지 마세요.

## 업로드
1. 압축 해제
2. GitHub 저장소의 기존 파일을 모두 교체
3. Commit changes
4. Vercel 자동 배포 완료 후 테스트


## V24 작업 범위
- V23 원본 구조에서 다시 정리하고 담당자 선택 화면을 DOM 초기화 시점에 안전하게 렌더링
- 담당자: 한동균 팀장 / 김민찬 책임 / 김영찬 책임
- 기존 저장 견적을 최초 목록에 표시하고 현장명·고객명·주소·견적번호 검색 지원
- 견적번호 `Q-YYYYMMDD-001` 형식 저장 지원 (`estimate_no` 컬럼이 있으면 사용, 없으면 기존 견적도 호환)
- 첨부된 `견적서 양식.xlsx`의 실제 색상(갈색/버건디), 병합 구조를 기준으로 A4 견적서 화면/인쇄 템플릿 재구현
- 원본 양식에서 추출한 로고·10년 보증·담당자 카드·QR·공식대리점 로고를 `assets/`에 포함
- 세부견적 18행, 창호계/표준시공기술료/부가시공비/합계, 하단 시공 안내 및 결제 영역을 동일한 문서 구조로 출력
- 고객용 결제 조건은 `payment_data` 컬럼을 우선 저장하고, 구버전 DB에서는 메모 fallback
