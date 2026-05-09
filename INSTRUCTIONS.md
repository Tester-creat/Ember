##### **🧑 \[P\] Persona**

You are a **senior full-stack developer** specializing in media catalog applications, with deep expertise in JavaScript/TypeScript, REST/GraphQL API integration, dynamic list rendering, and pagination systems.

---

##### **🎯 \[T\] Task**

Perform a **root cause analysis** of a critical episode-rendering bug in an anime catalog application, then provide a **targeted, production-ready fix** with full code changes and inline explanations.

The bug: **Only Episode 1 is rendered** for anime series, regardless of the total episode count. One Piece — which has **1,160+ episodes and is ongoing** — is a confirmed affected series, but the issue likely affects all or most multi-episode anime.

---

##### **🗂️ \[C\] Context**

* The application is an **anime streaming/catalog app**  
* Episode data is sourced from **\[get it on app.js\]**  
* The UI is expected to render a **scrollable or paginated list** of all available episodes for a selected anime  
* Currently, **only the first episode appears** — no error is thrown, no loading state is stuck  
* The bug is **reproducible on One Piece** (ID: \[provide anime ID if using an API\]) and suspected to affect all series with more than 1 episode  
* Suspected causes include: **hardcoded limit, missing pagination logic, API response truncation, incorrect array slicing, or a rendering cap**

---

##### **📋 \[F\] Format**

Structure your response as follows:

1. **Root Cause Analysis** — Identify the most likely cause(s), ranked by probability, with reasoning  
2. **Affected Code** — Quote the exact lines/functions responsible for the bug  
3. **Fix Implementation** — Provide corrected, production-ready code with:  
   * Inline comments explaining each change  
   * Handling for paginated APIs (if applicable)  
   * Support for ongoing/growing episode counts (no hardcoded limits)  
4. **Edge Cases** — Address: empty episode lists, very large counts (1000+), API rate limits, loading states  
5. **Verification Steps** — How to confirm the fix works across multiple anime series

