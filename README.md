# Window Quotation App V31

V31 focuses on correcting legacy saved-estimate additional construction costs.

## Changes
- Recalculates **사춤 / 타일** when an existing estimate is opened or printed:
  - `발코니창` + actual height >= 2000 mm: 100,000 KRW per window.
- Recalculates **몰딩** from the saved window items:
  - `분합창`, `내창`, `주방창`: 55,000 KRW per window.
  - `발코니창` is not charged molding.
- Existing saved estimates are no longer forced to keep stale saved `sash`/`molding` values when their item data supports recalculation.
- Existing equipment/demolition/protection conditions are preserved from `extras_data.conditions`; if those conditions are unavailable, their saved values are retained.
- The same recalculated additional-cost values are used in the detail view and both internal/customer quotation print views.
- No new SQL migration is required for V31.

## Existing behavior retained
- Estimate-wide color stored in `estimates.extras_data.color`.
- Fixed windows display `핸들 무`.
- Staff phone numbers and product/window classification behavior from V30 remain unchanged.


## V32 변경사항
- 가격표보다 작은 실측 가로/세로는 제품별 가격표의 최소 규격으로 자동 보정하여 계산합니다.
- 예: 600×1300에서 최소 가로가 1000이면 1000×1400 가격을 사용합니다.
- DB 마이그레이션은 필요하지 않습니다.

## V33 할인 기능
- 내부용 상세 견적에서 자재비 합계와 시공비 합계를 별도로 확인할 수 있습니다.
- 자재비 합계에 적용할 할인율(%)을 입력하고 저장할 수 있습니다.
- 할인금액은 자재비 합계에만 적용됩니다.
- 최종 견적금액 = 자재비 + 시공비 - 자재비 할인 + 부가시공비
- 저장된 할인율은 견적별로 `extras_data.discountRate`에 저장되며 기존 견적에도 적용됩니다.
- 고객용 견적서의 총 견적액과 결제금액도 할인 적용 후 최종 금액을 기준으로 계산됩니다.
- DB 스키마 변경은 필요하지 않습니다. 기존 `extras_data` 컬럼을 사용합니다.


## V35 변경사항
- 담당자 자동로그인 제거: 접속할 때마다 담당자 선택 화면 표시
- DODO 창호 아이콘 적용 및 favicon / 모바일 홈 아이콘 추가
- 기본 도메인 표기 및 PWA 시작 주소: https://dodo-pj-1.com/
- 기존 견적/할인/결제/금액 조정 기능은 변경하지 않음
