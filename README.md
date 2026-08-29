# Production Directives & Google Cloud Run Deployment Guide

This application implements the enterprise **Production Directives** for Agentic Threat Modeling, OWASP Web & LLM Security Standards, Zero-Trust Firestore Security, Zero-Hardcoding Secret Management, Resilient Gemini AI Fallback, and Google Cloud Run Challenge Deployment.

---

## 1. Environment & Prerequisites

Ensure the Google Cloud CLI (`gcloud`) and Firebase CLI are installed and authenticated.

```bash
# 1. Authenticate with Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Enable Required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com \
  cloudbuild.googleapis.com
```

---

## 2. Secret Management Setup (Zero-Hardcoding Hygiene)

Operational credentials and API keys (e.g. `GEMINI_API_KEY`) are stored in Google Cloud Secret Manager and accessed at runtime:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Python Dynamic Secret Access Integration:
```python
from google.cloud import secretmanager

def access_secret(secret_id: str, version_id: str = "latest") -> str:
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/your-project-id/secrets/{secret_id}/versions/{version_id}"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")
```

Node.js / TypeScript Dynamic Secret Access:
```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

export async function accessSecret(secretName: string): Promise<string> {
  const [version] = await client.accessSecretVersion({
    name: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/${secretName}/versions/latest`,
  });
  return version.payload?.data?.toString() || '';
}
```

---

## 3. Database Security Configuration (Cloud Firestore)

Deploy the zero-trust, owner-bound Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Default Deny Catch-All
    match /{document=**} {
      allow read, write: if false;
    }

    // Owner-bound user interactions isolation
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId}/threat_models/{modelId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy rules using Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Google Cloud Run Deployment Flow

Deploy the containerized full-stack application directly to Google Cloud Run:

```bash
gcloud run deploy secops-production-service \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars NODE_ENV=production
```

---

## 5. Mandatory Verification Labeling (Challenge Registration)

To register the deployed service for automated AI challenge verification, apply the mandatory resource label:

```bash
gcloud run services update secops-production-service \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Architecture & Security Invariants

1. **Agentic Threat Modeling**: Pre-execution structured threat matrix across 5 Threat Zones (Input Surfaces, Planning & Reasoning, Tool Execution, Memory & State, Inter-System Communication).
2. **Resilient Gemini Fallback Ladder**: Primary `gemini-3.6-flash` -> High-Availability `gemini-3.1-flash-lite` -> Dynamic Alias `gemini-flash-latest` -> Deep Reasoning `gemini-3.7-flash`.
3. **Server-Side Robustness & Payload Deserialization**: Express JSON body parsers are always configured top-level before routes with null-safe destructuring.
4. **Zero-Undefined Payload Hygiene**: Strips all `undefined` values before persistence transactions.
5. **Guaranteed Transaction Verification**: User inputs and AI generation outputs are persistently confirmed before UI settlement.
