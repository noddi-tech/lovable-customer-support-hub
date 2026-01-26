
## Plan: Support Google Authentication for Password-Based Accounts

### Problem Summary
Users like Anders who initially signed up with email/password want to use Google OAuth to log in. Currently, there's no explicit way for logged-in users to link their Google account to their existing password-based account.

### Solution Overview
Implement two complementary features:
1. **Verify Supabase Configuration** - Ensure "One email per user" is enabled for automatic identity linking
2. **Add Explicit Linking UI** - Add a "Link Google Account" button in User Profile Settings using Supabase's `linkIdentity` method

### Technical Implementation

#### File: `src/components/settings/UserProfileSettings.tsx`

**Changes:**

1. **Add new state and imports:**
```typescript
import { Chrome } from 'lucide-react'; // Add Google icon
const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
```

2. **Add function to check linked identities:**
```typescript
// Check if Google is already linked
const googleIdentity = user?.identities?.find(
  (identity) => identity.provider === 'google'
);
const hasGoogleLinked = !!googleIdentity;
```

3. **Add `handleLinkGoogle` function:**
```typescript
const handleLinkGoogle = async () => {
  setIsLinkingGoogle(true);
  try {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/settings`,
      }
    });

    if (error) {
      // Handle specific errors
      if (error.message.includes('already linked')) {
        toast.error('This Google account is already linked to another user');
      } else {
        toast.error(error.message || 'Failed to link Google account');
      }
      return;
    }

    // User will be redirected to Google for OAuth
    // On return, the identity will be linked
  } catch (error) {
    console.error('Link Google error:', error);
    toast.error('Failed to link Google account');
  } finally {
    setIsLinkingGoogle(false);
  }
};
```

4. **Add Google linking UI in Security card (after password section):**
```tsx
{/* Google Account Linking */}
<div className="flex items-center justify-between p-4 rounded-lg border">
  <div className="flex items-center gap-3">
    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    </div>
    <div>
      <p className="font-medium">
        {t('settings.profile.googleAccount', 'Google Account')}
      </p>
      <p className="text-sm text-muted-foreground">
        {hasGoogleLinked 
          ? t('settings.profile.googleLinked', 'Connected - you can sign in with Google')
          : t('settings.profile.googleNotLinked', 'Link your Google account for faster sign-in')}
      </p>
    </div>
  </div>
  {hasGoogleLinked ? (
    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
      <Check className="h-3 w-3 mr-1" />
      {t('settings.profile.connected', 'Connected')}
    </Badge>
  ) : (
    <Button 
      variant="outline" 
      onClick={handleLinkGoogle}
      disabled={isLinkingGoogle}
    >
      {isLinkingGoogle ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Linking...
        </>
      ) : (
        t('settings.profile.linkGoogle', 'Link Google')
      )}
    </Button>
  )}
</div>
```

5. **Add Check icon to imports:**
```typescript
import { Loader2, Upload, Trash2, Lock, Building2, Users, Calendar, Shield, Check } from 'lucide-react';
```

### Supabase Dashboard Configuration Required

Before this works, verify these settings in Supabase Dashboard:

1. **Authentication → Providers → Google**: Must be enabled with valid OAuth credentials
2. **Authentication → Settings → "One email per user"**: Should be enabled to allow automatic identity linking when emails match

### User Experience Flow

**For users already logged in (Anders's case):**
1. Go to Settings → Profile
2. Scroll to Security section
3. Click "Link Google" button
4. Authorize with Google
5. Redirected back to Settings with Google now linked
6. Can now log in with either password or Google

**For users at login page:**
1. Click "Continue with Google"
2. If email matches existing account, identities are automatically linked
3. Logged in with same profile, roles, and organization

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/settings/UserProfileSettings.tsx` | Add Google linking UI in Security section, add state and handler function |

### Result After Implementation

- Users can link Google to existing password accounts from Settings
- Badge shows "Connected" status when Google is already linked
- Works alongside the existing login-page Google button
- Same user ID, profile, roles, and organization preserved
