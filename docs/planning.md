

## **1. Core Goal**

Let users quickly and enjoyably find and explore all public fountains in Berlin — whether for drinking water, sightseeing, or photography.

---

## **2. Target Users**

* **Locals** → Runners, cyclists, dog owners, families who need drinking water.
* **Tourists** → Exploring Berlin’s landmarks & attractions.
* **Photographers / history buffs** → Interested in fountain design, history, or art.

---

## **3. Key Features (UX Flow)**

1. **Instant Location-based Map View**

   * **Default screen:** Full-screen map centered on current location.
   * Pins show fountains nearby with visual differentiation (drinking water vs. decorative).
   * Auto-loads data when moving map.

2. **Fountain Detail View**

   * Photo(s) of the fountain.
   * Name, type (drinking / decorative), year built, architect/artist (if known).
   * Distance & walking/biking time from current location.
   * Accessibility info (wheelchair access, operational season, water quality).

3. **Search & Filter**

   * Search by name, street, or area.
   * Filters:

     * Drinking water only
     * Decorative/historic only
     * Operational now (seasonal fountains)

4. **Favorites / Collections**

   * Save fountains to a personal list.
   * Optional: Share a link or map of favorite fountains with friends.

5. **Offline Mode**

   * Basic map & fountain list for when data connection is weak.

6. **"Near Me" Quick List**

   * Shows nearest 5 fountains in a swipeable card view without opening the map.

---

## **4. Design Direction**

### **Overall Style**

* **Clean, minimalist, modern** — because maps are already visually busy.
* Color palette:

  * Blue & turquoise for water elements.
  * Neutral grays/white for background & text.
* Rounded corners & subtle drop shadows for cards.
* Animated map markers (gentle pulsing) for better visibility.

---

### **Navigation Structure**

* **Tab bar** (bottom):

  1. **Map** 🗺 (primary view)
  2. **List** 📋 (all fountains sorted by distance or name)
  3. **Favorites** ❤️
  4. **Profile/Settings** ⚙️ (optional)

---

### **Map Screen UX**

* Floating **location button** (recenter to user).
* Floating **filter button** (opens bottom sheet with filters).
* Zoom level memory: app remembers last zoom level for user convenience.

---

### **Fountain Detail Card (Bottom Sheet)**

When tapping a marker:

* Swipe-up panel with:

  * Header image
  * Title + icon for type
  * Short description
  * “Navigate” button (opens Google/Apple Maps)
  * “Save to Favorites”
* Panel partially overlays the map so user stays oriented.

---

### **Extra Delight (Optional)**

* **Seasonal status animation:** If a fountain is active, show water animation in the pin.
* **Achievement badges:** “You’ve visited 10 fountains” — encourages exploration.
* **AR mode:** Point phone camera and see nearby fountains overlaid.

---

## **5. Data Sources**

Before design, secure accurate fountain location data:

* Berlin Open Data Portal (many cities publish fountain coordinates & metadata).
* Possibly combine with crowd-sourced verification (users can report missing fountains).

---

## **6. Launch MVP Plan**

* Phase 1: Map with fountains + detail cards + “Near me” list.
* Phase 2: Filters + Favorites.
* Phase 3: Offline mode + AR + achievements.

---

## **7. Why This UX Works**

* Immediate value: map loads instantly with fountains near you.
* Low cognitive load: filters & lists are secondary, not overwhelming.
* Emotional appeal: photos, history, and playful badges make it memorable.
* Scalability: can expand to other cities or water-related features.

