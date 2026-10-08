V54 수정사항
- 사용자가 직접 입력한 pricing_rate만 요율 적용 대상으로 사용
- 과거 extras.windowRates 값으로 요율이 되살아나지 않도록 계산 로직에서 분리
- 실행가 default_rate는 사용자 요율로 사용하지 않음
- 기존 견적에서 pricing_rate_source가 manual이 아니고 저장 요율이 현재 선택 평형의 실행가 default_rate와 같으면 레거시 자동 요율로 판단하여 계산에서 제외
- 기존 견적 수정 후 실제 입력된 요율만 manual로 저장
- pricing_rate_source 컬럼 추가
- 실행가 데이터가 선택 평형에 없으면 다른 평형으로 fallback하지 않음
