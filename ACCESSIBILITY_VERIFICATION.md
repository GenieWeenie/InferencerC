# Accessibility Verification Checklist

## Animation Polish
- [x] Code block collapse/expand uses optimized framer-motion animation
  - Duration: 0.25s with custom easing [0.4, 0, 0.2, 1]
  - Opacity transition: 0.2s
  - Uses `willChange: height, opacity` for performance
  - No janky animations

## ARIA Labels & Attributes

### Message Collapse Toggle
- [x] Has `aria-label` with context (word count)
- [x] Has `aria-expanded` attribute
- [x] Has `aria-controls` pointing to `message-content`
- [x] Icons have `aria-hidden="true"`

### Code Block Collapse Toggle
- [x] Has `aria-label` with language context
- [x] Has `aria-expanded` attribute
- [x] Has `aria-controls` pointing to code block ID
- [x] Icons have `aria-hidden="true"`

### Action Buttons
- [x] PREVIEW button has `aria-label`
- [x] INSERT button has `aria-label`
- [x] RUN button has `aria-label` (dynamic based on state)
- [x] GIST button has `aria-label`
- [x] SAVE button has `aria-label` with language
- [x] COPY button has `aria-label` (dynamic based on state)

### Form Elements
- [x] Language selector has `aria-label`
- [x] File path input has proper `label` (sr-only)
- [x] File path input has `aria-label`
- [x] File insertion form has `role="form"` and `aria-label`

### Content Regions
- [x] Message content has `role="region"` and `aria-label`
- [x] Thought process has `aria-label` on summary
- [x] Thought process content has `role="region"`

## Keyboard Navigation

### Focus Styles
- [x] All buttons have `focus:outline-none focus:ring-2` with appropriate ring color
- [x] Message toggle has visible focus ring (primary color)
- [x] Code block toggle has visible focus ring (primary color)
- [x] All action buttons have color-matched focus rings
- [x] Language selector has focus ring
- [x] File path input has focus ring
- [x] Thought process summary has focus ring

### Keyboard Support
- [x] All buttons are keyboard accessible (Tab navigation)
- [x] Enter key works on all buttons (native behavior)
- [x] File path input supports Enter (submit) and Escape (cancel)
- [x] Native details/summary supports Space/Enter

## Focus Management
- [x] Refs created for message toggle and code block toggles
- [x] Focus can be managed after expand/collapse operations
- [x] File path input auto-focuses when opened

## Testing Instructions

### Manual Testing
1. **Smooth Animations**
   - Open a message with code blocks
   - Collapse and expand code blocks - verify smooth animation, no jank
   - Collapse and expand long messages - verify smooth animation

2. **ARIA Labels**
   - Use browser DevTools to inspect elements
   - Verify all interactive elements have appropriate ARIA attributes
   - Use screen reader (NVDA/JAWS on Windows, VoiceOver on Mac) to verify announcements

3. **Keyboard Navigation**
   - Use Tab key to navigate through all interactive elements
   - Verify visible focus indicator on each element
   - Press Enter on toggle buttons to expand/collapse
   - Press Enter in file path input to submit
   - Press Escape in file path input to cancel

4. **Focus Management**
   - Expand/collapse elements and verify focus remains logical
   - Check that newly opened inputs receive focus
   - Verify focus doesn't get lost after state changes
