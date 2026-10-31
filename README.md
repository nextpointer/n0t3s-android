<h1 align="center">📝 N0T3S</h1>

<div align="center">

![Bun](https://img.shields.io/badge/Bun-F472B6?style=flat&logo=bun&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat&logo=tailwind-css&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=flat&logo=capacitor&logoColor=white)

</div>

<p align="center">
  <b>A simple, offline-first, fast and minimal note-taking app</b>
</p>

---

## 🚀 Tech Stack
| **Frontend** | **Styling** | **Build Tool** | **Mobile** |
|--------------|-------------|----------------|------------|
| ⚡ Next.js (static export) | 🎨 Tailwind | ⚡ Bun | 📱 Capacitor |

---

## ✨ Features
- 🖊 **Create, Edit, Delete Notes**
- 🏷 **Tag notes for easy organization**
- 💾 **On-device IndexedDB storage** (with a localStorage migration for existing users)
- 📴 **100% offline** — zero network calls, no server required
- 📱 **Installable Android app** (Capacitor) with hardware back-button support
- 🎨 **Beautiful Shadcn/UI + Tailwind Design**

> Carved for the future: the old server-side AI actions (summaries, rewrite,
> todo-style…) are parked out of the build in [`_future/ai/`](./_future/ai/) — see
> its README for how to bring them back.

---

## 📦 Installation

```bash
# 1️⃣ Clone the repository
git clone https://github.com/nextpointer/n0t3s-android.git

# 2️⃣ Install dependencies with Bun
bun install

# 3️⃣ Run the development server  (no env vars needed — it's offline)
bun dev
```

---

## 🎯 Usage

- ➕ Click Add Note
- 🖊 Write your note & add tags
- 💾 Save Note

Notes resolve at `/note/?id=<noteId>` (query string, not a path segment), which
is what lets the app prerender as a fully static export.

---

# 📱 Android (Capacitor)

The `android/` platform directory is committed to the repo. The app is a
Capacitor-wrapped static export (serviced by the Capacitor local HTTPS server,
`androidScheme: https`), so **nothing loaded at runtime hits the network**.

## Prerequisites

- **JDK 21** (`JAVA_HOME` or default JVM)
- **Android SDK** with at least:
  - `platforms;android-35`
  - `build-tools;35.0.0`
- `ANDROID_HOME` pointing at the SDK root and `adb` (platform-tools) on `PATH`

```bash
# one-time SDK bits (sdkmanager), if missing:
sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"
```

## Web assets & the Android shell

| Command | What it does |
|---|---|
| `bun run android:build` | `next build` (static export) → `bunx cap sync android` |
| `bun run android:debug` | web build + sync + Gradle **debug** APK |
| `bun run android:open` | open `android/` in Android Studio |

Install and run on a device/emulator:

```bash
bun run android:debug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Alternatively, let the committed GitHub Actions workflow do it: every push
builds a debug APK (download as the `app-debug` artifact), and pushing a
version tag publishes a Release with a versioned APK:

```bash
git tag v0.1.0
git push origin v0.1.0      # → Release "N0T3S v0.1.0" with n0t3s-v0.1.0-debug.apk
```

Anything you change in the web app needs a re-sync (`bun run android:build`)
before it appears in the APK — the WebView serves the copied `out/` assets.

## App icons & splash

Source artwork lives in [`assets/`](./assets/) (`icon.png` 1024×1024 paperclip
mark on a soft lilac tile, `splash.png` 2732×2732 dark with the same mark).
The launcher/adaptive/mipmap icons and the notification/widget art are kept in
sync from `public/android-chrome-512x512.png`. After editing the source art,
regenerate the platform resources:

```bash
bunx capacitor-assets generate --android --iconBackgroundColor '#FAF3FE' --splashBackgroundColor '#101014'
python3 scripts/fix_legacy_icons.py   # legacy (pre-Android-8) launcher icons: white → dark bg
```

## Hardware back button

`components/AndroidBackButton.tsx` (mounted in `app/layout.tsx`) listens to
`App('backButton')` from `@capacitor/app`: with browser history available it
calls `router.back()`, otherwise `App.exitApp()`.

## Android release

Create a keystore once (keep `n0t3s.keystore` and passwords private, never
commit them):

```bash
keytool -genkey -v -keystore n0t3s.keystore -alias n0t3s \
  -keyalg RSA -keysize 2048 -validity 10000
```

Wire it up via `android/keystore.properties` (already git-ignored):

```properties
storeFile=/absolute/path/to/n0t3s.keystore
storePassword=********
keyAlias=n0t3s
keyPassword=********
```

Add to `android/app/build.gradle`:

```groovy
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

Then build and install the signed release APK:

```bash
bun run android:build
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

---

<p align="center"> Made with ❤️ using <b>Next</b> & <b>Bun</b> </p>
