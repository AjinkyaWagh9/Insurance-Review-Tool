
# Side-by-Side Health Report Layout

## What Changes
The two main report sections ("Your Preferences & Needs" and "Your Policy Structure") will be placed side by side on desktop/tablet screens and stack vertically on mobile.

## Layout Approach
- Use a responsive CSS grid: `grid grid-cols-1 lg:grid-cols-2 gap-6` to wrap both sections
- On screens >= 1024px (lg breakpoint): two equal columns side by side
- On screens < 1024px (mobile/small tablet): single column, stacked vertically (current behavior preserved)
- Both section cards will use `h-fit` so they size to their own content independently

## Technical Details

### File: `src/components/forms/HealthReportStep.tsx`

1. Wrap the `UserPreferencesSection` and `PolicyStructureSection` (lines ~264-291) in a grid container:
   ```tsx
   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
     <UserPreferencesSection ... />
     {extractedPolicy && !extractionFailed ? (
       <PolicyStructureSection policy={extractedPolicy} />
     ) : extractionFailed ? (
       <ExtractionFailedCard />
     ) : null}
   </div>
   ```

2. Remove the `max-w-lg` constraint from the report page container in `src/pages/ReviewForm.tsx` **only when on the report step** so the two columns have room to breathe. Change the container to `max-w-4xl` for the report step while keeping `max-w-lg` for all other steps.

### File: `src/pages/ReviewForm.tsx`
- Make the container class dynamic based on the current step:
  ```tsx
  const isReportStep = isHealthFlow && step === 4;
  // container: max-w-4xl when report, max-w-lg otherwise
  ```

### Mobile Handling
No extra work needed -- `grid-cols-1` is the default, so on mobile the cards stack exactly as they do today. The `lg:grid-cols-2` only kicks in at >= 1024px.
