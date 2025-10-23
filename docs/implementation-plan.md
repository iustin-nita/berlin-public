# Berlin Fountains App - Implementation Plan

## Selected Improvements

This plan covers the following enhancements:
- Favorites Enhancement (tap to navigate to map location, sorting)
- Tap Behavior Improvements (deselect on empty tap, hints, cluster feedback)
- Data Caching (offline support, faster startup)
- Onboarding Flow (first-launch tutorial)
- Quick Icon/Visual Fixes

---

## Phase 1: Quick Icon/Visual Fixes
*Low risk, immediate polish | ~30 minutes*

### 1.1 Fix Tab Bar Icons
**File:** `src/navigation/index.tsx`
- Replace newspaper icon → map pin icon for Map tab
- Replace bell icon → star icon for Favorites tab

### 1.2 Match Favorite List Icons to Map Markers
**File:** `src/navigation/screens/Favorites.tsx`
- Replace 💧 emoji → use actual `water-drop.png` asset
- Replace 🚻 emoji → use `toilet.png` asset
- Replace ⛲ emoji → use `decor.png` asset

### 1.3 Clean Up Map.tsx
**File:** `src/navigation/screens/Map.tsx`
- Remove unused `initialCenter` variable (line 358) - no longer needed after location fix
- Fix `hasInitiallyCentered` race condition by checking both `userLocation` and `styleLoaded` before setting flag

---

## Phase 2: Favorites Enhancement
*Navigate from Favorites → Map | ~1-2 hours*

### 2.1 Update FavoritesContext
**File:** `src/favorites/FavoritesContext.tsx`
- Add `dateAdded: number` timestamp to stored favorites
- Migrate existing favorites to include timestamp

### 2.2 Add Navigation from Favorites
**File:** `src/navigation/screens/Favorites.tsx`
- Import `useNavigation` hook
- On item tap → switch to Map tab + fly camera to location + auto-select marker
- Pass feature data through navigation params

### 2.3 Add Sort Controls
**File:** `src/navigation/screens/Favorites.tsx`
- Add sort state: `'distance' | 'recent' | 'name'`
- Create segmented control UI in header
- Sort options:
  - **Distance** (default) - requires user location
  - **Recently Added** - sort by `dateAdded` desc
  - **Name A-Z** - alphabetical sort
- Calculate distance for each favorite (reuse haversine from `utils.ts`)
- Persist sort preference to AsyncStorage

---

## Phase 3: Map Tap Improvements
*Better interaction feedback | ~2-3 hours*

### 3.1 Tap Empty Map → Deselect
**File:** `src/navigation/screens/Map.tsx`
- Add `onPress` handler to `Mapbox.MapView` component
- Clear `selected` state when no features are hit
- Smoothly collapse bottom sheet

### 3.2 First-Time Hint System
**Files:**
- `src/navigation/screens/Map.tsx`
- Create `src/components/MapHint.tsx` (optional)

**Implementation:**
- Add AsyncStorage key `hasSeenMapHint`
- Show dismissible tooltip near first visible marker: "Tap marker to see details"
- Auto-dismiss after 5 seconds OR on first marker tap
- Floating overlay with arrow pointing to nearest marker
- "Got it" dismiss button

### 3.3 Better Cluster Visuals
**File:** `src/navigation/screens/Map.tsx`
- Animate cluster expansion on tap (scale transform)
- Add pulsing effect to clusters (animated opacity)
- Optional: Long-press cluster → show preview sheet with list of items in cluster

---

## Phase 4: Data Caching
*Faster startup + offline support | ~2-3 hours*

### 4.1 Create Caching Hook
**File:** `src/navigation/screens/map/useCachedFountainsData.ts` (new)

**Cache structure:**
```typescript
{
  data: FeatureProps[],
  timestamp: number,
  version: string
}
```

**AsyncStorage keys:**
- `fountains:cache:v1` - cached fountain data
- `fountains:lastFetch` - last successful fetch timestamp

### 4.2 Implement Cache Strategy
**Files:**
- `src/navigation/screens/map/useCachedFountainsData.ts`
- `src/navigation/screens/Map.tsx`

**Strategy:**
1. On app start → load from cache immediately (optimistic UI)
2. Fetch fresh data in background
3. Replace cache on successful fetch
4. If cache > 24 hours old → show refresh indicator
5. If fetch fails → continue using stale cache

### 4.3 Offline Mode Support
**Files:**
- `src/navigation/screens/Map.tsx`
- Create `src/hooks/useNetworkStatus.ts` (new)

**Features:**
- Detect network status using `@react-native-community/netinfo`
- Show banner when offline: "You're offline - using cached data"
- Disable community voting buttons when offline
- Show "Updated X hours ago" in banner
- Add manual refresh button when online

---

## Phase 5: Onboarding Flow
*First-launch tutorial | ~3-4 hours*

### 5.1 Create Onboarding Screens
**File:** `src/navigation/screens/Onboarding.tsx` (new)

**3 Slides:**
1. **Welcome & Map Basics**
   - "Find drinking water fountains & public toilets in Berlin"
   - Illustration of map with pins
   - "Tap any marker to see details"

2. **Favorites**
   - "Save your favorite locations"
   - Illustration of star button
   - "Access them anytime from the Favorites tab"

3. **Community Voting**
   - "Help others by reporting status"
   - Illustration of thumbs up/down
   - "Is this fountain working? Let us know!"

**UI:**
- Swipeable carousel (react-native-reanimated)
- Dot indicators showing progress
- "Skip" button on each slide
- "Get Started" button on final slide

### 5.2 Integration
**Files:**
- `src/navigation/index.tsx`
- `src/App.tsx`

**Implementation:**
- AsyncStorage key: `hasCompletedOnboarding:v1`
- Add Onboarding screen to navigation stack
- Initial route logic:
  - If `!hasCompletedOnboarding` → show Onboarding
  - Else → show HomeTabs
- On "Get Started" → set flag + navigate to HomeTabs

### 5.3 Settings Integration
**File:** `src/navigation/screens/Settings.tsx`

**Features:**
- Add "Show Tutorial Again" button
- Resets `hasCompletedOnboarding` flag
- Navigates back to Onboarding

---

## Implementation Order

**Recommended sequence:**

1. **Phase 1** (30 min) ✅ Start here
   - Immediate visual improvements
   - Low risk, high confidence

2. **Phase 2** (1-2 hrs)
   - High user value
   - Builds on existing favorites system

3. **Phase 3** (2-3 hrs)
   - Improves core map UX
   - Independent of other phases

4. **Phase 4** (2-3 hrs)
   - Performance win
   - Enables offline use
   - Can be done independently

5. **Phase 5** (3-4 hrs)
   - Optional, nice-to-have
   - Best done last when app is stable

---

## Dependencies & Assets Needed

### Icons/Assets
- Map pin icon for Map tab (find or create)
- Star icon for Favorites tab (find or create)
- Onboarding illustrations (Phase 5)

### New Dependencies
**Phase 4:**
- `@react-native-community/netinfo` - network status detection

**Phase 5:**
- No new deps (use existing react-native-reanimated)

### Existing Assets to Reuse
- `assets/water-drop.png` - for drinking fountains
- `assets/toilet.png` - for toilets
- `assets/decor.png` - for decorative fountains

---

## Testing Checklist

### Phase 1
- [ ] Tab icons display correctly on iOS
- [ ] Tab icons display correctly on Android
- [ ] Favorite list shows correct icons for each type
- [ ] No console warnings or errors

### Phase 2
- [ ] Tapping favorite navigates to Map tab
- [ ] Camera flies to correct location
- [ ] Marker auto-selects and shows details
- [ ] Sort controls work correctly
- [ ] Distance calculation is accurate
- [ ] Sort preference persists across app restarts

### Phase 3
- [ ] Tapping empty map deselects fountain
- [ ] Hint shows only on first launch
- [ ] Hint dismisses after 5s or on tap
- [ ] Cluster tap animation is smooth
- [ ] Cluster expansion works correctly

### Phase 4
- [ ] Cache loads instantly on app start
- [ ] Background refresh completes successfully
- [ ] Offline banner shows when disconnected
- [ ] Stale cache still works when fetch fails
- [ ] Community voting disabled when offline

### Phase 5
- [ ] Onboarding shows on first launch only
- [ ] All 3 slides are swipeable
- [ ] Skip button works on any slide
- [ ] "Get Started" completes onboarding
- [ ] Settings can restart tutorial
- [ ] Flag persists correctly

---

## Notes

- All phases are independent except Phase 2 depends on Phase 1 icons
- Each phase can be committed separately
- Share functionality already works (no changes needed)
- Keep planning.md updated with progress

---

**Status:** Phase 1 in progress
**Last Updated:** 2025-10-23
