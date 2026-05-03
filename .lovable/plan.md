# Flytt "Tilordne skjemafelt" inn i en Sheet

## Problem
Inline-utvidelsen av FormMappingEditor under hver mapping-rad gjør at UI-en føles knust: dropdowns (mål/felt-velgere, "Bruk mal"), preview-dialog og Radix-overlays kolliderer i den smale kortbredden, layouten hopper, og horisontal/innebygd nesting gjør det vanskelig å bruke. En Sheet gir full bredde og isolert overlay-kontekst.

## Endringer

### `MetaLeadAdsCard.tsx` — `FormMappingsInline`
1. Fjern `expandedId` state og inline `<FormMappingEditor>`-renderen under hver rad.
2. Legg til ny state `editingMapping: { id: string; formName: string | null } | null`.
3. Erstatt "Tilordne skjemafelt / Skjul felt-tilordninger" knappen med én knapp **"Tilordne skjemafelt"** (ChevronRight ikon) som setter `editingMapping`.
4. Mount én `<Sheet>` på toppnivå i komponenten (sibling til mapping-listen, IKKE inni `.map()`):
   - `open={!!editingMapping}` / `onOpenChange={(o) => !o && setEditingMapping(null)}`
   - `<SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">`
   - Header: `SheetTitle` = "Tilordne skjemafelt", `SheetDescription` = form name eller form ID
   - Body: `<FormMappingEditor formMappingId={editingMapping.id} formName={editingMapping.formName} onReconnectClick={onReconnectClick} />`
5. Bredere sheet (`sm:max-w-3xl`) gir plass til de to-kolonne mål/felt velgerne uten trunkering.

### Ingen endringer nødvendig i:
- `FormMappingEditor.tsx` — fungerer som ren child. Den eksisterende Radix-fixen (modal={false} på "Bruk mal" dropdown, hoisted preview dialog) er fortsatt riktig og spiller fint med Sheet-konteksten.
- Hooks, edge functions, types.

## Tekniske detaljer
- `Sheet` bruker `Radix Dialog` under panseret. Siden FormMappingEditor allerede har `modal={false}` på sin "Bruk mal" dropdown og hoisted preview dialog, vil ikke nestede pointer-events kollidere.
- Kun ÉN sheet mountes (på parent-nivå), ikke én per rad — unngår N stk Radix portaler.
- TypeScript clean: ingen nye typer.

## Filer endret
- `src/components/dashboard/recruitment/admin/integrations/cards/MetaLeadAdsCard.tsx`
