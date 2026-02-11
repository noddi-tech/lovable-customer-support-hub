

# Use Flow Builder for Pre-Verification Phase

## Problem
The flow builder's Data Collection node (with phone field) has no effect on the actual chat behavior. The entire pre-verification flow is hardcoded in the edge function's system prompt. The flow config is only applied AFTER the user is already verified, making the Data Collection node useless for triggering phone verification.

## Solution
Split the flow into two phases -- **pre-verification** and **post-verification** -- and use the flow config for BOTH. The edge function will traverse the flow tree to find data_collection nodes with phone fields and use them to build the pre-verification prompt, including the `[PHONE_VERIFY]` marker instruction.

### How it works

1. **Scan the flow tree** for the pre-verification phase: walk the nodes sequentially until hitting a data_collection node with a phone field. These nodes (greeting, phone collection) form the "pre-verification flow."

2. **Build pre-verification prompt from flow config**: Instead of the hardcoded "tell them to verify" message, generate instructions from the actual flow nodes (e.g., "First greet the customer with: [greeting instruction]. Then trigger phone verification by including [PHONE_VERIFY].")

3. **Post-verification uses remaining flow**: After verification, the flow continues from where phone verification left off (the nodes after the data_collection node).

### Changes to `buildSystemPrompt`

When `isVerified` is **false** and a flow config exists:
- Call a new `buildPreVerificationFlowPrompt(flowConfig)` that extracts the greeting/intro nodes and the phone verification node
- Generate natural instructions like: "Follow this flow: 1) Greet the customer. 2) When they need account access, include [PHONE_VERIFY] to trigger verification."
- Fall back to the existing hardcoded prompt if no flow config or no phone data_collection node exists

When `isVerified` is **true**: no changes -- continues using `buildFlowPrompt` as before.

### New helper: `buildPreVerificationFlowPrompt(flowConfig)`

Walks the flow tree top-down through `children` arrays, collecting nodes until it hits a `data_collection` node with a phone field. Generates prompt instructions for each node:
- `message` nodes: include their instruction text
- `action_menu` nodes: wrap choices in `[ACTION_MENU]` markers
- `data_collection` with phone: emit `[PHONE_VERIFY]` instruction
- `decision` nodes: include branching logic

This way the admin's configured greeting and conversation opener are used even before verification.

## Technical Details

### File: `supabase/functions/widget-ai-chat/index.ts`

**New function: `buildPreVerificationFlowPrompt(flowConfig: FlowConfig): string`**
- Traverses the flow tree nodes
- For each node, generates prompt text similar to `buildNodePrompt` but tailored for the unverified context
- When encountering a data_collection node with phone field type, adds the `[PHONE_VERIFY]` marker instruction
- Returns the assembled prompt string

**Modified: `buildSystemPrompt`**
- In the `else` (not verified) branch: check if `flowConfig` has nodes
- If yes, call `buildPreVerificationFlowPrompt(flowConfig)` and use it as the verification context
- If no flow config, fall back to the existing hardcoded message

### Example generated pre-verification prompt

From a flow with: Greeting -> Data Collection (phone) -> Decision (existing customer?) -> Action Menu

```
VERIFICATION STATUS: The customer has NOT verified their phone.

Follow this conversation flow:
1. Greet the customer: "Ask for phone number to verify customer and proceed with booking"
2. To verify the customer's identity, include [PHONE_VERIFY] in your response. The widget will show a phone number input and SMS OTP form.
3. You can answer general questions using search_knowledge_base while waiting for verification.
4. Do NOT look up customer data or share account details without verification.
```

## File Changes

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | Add `buildPreVerificationFlowPrompt` helper. Update unverified branch in `buildSystemPrompt` to use flow config when available. |

