You are a senior frontend engineer, streaming-platform UI architect, and performance-focused UX specialist working on a modern anime streaming platform inspired by Netflix, Crunchyroll, and cinematic media applications.

Your task is to redesign, optimize, and stabilize the Home tab experience to feel premium, cinematic, responsive, and highly polished. Focus on immersive presentation, smooth animations, intelligent content organization, scalable architecture, and consistent data rendering across the platform.

Do not apply superficial visual patches. Properly refactor the affected systems and ensure production-ready behavior.

---

# **1\. Cinematic Netflix-Style Hero Section Redesign**

The current Home tab hero section only displays:

* The Ember site name  
* A short text description

This feels visually empty, static, and outdated.

The Home tab should instead feature a fully cinematic rotating anime hero system similar to Netflix or modern streaming applications.

---

## **Required Hero Behavior**

The hero section should:

* Display anime dynamically from the library  
* Prioritize anime currently being watched  
* Include:  
  * Large cinematic background/banner  
  * Anime title  
  * Metadata/details  
  * Short overview/description  
  * Continue/Resume Watching button  
  * Smooth transitions/animations  
  * Overlay gradients for readability

### **Rotation Logic**

* Each anime should display for a timed interval before transitioning  
* Transitions should feel cinematic and smooth  
* Use fade/slide/parallax transitions where appropriate  
* Avoid abrupt content swaps

### **Fallback Logic**

If there are no currently watched anime:

* Automatically load recently released anime  
* Continue rotating using the same cinematic interval system

### **UX Expectations**

The hero section should feel:

* Dynamic  
* Alive  
* Premium  
* Cinematic  
* Netflix-quality

---

# **2\. Trending Section Continuous Marquee Animation**

The Home tab contains a Trending section.

Currently, the section feels static.

---

## **Required Behavior**

Anime titles/cards in the Trending section should:

* Continuously move from right to left  
* Move infinitely in a seamless loop  
* Maintain smooth uninterrupted motion  
* Avoid timer-based jumps/resets  
* Feel fluid and GPU-optimized

### **Technical Expectations**

* Use performant animation techniques  
* Avoid layout thrashing  
* Ensure stable FPS during movement  
* Prevent flickering or spacing inconsistencies  
* Ensure responsiveness across screen sizes

### **UX Goal**

The movement should resemble:

* Live streaming-platform discovery rows  
* Ambient motion systems used in premium streaming UIs

---

# **3\. Completed Section Infinite Reverse Movement**

The Completed section should display anime from the user's completed library.

Currently:

* Ordering is inconsistent  
* Entries may appear randomly  
* Only partial data may display

---

## **Required Behavior**

The Completed section should:

* Display ALL completed anime entries  
* Continuously move infinitely from left to right  
* Move opposite to the Trending section direction

### **Chronological/Series Ordering Requirements**

Anime within a franchise must be grouped and ordered correctly.

Example:

My Hero Academia Season 1  
→ Season 2  
→ Season 3  
→ Movie 1  
→ OVA  
→ ONA  
→ Season 4

### **Sorting Logic**

Sort by:

1. Franchise grouping  
2. Canonical season order  
3. Release chronology  
4. Movie/OVA/ONA relationships

### **Additional Requirements**

* Prevent random ordering  
* Maintain stable deterministic sorting  
* Gracefully handle incomplete metadata  
* Avoid duplicated entries  
* Ensure smooth infinite scrolling performance

---

# **4\. Global Anime Data Fetching & Rendering Audit**

There are inconsistencies across tabs where anime data is sometimes missing or incorrectly rendered.

Examples:

* Missing thumbnails in certain tabs  
* Missing anime details  
* Inconsistent metadata rendering  
* Incorrect fallback behavior  
* Uneven data retrieval logic between tabs

---

## **Investigation Requirements**

Perform a complete audit of:

* Anime fetch logic  
* Data normalization  
* Thumbnail retrieval  
* Image fallback handling  
* Metadata mapping  
* Rendering conditions  
* Async loading states  
* Cache behavior  
* Shared component logic

### **Required Fixes**

Ensure:

* Anime thumbnails appear consistently across ALL tabs  
* Metadata renders reliably everywhere  
* Missing/null API data never breaks layouts  
* Shared anime card components behave consistently  
* Fallback images/states exist where needed  
* Data retrieval logic is centralized and reusable

### **Stability Goals**

The platform should:

* Never display broken cards  
* Never render missing-image gaps  
* Never inconsistently display anime information

---

# **5\. Hero Section Scope Restriction**

The cinematic hero section must ONLY appear:

* On the Home tab

It must NOT appear:

* During anime playback  
* Inside watch pages  
* On other tabs/pages  
* In modal/player states

---

## **Requirements**

Audit the rendering logic and ensure:

* Proper route-based conditional rendering  
* No accidental mounting on unrelated pages  
* No background memory leaks from inactive hero animations  
* Hero intervals/timers are properly cleaned up  
* Animations stop when leaving the Home tab

---

# **Technical & Architectural Expectations**

While implementing all improvements:

## **UI/UX Standards**

* Preserve the existing Ember design language  
* Maintain a premium streaming-platform aesthetic  
* Ensure responsive behavior across all screen sizes  
* Keep spacing, typography, and proportions visually balanced

## **Performance Requirements**

* Use GPU-friendly animations  
* Avoid unnecessary re-renders  
* Optimize large animated lists  
* Use virtualization/lazy rendering where appropriate  
* Prevent animation jank and layout shifts  
* Optimize image loading and caching

## **Code Quality Requirements**

* Refactor duplicated logic  
* Improve maintainability and scalability  
* Use reusable animation systems/components  
* Ensure TypeScript/null safety where applicable  
* Add safe guards for undefined API responses  
* Keep architecture modular and production-ready

---

# **Final Validation Checklist**

Before finalizing implementation:

1. Verify all hero transitions are smooth  
2. Ensure Home tab animations remain performant  
3. Confirm all anime thumbnails render correctly  
4. Validate chronological ordering logic  
5. Test edge cases with incomplete metadata  
6. Verify infinite scrolling loops never break  
7. Ensure no memory leaks from animations/timers  
8. Confirm hero section only appears on Home tab  
9. Test responsiveness across desktop/tablet/mobile  
10. Ensure no regressions were introduced anywhere else

