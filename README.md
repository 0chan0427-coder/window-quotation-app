
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
  add column if not exists payment_data jsonb default null;
```

기존 `product_prices` 데이터는 삭제하거나 다시 업로드하지 마세요.

## 업로드
1. 압축 해제
2. GitHub 저장소의 기존 파일을 모두 교체
3. Commit changes
4. Vercel 자동 배포 완료 후 테스트
