# Code Improvements Task

## 1. Extract Shared Toggle Component
- Create a generic `TogglePublicPrivate` component in `src/shared/ui/` that can be used by both catalog and archive variants.
- Update `src/views/public-catalog/toggle-public-private.tsx` to use the shared component.
- Update `src/views/public-archive/toggle-public-private.tsx` to use the shared component.

## 2. Improve Archive Toggle Component
- Parse HTTP-date Retry-After headers in addition to numeric.
- Add aria attributes (`aria-pressed`, `aria-busy`) for accessibility.
- Map common non-OK HTTP codes (404, 403, 5xx) to clearer error messages.

## 3. Fix Catalog API Route
- Return structured error details as objects instead of JSON strings.
- Add server-side logging for unexpected errors before returning 500.

## 4. Fix Archive API Route
- Return structured error details as objects instead of JSON strings.
- Add server-side logging for unexpected errors before returning 500.

## 5. Improve Firebase Helper
- Use `FieldValue.serverTimestamp()` instead of client `Timestamp.now()`.
- Add generics and precise payload type for type safety.
- Remove redundant optional chaining.

## 6. Fix Explore Archives Toggle
- Make ToggleGroup controlled by using `value` prop instead of `defaultValue`.
- Remove inline styles and use CSS classes for selected-state styling.

## 7. Clean Up Archive Meta Service
- Omit the unused optional `currentData` parameter in `updateWithPublicStatus` call.
