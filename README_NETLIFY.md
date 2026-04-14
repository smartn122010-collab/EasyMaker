# Easy Maker Food Delivery - Netlify Deployment Guide

This project is optimized for deployment on [Netlify](https://www.netlify.com/).

## 🚀 Deployment Steps

1.  **Connect to GitHub/GitLab**: Push your code to a repository.
2.  **Create a New Site**: Select your repository in the Netlify dashboard.
3.  **Build Settings**:
    *   **Build Command**: `npm run build`
    *   **Publish Directory**: `dist`
4.  **Environment Variables**:
    You **MUST** add your Firebase configuration as environment variables in the Netlify dashboard (**Site settings > Build & deploy > Environment > Environment variables**).

    Add the following variables (copy values from your `firebase-applet-config.json`):
    *   `VITE_FIREBASE_API_KEY`
    *   `VITE_FIREBASE_AUTH_DOMAIN`
    *   `VITE_FIREBASE_PROJECT_ID`
    *   `VITE_FIREBASE_APP_ID`
    *   `VITE_FIREBASE_FIRESTORE_DATABASE_ID`

## 🛠️ Configuration Files

*   `netlify.toml`: Handles Single Page Application (SPA) routing.
*   `public/_redirects`: Fallback routing configuration.

## 📝 Note on Backend
This app uses Firebase for its database and authentication, so it functions as a pure Client-Side SPA on Netlify. The `server.ts` file used for local development is not required for the production build on Netlify.
