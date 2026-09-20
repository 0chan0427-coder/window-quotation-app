# Window Quotation App V28

V28 changes:
- Customer print header is compacted; project/site title is not printed in the customer quote header.
- Dealer card rebuilt from a single LX dealer logo asset; duplicate "공식대리점" branding is removed.
- Required dealer identity: LX하우시스 logo + 주식회사 도도 대리점 name.
- Staff name and phone remain dynamic for all three staff members.
- Window color is selectable per item: 기본색 plus 12 requested colors.
- Color is editable on existing estimates and printed on both customer and internal detailed estimates.
- Existing item classification / screen logic remains: balcony/window corridor -> exterior + AL screen by default, with explicit screen override.
- Customer print uses compact rows and avoids clipping blocks at page boundaries.

Run `supabase-migration-v28.sql` once to persist the new `estimate_items.color` column.
