You are a senior frontend performance engineer, animation systems architect, and streaming-platform optimization specialist working on a modern anime streaming platform inspired by Netflix, Crunchyroll, and premium cinematic media applications.

Your task is to investigate, diagnose, and optimize severe animation and rendering performance issues caused by very large anime collections and excessive simultaneous UI rendering.

The platform currently supports:

* Infinite marquee animations  
* Cinematic hero rotations  
* Dynamic library rendering  
* Multiple animated content sections  
* Large user anime collections

However, the current implementation appears to become unstable when handling large datasets.

The user currently has:

* 150+ completed anime  
* 50+ currently watching anime

The UI now experiences:

* Frozen/stuttering animations  
* Laggy infinite loops  
* Hero section instability  
* Sluggish rendering  
* Potential UI thread blocking  
* Delayed transitions  
* Inconsistent responsiveness

Do not apply temporary limitations without investigation. Properly analyze the rendering architecture and determine whether excessive simultaneous rendering is the root cause.

---

# **1\. Large Dataset Rendering Investigation**

Perform a full audit of all animated and rendered anime collections across the platform.

Specifically investigate whether:

* Too many anime cards/titles are being rendered simultaneously  
* Infinite marquee animations are processing excessive DOM elements  
* Hero sections are preloading too many entries at once  
* Repeated animation loops are causing layout thrashing  
* Excessive React/Vue/state re-renders are occurring  
* Large anime lists are overwhelming the UI thread  
* Image loading is blocking animation performance  
* Animation calculations scale poorly with large datasets

---

## **Target Areas**

Audit:

* Trending section animation  
* Completed section infinite loop  
* Hero section rotation logic  
* Watching anime hero data source  
* Library rendering system  
* Anime card rendering behavior  
* Thumbnail/image loading  
* Scroll performance  
* State subscriptions/reactivity chains

---

# **2\. Infinite Animation Performance Refactor**

The current marquee/infinite-loop systems likely do not scale well with very large libraries.

The animations should remain smooth regardless of library size.

---

## **Required Investigation**

Determine whether:

* The animation duplicates the full anime list repeatedly  
* All anime titles are rendered at once  
* Off-screen items continue rendering unnecessarily  
* Animation loops recreate DOM nodes continuously  
* The browser is recalculating layouts excessively  
* Large image assets are loaded unnecessarily

---

# **3\. Smart Rendering Limits & Virtualization**

If rendering extremely large anime collections is causing instability:

Implement intelligent rendering strategies rather than brute-force rendering everything simultaneously.

---

## **Required Optimization Strategies**

Potential solutions may include:

* Virtualized rendering  
* Windowed rendering  
* Limited active animation datasets  
* Smart batching  
* Lazy mounting  
* Incremental rendering  
* Dynamic animation pools  
* GPU-optimized transforms

---

## **Recommended Limits**

If necessary:

* Use a curated subset of titles for animated sections  
* Keep the full dataset available elsewhere  
* Prioritize quality and smoothness over raw quantity

Example:

* Trending marquee may display only the top 20–40 active titles  
* Completed animation may rotate through curated chunks  
* Hero section may preload only a small active rotation pool

However:

* The UI should still feel rich and content-dense  
* Transitions between subsets should feel seamless

---

# **4\. Hero Section Rendering Optimization**

The cinematic hero section currently loads anime from the Watching library.

With 50+ currently watching anime:

* The hero may be over-rendering  
* Preloading too many banners  
* Running excessive timers/transitions  
* Causing image memory pressure

---

## **Required Refactor**

Optimize the hero system to:

* Maintain a lightweight active rotation pool  
* Preload only nearby upcoming entries  
* Avoid loading all hero backgrounds simultaneously  
* Use intelligent image caching  
* Prevent excessive memory usage

---

## **Additional Requirements**

Ensure:

* Hero transitions remain smooth  
* Background images load progressively  
* Animations never freeze  
* Timers do not stack or duplicate  
* Old intervals are cleaned up properly

---

# **5\. Marquee Animation Scalability Improvements**

The Trending and Completed sections currently use infinite movement systems.

With large anime counts:

* Animation freezing may occur  
* CPU usage may spike  
* Browser painting costs may increase dramatically

---

## **Required Improvements**

Refactor animations to:

* Use transform-based GPU acceleration  
* Avoid expensive left/right positioning  
* Prevent continuous DOM recalculation  
* Minimize repaint/reflow costs  
* Reduce active animated nodes

---

## **Technical Requirements**

Implement:

* requestAnimationFrame-based animation where appropriate  
* CSS transform optimization  
* Will-change optimization carefully (not excessively)  
* Animation pooling  
* Memoized datasets  
* Efficient key management

Avoid:

* Re-rendering during animation frames  
* Large duplicated DOM trees  
* State updates tied to animation loops

---

# **6\. Intelligent Dataset Prioritization**

Not all anime collections need equal rendering priority.

Implement smart prioritization logic.

---

## **Recommended Priority**

### **Highest Priority**

* Currently visible content  
* Watching anime  
* Continue Watching  
* Active hero items

### **Medium Priority**

* Trending  
* Favorites  
* Queued

### **Lower Priority**

* Massive completed lists  
* Archived sections  
* Dropped content

---

## **Goals**

The platform should:

* Feel responsive instantly  
* Load progressively  
* Maintain animation smoothness  
* Avoid overwhelming the browser

---

# **7\. Global Layout & Element Distribution Audit**

Perform a complete UI distribution audit across ALL tabs.

Currently:

* Some sections appear uneven  
* Cards may stretch inconsistently  
* Spacing varies between tabs  
* Layout balance is inconsistent

This must be standardized platform-wide.

---

# **8\. Universal Layout Distribution Refactor**

Starting from:

* The Home hero section  
* All Home tab rows  
* Library sections  
* Seasonal tab  
* Stats tab  
* Watch pages  
* Search pages

Ensure:

* Even spacing  
* Balanced card proportions  
* Consistent grid behavior  
* Stable responsive scaling  
* Proper alignment across all screen sizes

---

## **Required Improvements**

Audit:

* Grid systems  
* Flex layouts  
* Gap spacing  
* Section padding  
* Container widths  
* Card heights  
* Thumbnail aspect ratios  
* Typography alignment

---

## **UX Expectations**

The entire application should feel:

* Structured  
* Symmetrical  
* Premium  
* Visually balanced  
* Consistent across tabs

No section should feel cramped, stretched, uneven, or randomly distributed.

---

# **9\. Performance Monitoring & Diagnostics**

Implement diagnostics to identify rendering bottlenecks.

Track:

* Animation FPS  
* Render frequency  
* Re-render counts  
* Large dataset rendering costs  
* Image memory usage  
* Animation frame drops  
* Layout recalculation spikes

---

## **Requirements**

Ensure:

* Bottlenecks become traceable  
* Large libraries no longer silently degrade performance  
* Future scaling issues become easier to debug

---

# **10\. Final Validation Requirements**

Before finalizing implementation:

## **Verify:**

1. Infinite animations remain smooth with large libraries  
2. Hero section no longer freezes with 50+ watching anime  
3. Completed anime animations scale efficiently  
4. Large datasets no longer block the UI thread  
5. Smart rendering limits work correctly  
6. Layout distribution is visually balanced across ALL tabs  
7. Card sizing and spacing remain consistent  
8. Scroll performance remains smooth  
9. Memory usage remains stable over long sessions  
10. No regressions are introduced elsewhere

---

# **Technical Expectations**

While implementing:

* Preserve existing Ember design language  
* Maintain cinematic streaming-platform aesthetics  
* Use scalable rendering architecture  
* Optimize for large long-term user libraries  
* Improve maintainability and modularity  
* Use TypeScript-safe/null-safe patterns where applicable  
* Ensure production-ready performance and stability

