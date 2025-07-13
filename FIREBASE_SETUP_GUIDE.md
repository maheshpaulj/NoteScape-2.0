# Firebase Setup Guide

## Issue Resolution: "Failed to parse private key: Error: Invalid PEM formatted message"

This error occurs when the Firebase service account key is not properly configured. Here's how to fix it:

## Steps to Fix:

### 1. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Click on **Service Accounts** tab
5. Click **Generate new private key**
6. Download the JSON file

### 2. Format the Service Key for Environment Variable

The downloaded JSON file needs to be converted to a single-line string for the environment variable.

**Example of the JSON file structure:**
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xyz@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xyz%40your-project.iam.gserviceaccount.com"
}
```

### 3. Add to .env.local

Create or update your `.env.local` file:

```bash
# Convert the entire JSON to a single line string
FIREBASE_SERVICE_KEY={"type":"service_account","project_id":"your-project-id","private_key_id":"key-id","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\\n","client_email":"firebase-adminsdk-xyz@your-project.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xyz%40your-project.iam.gserviceaccount.com"}
```

**Important:** 
- Remove all line breaks and spaces from the JSON
- Escape newlines in the private_key field (replace `\n` with `\\n`)
- Make sure the entire JSON is on one line

### 4. Alternative: Use Environment Variables for Each Field

If you prefer not to use a single JSON string, you can modify the firebase-admin.ts to use individual environment variables:

```typescript
const serviceKey = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL?.replace('@', '%40')}`
};
```

## Testing the Fix

After updating your `.env.local` file:

1. Restart your development server
2. Try building the project: `npm run build`
3. The Firebase error should be resolved

## Notes

- The updated `firebase-admin.ts` now includes error handling and will gracefully handle missing or invalid service keys
- For development, you can continue without the service key if you're not using Firebase admin features
- Make sure your `.env.local` file is in your `.gitignore` to keep your credentials secure
