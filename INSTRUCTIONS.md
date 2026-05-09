You are a senior frontend engineer and UI/UX optimization specialist working on a high-performance anime streaming platform inspired by Netflix and modern streaming interfaces.

Your task is to investigate, refactor, and optimize the following issues across the application. Focus on clean architecture, responsive UI consistency, smooth UX transitions, and performance optimization. Do not apply quick patches — properly diagnose root causes and implement scalable fixes.

## **1\. Stats Tab Layout & Distribution Issues**

In the Stats tab, specifically the section titled:

"A deep dive into your watching history and habits"

there are multiple UI inconsistencies:

* Elements are misaligned  
* Some cards/components are disproportionately sized  
* Spacing and layout distribution feel uneven  
* The grid responsiveness breaks visual balance

### **Requirements**

* Evenly distribute all cards/elements  
* Ensure consistent sizing, spacing, and alignment  
* Maintain responsiveness across desktop/tablet/mobile  
* Use adaptive grid/flex layouts where appropriate  
* Prevent overflow, stretching, or collapsed cards  
* Ensure typography, charts, and stat blocks visually align

Additionally:

* Audit ALL other tabs/pages/components for similar layout inconsistencies  
* Standardize spacing, padding, margins, and card proportions across the platform  
* Ensure a cohesive streaming-platform-quality UI throughout

### **Expected Improvements**

* Symmetrical layouts  
* Consistent card heights  
* Balanced spacing  
* Proper responsive behavior  
* Cleaner visual hierarchy  
* Professional dashboard appearance

---

## **2\. Watch Order Section Sorting Logic**

During anime watching, the "Watch Order" section currently does not reliably arrange entries in chronological/release order.

### **Requirements**

If anime titles are present:

* Automatically sort entries by:  
  1. Canonical release date  
  2. Season order  
  3. Movie/special chronology where applicable  
* Ensure sequels/prequels appear correctly  
* Prevent random or API-return-order rendering  
* Add stable sorting behavior  
* Gracefully handle missing metadata

### **Expected Behavior**

Examples:

* Season 1 → Season 2 → Movie → OVA → Season 3  
* Earlier release years should appear first  
* Specials/OVAs should not interrupt main chronology unless intended

---

## **3\. Seasonal Tab Runtime Error**

The Seasonal tab was previously fixed but is now broken again.

### **Current Error**

Cannot read properties of undefined (reading 'Page')

### **Investigation Requirements**

* Identify the exact source of the undefined object  
* Trace where `.Page` is being accessed  
* Check:  
  * API response structure changes  
  * Optional chaining issues  
  * Null/undefined state handling  
  * Async race conditions  
  * Incorrect destructuring  
  * Pagination/state initialization problems

### **Requirements**

* Properly guard all nested property access  
* Add safe fallbacks/loading states  
* Ensure the seasonal tab never crashes even if API data is incomplete  
* Refactor fragile logic if necessary  
* Improve overall resilience of the tab

### **Deliverables**

* Root cause explanation  
* Refactored stable implementation  
* Error-proof rendering flow

---

## **4\. Anime Playback Startup Performance Issue**

There is a major UX/performance issue when selecting an anime to watch.

### **Current Problem**

After clicking an anime card:

* The app feels unresponsive  
* Playback takes too long to begin  
* Users may think the click failed  
* The site feels sluggish or broken

### **Investigation Requirements**

Perform a full performance audit of the watch/startup flow:

* Route transition delays  
* API fetch bottlenecks  
* Video/player initialization delays  
* Large component re-renders  
* Excessive state updates  
* Blocking async operations  
* Image/video preloading inefficiencies  
* Lazy loading behavior  
* Suspense/loading boundaries  
* Network waterfall issues  
* Client-side hydration/render bottlenecks

### **Optimization Goals**

* Immediate visual feedback after click  
* Faster perceived responsiveness  
* Smooth transitions into playback  
* Reduced loading latency  
* Eliminate UI freezing/stalling

### **Required UX Improvements**

Implement modern streaming-platform behavior such as:

* Instant loading overlay/skeleton state  
* Optimistic UI transitions  
* Prefetching anime/player data on hover  
* Route preloading  
* Smarter caching  
* Deferred non-critical rendering  
* Video/player lazy initialization  
* Progressive loading strategies

### **Expected Outcome**

The platform should feel:

* Fast  
* Responsive  
* Premium  
* Smooth like Netflix/Crunchyroll-style interfaces

---

## **Technical Expectations**

While implementing fixes:

* Preserve existing design language  
* Avoid breaking current features  
* Refactor duplicated layout logic where necessary  
* Improve maintainability and scalability  
* Use performant rendering patterns  
* Keep animations smooth and GPU-friendly  
* Minimize unnecessary re-renders  
* Ensure TypeScript safety/null safety if applicable  
* Add comments where logic is complex

Before finalizing:

1. Audit related components for similar hidden issues  
2. Test responsiveness across screen sizes  
3. Test edge cases and undefined API states  
4. Verify no regressions were introduced  
5. Ensure all fixes are production-ready

