# Nexora Mobile

Android-first Expo client for the existing Nexora FastAPI backend. It currently includes the presentation-ready mobile foundation for Home, Discover, Projects, Inbox, and Profile.

## Start

1. Copy `.env.example` to `.env`.
2. For an Android emulator, keep `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000`.
3. For Expo Go on a physical phone, replace it with your computer's LAN address and run the backend on `0.0.0.0:8000`.
4. Install dependencies with `pnpm install`.
5. Run `pnpm android` or `pnpm start` and scan the Expo Go QR code.

The backend still uses process-lifetime demo data, so mutations reset when it restarts.
