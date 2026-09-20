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
