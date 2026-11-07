# Consentify — Smart Privacy & Consent Management Platform

Consentify is a privacy-focused application designed to help users understand, monitor, and manage the permissions requested by applications installed on their Android devices.

It combines an Android application scanner with a web-based privacy dashboard to provide visibility into app permissions, privacy risks, and security activity.

## Key Features

- **Android App Scanning:** Scans installed applications and identifies their requested permissions.
- **Permission Monitoring:** Displays permission details and access statuses.
- **Privacy Risk Analysis:** Evaluates application permission risks and presents risk levels.
- **Web Dashboard:** Provides a centralized interface for viewing scanned applications and privacy insights.
- **Analytics:** Visualizes application risk distribution, permission frequency, and risk contributors.
- **Security Alerts:** Displays privacy-related alerts and security activity.
- **AI-Powered Explanations:** Provides contextual explanations of application privacy risks.
- **Authentication:** Uses Firebase Authentication for user account management.
- **Cloud Synchronization:** Stores user application data in Cloud Firestore and synchronizes updates with the web dashboard.

## Technology Stack

| Component | Technologies |
|---|---|
| Android | Kotlin, Android SDK |
| Web Frontend | React, TypeScript, Vite |
| Backend / Cloud | Firebase |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| Cloud Functions | TypeScript, Firebase Functions |
| Build Tools | Gradle, npm |

## Project Architecture

```text
Consentify/
├── android/          # Native Android application
├── src/              # React web application
│   ├── components/   # UI components
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Firebase and utility modules
│   ├── services/     # Application and data services
│   └── types/        # TypeScript definitions
├── functions/        # Firebase Cloud Functions
├── firestore.rules   # Firestore security rules
├── firebase.json     # Firebase configuration
├── package.json      # Web dependencies and scripts
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- Android Studio
- JDK compatible with the Android Gradle configuration
- A Firebase project
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Varun05102005/Consentify.git
cd Consentify
```

### 2. Configure the web application

Create a `.env.local` file in the project root using `.env.example` as a reference.

Configure the required Firebase environment variables:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Use your own Firebase project configuration. Never commit private credentials or secret keys.

### 3. Install dependencies

```bash
npm install
```

### 4. Start the web application

```bash
npm run dev
```

### 5. Configure the Android application

- Open the `android/` directory in Android Studio.
- Configure the Firebase Android application for your own Firebase project.
- Place your local `google-services.json` in `android/app/`.
- Sync Gradle and run the application on a compatible Android device.

## Security

Consentify uses Firebase Authentication and Firestore security rules to protect user-specific application data.

- User data is organized under authenticated user-specific Firestore paths.
- Firestore rules enforce ownership-based access.
- Local environment files and Firebase Android configuration are excluded from version control.
- Private credentials and service account keys should never be committed.

## Testing

The repository includes Android unit tests, web application tests, and Firebase Functions tests.

Run the available test commands from their respective project directories.

## Project Goals

Consentify aims to make application permission usage easier to understand by bringing permission visibility, privacy-risk analysis, and security insights into one platform.

## Author

**Varun Amaravadi**

Computer Science and Engineering

GitHub: [@Varun05102005](https://github.com/Varun05102005)

---

*Consentify — Understand your permissions. Take control of your privacy.*
