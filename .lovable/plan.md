

# Fix: Remove Carousel from BookingSelectBlock

## Problem
When there are 3+ bookings, the `BookingSelectBlock` uses an Embla carousel with `basis-[85%]` items, causing horizontal scrolling and clipped cards inside the narrow chat widget. This is a poor UX for a widget context.

## Fix

**File**: `src/widget/components/blocks/BookingSelectBlock.tsx`

Remove the carousel entirely and always use the vertical stack layout:

1. Remove imports: `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselApi` from `@/components/ui/carousel`
2. Remove state: `api`, `currentSlide`, `useCarousel` flag, and the `useEffect` for carousel API
3. Remove the `renderCards` function's carousel branch (the `if (useCarousel)` block with dot indicators)
4. Always render the vertical stack (the existing "1-2 bookings" path), which shows all cards fully visible and scrollable within the chat bubble

The vertical stack layout already exists in the component -- this change simply makes it the only layout, removing ~30 lines of carousel code.

## Technical Details

| What | Change |
|------|--------|
| Remove imports | `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselApi` |
| Remove state | `api` (`useState`), `currentSlide` (`useState`), `useCarousel` flag, carousel `useEffect` |
| Remove render branch | The `if (useCarousel)` block including carousel markup and dot indicators |
| Keep | Vertical stack layout (already exists), all `BookingCard` logic unchanged |

