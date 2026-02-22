# Quick Testing Checklist - Big-Dawg Optimization

## Pre-Testing Setup
- [ ] Backend running: `uvicorn api:app --reload --port 8000`
- [ ] Frontend running: `npm run dev`
- [ ] Open DevTools Network tab for monitoring
- [ ] Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)

---

## Test 1: Direct Navigation (No Intermediate Screen)

**Steps:**
1. [ ] Go to Markets page
2. [ ] Click any market card
3. [ ] **Verify:** Page transitions directly to Analysis (no modal popup)
4. [ ] **Expected:** Smooth animation, loading state shows engines running

**Success Criteria:**
- ✅ No modal appears
- ✅ Analysis page loads
- ✅ Loading message visible: "Running intelligence engines..."

---

## Test 2: Search Speed & Debouncing

**Steps:**
1. [ ] Click in Search field
2. [ ] Type slowly: "B..." → "Bi..." → "Bit..." → "Bitc..." → "Bitcoi..." → "Bitcoin"
3. [ ] Watch Network tab
4. [ ] **Verify:** Only 1-2 API calls (not 6-10)
5. [ ] Type full phrase fast: "Ethereum"
6. [ ] Wait 300ms, then clear and type: "Crypto"
7. [ ] **Verify:** Network shows single request after typing stops

**Success Criteria:**
- ✅ Results load in <1 second
- ✅ Max 2 API calls for above test
- ✅ Typing is smooth (no freezing)
- ✅ Results count visible and accurate

**Network Tab Expectations:**
```
GET /api/markets?query=bitcoin → 200 OK (top 50 results)
Response size: ~15-30KB (was ~500KB)
```

---

## Test 3: Analysis Performance (First Time)

**Steps:**
1. [ ] Check timer before clicking market
2. [ ] Click on Bitcoin market (first time in session)
3. [ ] Watch Network tab for /api/analyze request
4. [ ] **Verify:** Response time: 2-4 seconds
5. [ ] Page loads with all sections:
   - [ ] Trust ring (green/yellow/red)
   - [ ] Three tiles (Health, Who's Trading, Signal)
   - [ ] Wallet Intel section
   - [ ] Price chart
   - [ ] Chat box

**Success Criteria:**
- ✅ Analysis completes in <4 seconds
- ✅ All tiles show correct values
- ✅ Charts render properly
- ✅ Wallet intel displays

**Network Expectations:**
```
POST /api/analyze → 200 OK
Payload: {"target": "bitcoin-..."}
Response time: 2-4s
Data size: ~500KB (was ~1MB)
```

---

## Test 4: Analysis Performance (Cached)

**Steps:**
1. [ ] After Test 3, go back to Markets
2. [ ] Click the SAME market again (Bitcoin)
3. [ ] Check timer
4. [ ] **Verify:** Analysis loads in <200ms
5. [ ] Navigate around: Markets → same market again
6. [ ] **Verify:** Still cached (<200ms)
7. [ ] Wait 5+ minutes, click market again
8. [ ] **Verify:** Takes 2-4s again (cache expired)

**Success Criteria:**
- ✅ Cached: <200ms
- ✅ Behavior consistent across navigation
- ✅ Cache expires properly after 5 minutes

**Indication of Caching:**
- Network tab shows no /api/analyze request (cached locally)
- OR response returns almost instantly

---

## Test 5: Correct Value Propagation

**Steps:**
1. [ ] Analyze a market with active trading
2. [ ] Check displayed values:
   - [ ] **Trust Score:** Between 0-100, matches color:
     - Green (trust): >70
     - Yellow (caution): 50-70
     - Red (risk): <50
   - [ ] **Probability:** YES/NO percentages add to 100%
   - [ ] **Integrity:** Score 0-100, status matches score
   - [ ] **Information:** Percentages add to ~100%
   - [ ] **Confidence:** Data quality and conviction logical
3. [ ] Compare multiple markets
4. [ ] **Verify:** Values are consistent and make sense

**Validation Rules:**
- ✅ Trust score colors match value ranges
- ✅ All percentages sum properly
- ✅ Status messages align with scores
- ✅ Wallet intel reflects actual trader positions

---

## Test 6: Search Result Accuracy

**Steps:**
1. [ ] Search: "Bitcoin"
   - [ ] **Verify:** Top results are Bitcoin-related
2. [ ] Search: "Trump"
   - [ ] **Verify:** Trump-related markets appear
3. [ ] Search: "Temperature"
   - [ ] **Verify:** Temperature/Weather markets appear
4. [ ] Search: "🔮"
   - [ ] **Verify:** Handles special characters gracefully
5. [ ] Search: "" (empty)
   - [ ] **Verify:** Shows top volume markets

**Success Criteria:**
- ✅ Search results are relevant
- ✅ Results sorted by volume (highest first)
- ✅ Top 50 results shown
- ✅ No crashes on special characters

---

## Test 7: Error Handling

**Steps:**
1. [ ] Disconnect network (DevTools → Offline)
2. [ ] Try to load Markets
3. [ ] **Verify:** Error message appears
4. [ ] Go online again, try again
5. [ ] **Verify:** Works normally

**Steps 2:**
1. [ ] Search for non-existent market: "xyz-abc-123-invalid"
2. [ ] **Verify:** "No results found" or empty list
3. [ ] Click back to Markets
4. [ ] **Verify:** Still functional

**Success Criteria:**
- ✅ Graceful error handling
- ✅ User can retry
- ✅ No app crashes
- ✅ Error messages are helpful

---

## Test 8: UI/UX Polish

**Steps:**
1. [ ] Watch loading states:
   - [ ] "Loading markets from Polymarket…"
   - [ ] "Running logic engine (integrity, information, confidence)…"
2. [ ] Check animations:
   - [ ] Page transitions smooth
   - [ ] Trust ring animates on load
   - [ ] Wallet dots animate smoothly
3. [ ] Verify responsive design:
   - [ ] Desktop (1920px): All content visible
   - [ ] Tablet (768px): Scrollable, readable
   - [ ] Mobile (375px): Functional (if supported)

**Success Criteria:**
- ✅ Loading states clear and informative
- ✅ Animations smooth (no jank)
- ✅ Responsive and accessible
- ✅ All text readable

---

## Performance Benchmarks

### Expected Results

| Scenario | Time | Status |
|----------|------|--------|
| Load Markets page | <2s | ✅ |
| Search markets (slow type) | <1s | ✅ |
| Search markets (fast type) | <1s | ✅ |
| Analysis (first) | 2-4s | ✅ |
| Analysis (cached) | <200ms | ✅ |
| Navigate Markets → Analysis | <300ms | ✅ |
| Go back to Markets | <300ms | ✅ |

---

## Bug Report Template

If you find issues:

```
**Issue:** [Clear description]

**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Environment:**
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- Network: [Latency/Speed]

**Screenshots/Video:**
[If possible]

**Network Tab Shows:**
[Paste relevant API calls]
```

---

## Performance Monitoring

### Chrome DevTools Checklist
- [ ] Open DevTools (F12)
- [ ] Go to Performance tab
- [ ] Click Record
- [ ] Perform action (search, click market)
- [ ] Stop recording
- [ ] Check:
  - [ ] Main thread doesn't spike >1000ms
  - [ ] No red warnings
  - [ ] FCP (First Contentful Paint) <2s

### Network Checklist
- [ ] Open Network tab
- [ ] Check response sizes (should be <100KB per request)
- [ ] No failed requests (red)
- [ ] No duplicate requests (debounce working)
- [ ] Waterfall shows efficient parallelization

---

## Success Criteria Summary

- ✅ No intermediate modal screen
- ✅ Direct navigation to analysis
- ✅ Search completes in <1 second
- ✅ Analysis (first) in 2-4 seconds
- ✅ Analysis (cached) in <200ms
- ✅ All values display correctly
- ✅ Error handling works
- ✅ UI/UX smooth and responsive

---

**Status:** Ready for Testing  
**Tested By:** [Your Name]  
**Date:** [Date]  
**Result:** ⬜ Pass / ⬜ Fail with Notes
