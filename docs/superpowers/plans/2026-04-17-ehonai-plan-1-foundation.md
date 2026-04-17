# EhoNAI Web MVP - Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the Next.js + Firebase project with all type definitions, authentication, and shared infrastructure.

**Architecture:** Next.js 15 (App Router) frontend with Firebase client SDK for auth and Firestore. Cloud Functions project co-located in `functions/` directory. All Firestore data models defined as TypeScript types shared between frontend and backend.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Firebase (Auth, Firestore), Vitest

---

## File Structure

```
story-gen/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout with AuthProvider
│   │   ├── page.tsx              # Landing page (placeholder)
│   │   └── globals.css           # Tailwind globals
│   ├── components/
│   │   └── ui/                   # shadcn/ui components
│   ├── lib/
│   │   ├── firebase.ts           # Firebase client initialization
│   │   ├── types.ts              # All Firestore data model types
│   │   ├── auth-context.tsx      # React auth context + provider
│   │   └── hooks/
│   │       └── use-auth.ts       # Auth convenience hook
│   └── __tests__/
│       └── types.test.ts         # Type guard tests
├── functions/
│   ├── src/
│   │   ├── index.ts              # Cloud Functions entry point
│   │   └── lib/
│   │       └── types.ts          # Shared types for backend
│   ├── package.json
│   └── tsconfig.json
├── .env.local                    # Firebase config (gitignored)
├── .env.example                  # Template for .env.local
├── firestore.rules               # Security rules (placeholder)
├── firebase.json                 # Firebase project config
├── next.config.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

### Task 1: Initialize Next.js 15 Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `tailwind.config.ts`, `postcss.config.mjs`

- [ ] **Step 1: Scaffold Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --import-alias "@/*" --no-git --yes
```

Expected: Project files created. `src/app/page.tsx` and `src/app/layout.tsx` exist.

- [ ] **Step 2: Verify the project builds**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Install Vitest for testing**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 4: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 5: Add test script to package.json**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 6: Verify Vitest runs**

```bash
npm test
```

Expected: Vitest runs (0 tests found, exits cleanly).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json vitest.config.ts postcss.config.mjs src/ .eslintrc.json tailwind.config.ts next-env.d.ts
git commit -m "chore: initialize Next.js 15 project with Vitest"
```

---

### Task 2: Setup shadcn/ui

**Files:**
- Modify: `tailwind.config.ts`, `src/app/globals.css`
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/progress.tsx`

- [ ] **Step 1: Initialize shadcn/ui**

```bash
npx shadcn@latest init -d
```

Expected: `components.json` created, `src/lib/utils.ts` created, `tailwind.config.ts` and `globals.css` updated with CSS variables.

- [ ] **Step 2: Install required UI components**

```bash
npx shadcn@latest add button card input label badge progress separator
```

Expected: Components created under `src/components/ui/`.

- [ ] **Step 3: Verify build still works**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components.json src/lib/utils.ts src/components/ui/ tailwind.config.ts src/app/globals.css
git commit -m "chore: setup shadcn/ui with base components"
```

---

### Task 3: Firebase Client Configuration

**Files:**
- Create: `src/lib/firebase.ts`, `.env.example`, `.gitignore` (update)
- Modify: (none)

- [ ] **Step 1: Install Firebase SDK**

```bash
npm install firebase
```

- [ ] **Step 2: Create .env.example**

Create `.env.example`:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

- [ ] **Step 3: Update .gitignore**

Append to `.gitignore`:

```
# Environment variables
.env.local
.env.*.local
```

- [ ] **Step 4: Create Firebase initialization module**

Create `src/lib/firebase.ts`:

```typescript
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds (Firebase imported but not yet used in pages).

- [ ] **Step 6: Commit**

```bash
git add src/lib/firebase.ts .env.example .gitignore package.json package-lock.json
git commit -m "chore: add Firebase client SDK configuration"
```

---

### Task 4: TypeScript Type Definitions

**Files:**
- Create: `src/lib/types.ts`, `src/__tests__/types.test.ts`

- [ ] **Step 1: Write type guard tests**

Create `src/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  isValidBookInput,
  isValidPageCount,
  type BookInput,
  type IllustrationStyle,
  type BookStatus,
  type PageStatus,
  type UserPlan,
} from "@/lib/types";

describe("isValidPageCount", () => {
  it("accepts valid page counts", () => {
    expect(isValidPageCount(4)).toBe(true);
    expect(isValidPageCount(8)).toBe(true);
    expect(isValidPageCount(12)).toBe(true);
  });

  it("rejects invalid page counts", () => {
    expect(isValidPageCount(0)).toBe(false);
    expect(isValidPageCount(5)).toBe(false);
    expect(isValidPageCount(16)).toBe(false);
  });
});

describe("isValidBookInput", () => {
  it("accepts valid input with only required field", () => {
    const input: BookInput = { childName: "ゆうた" };
    expect(isValidBookInput(input)).toBe(true);
  });

  it("accepts valid input with all fields", () => {
    const input: BookInput = {
      childName: "ゆうた",
      childAge: 3,
      favorites: "きょうりゅう",
      lessonToTeach: "はみがき",
      memoryToRecreate: "どうぶつえん",
    };
    expect(isValidBookInput(input)).toBe(true);
  });

  it("rejects input with empty childName", () => {
    const input: BookInput = { childName: "" };
    expect(isValidBookInput(input)).toBe(false);
  });

  it("rejects input with whitespace-only childName", () => {
    const input: BookInput = { childName: "   " };
    expect(isValidBookInput(input)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '@/lib/types'`

- [ ] **Step 3: Implement type definitions**

Create `src/lib/types.ts`:

```typescript
import { Timestamp } from "firebase/firestore";

// --- Enums / Literal Unions ---

export type UserPlan = "free" | "premium";
export type BookStatus = "generating" | "completed" | "failed";
export type PageStatus = "pending" | "generating" | "completed" | "failed";
export type IllustrationStyle = "watercolor" | "flat" | "crayon";
export type PageCount = 4 | 8 | 12;

// --- Firestore Document Types ---

export interface UserDoc {
  displayName: string;
  email: string;
  plan: UserPlan;
  createdAt: Timestamp;
  monthlyGenerationCount: number;
}

export interface BookInput {
  childName: string;
  childAge?: number;
  favorites?: string;
  lessonToTeach?: string;
  memoryToRecreate?: string;
}

export interface BookDoc {
  userId: string;
  title: string;
  theme: string;
  style: IllustrationStyle;
  pageCount: PageCount;
  status: BookStatus;
  progress: number;
  input: BookInput;
  createdAt: Timestamp;
  expiresAt: Timestamp | null;
}

export interface PageDoc {
  pageNumber: number;
  text: string;
  imageUrl: string;
  imagePrompt: string;
  status: PageStatus;
}

export interface TemplateDoc {
  name: string;
  description: string;
  icon: string;
  order: number;
  systemPrompt: string;
  active: boolean;
}

// --- Type Guards / Validators ---

const VALID_PAGE_COUNTS: readonly number[] = [4, 8, 12];

export function isValidPageCount(n: number): n is PageCount {
  return VALID_PAGE_COUNTS.includes(n);
}

export function isValidBookInput(input: BookInput): boolean {
  return typeof input.childName === "string" && input.childName.trim().length > 0;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/__tests__/types.test.ts
git commit -m "feat: add Firestore data model type definitions with validators"
```

---

### Task 5: Auth Context & Provider

**Files:**
- Create: `src/lib/auth-context.tsx`, `src/lib/hooks/use-auth.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create auth context**

Create `src/lib/auth-context.tsx`:

```tsx
"use client";

import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const userRef = doc(db, "users", result.user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        displayName: result.user.displayName ?? "",
        email: result.user.email ?? "",
        plan: "free",
        createdAt: serverTimestamp(),
        monthlyGenerationCount: 0,
      });
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 2: Create useAuth hook**

Create `src/lib/hooks/use-auth.ts`:

```typescript
"use client";

import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "@/lib/auth-context";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

- [ ] **Step 3: Wrap root layout with AuthProvider**

Replace `src/app/layout.tsx` contents:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EhoNAI - AIで絵本を作ろう",
  description:
    "我が子が主人公になれる絵本を、誰でも5分で作れる。AIが紡ぐ物語と挿絵で、世界にひとつだけの思い出を。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-context.tsx src/lib/hooks/use-auth.ts src/app/layout.tsx
git commit -m "feat: add Firebase Auth context, provider, and useAuth hook"
```

---

### Task 6: Cloud Functions Project Setup

**Files:**
- Create: `functions/package.json`, `functions/tsconfig.json`, `functions/src/index.ts`, `functions/src/lib/types.ts`, `functions/.eslintrc.js`
- Create: `firebase.json`, `firestore.rules`, `.firebaserc`

- [ ] **Step 1: Install Firebase CLI (if not already installed)**

```bash
npm install -g firebase-tools
```

- [ ] **Step 2: Initialize Firebase project**

Run in the project root. Select: Firestore, Functions (TypeScript), Hosting (use `out` as public directory), Storage.

```bash
firebase init firestore functions hosting storage
```

For Functions, choose TypeScript and say yes to ESLint. For Hosting, set public directory to `out` and configure as SPA.

If `firebase init` is not interactive-friendly, create the files manually per steps 3–6.

- [ ] **Step 3: Create functions/package.json** (if not created by firebase init)

Create `functions/package.json`:

```json
{
  "name": "ehonai-functions",
  "private": true,
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "serve": "npm run build && firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "engines": {
    "node": "20"
  },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^13.0.0",
    "firebase-functions": "^6.0.0",
    "@google/generative-ai": "^0.24.0",
    "replicate": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 4: Create functions/tsconfig.json**

Create `functions/tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2022",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

- [ ] **Step 5: Create functions entry point**

Create `functions/src/index.ts`:

```typescript
// Cloud Functions entry point — exports are added in subsequent plans
export {};
```

- [ ] **Step 6: Create shared backend types**

Create `functions/src/lib/types.ts`:

```typescript
// Shared types for Cloud Functions (mirrors frontend types without Firebase client SDK imports)

export type UserPlan = "free" | "premium";
export type BookStatus = "generating" | "completed" | "failed";
export type PageStatus = "pending" | "generating" | "completed" | "failed";
export type IllustrationStyle = "watercolor" | "flat" | "crayon";
export type PageCount = 4 | 8 | 12;

export interface BookInput {
  childName: string;
  childAge?: number;
  favorites?: string;
  lessonToTeach?: string;
  memoryToRecreate?: string;
}

export interface BookData {
  userId: string;
  title: string;
  theme: string;
  style: IllustrationStyle;
  pageCount: PageCount;
  status: BookStatus;
  progress: number;
  input: BookInput;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp | null;
}

export interface PageData {
  pageNumber: number;
  text: string;
  imageUrl: string;
  imagePrompt: string;
  status: PageStatus;
}

export interface TemplateData {
  name: string;
  description: string;
  icon: string;
  order: number;
  systemPrompt: string;
  active: boolean;
}

/** JSON shape returned by LLM for story generation */
export interface GeneratedStory {
  title: string;
  pages: Array<{
    text: string;
    imagePrompt: string;
  }>;
}

export interface LLMClient {
  generateStory(params: {
    systemPrompt: string;
    childName: string;
    childAge?: number;
    favorites?: string;
    lessonToTeach?: string;
    memoryToRecreate?: string;
    pageCount: PageCount;
    style: IllustrationStyle;
  }): Promise<GeneratedStory>;
}

export interface ImageClient {
  generateImage(prompt: string): Promise<Buffer>;
}
```

- [ ] **Step 7: Create firebase.json** (if not created by init)

Create `firebase.json`:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs20"
  },
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

- [ ] **Step 8: Create placeholder Firestore rules**

Create `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Detailed rules are implemented in Plan 4: Operations & Deploy
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Create `firestore.indexes.json`:

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

Create `storage.rules`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

- [ ] **Step 9: Install functions dependencies**

```bash
cd functions && npm install && cd ..
```

- [ ] **Step 10: Verify functions build**

```bash
cd functions && npm run build && cd ..
```

Expected: TypeScript compiles with no errors. `functions/lib/` directory created.

- [ ] **Step 11: Commit**

```bash
git add functions/ firebase.json firestore.rules firestore.indexes.json storage.rules .firebaserc
git commit -m "chore: setup Cloud Functions project with shared types and Firebase config"
```

---

## Self-Review Checklist

1. **Spec coverage**: All foundation requirements covered — Next.js 15 + App Router ✓, Tailwind ✓, shadcn/ui ✓, Firebase client SDK ✓, Firestore types (users/books/pages/templates) ✓, Firebase Auth (Google Sign-In) ✓, Cloud Functions project ✓, LLM-agnostic interface (`LLMClient`) ✓, Image client interface (`ImageClient`) ✓.

2. **Placeholder scan**: No TBD/TODO items. Firestore rules are intentionally minimal (detailed implementation in Plan 4). `functions/src/index.ts` exports nothing yet (functions added in Plan 2).

3. **Type consistency**: `BookInput`, `IllustrationStyle`, `PageCount`, `BookStatus`, `PageStatus` names match between `src/lib/types.ts` (frontend) and `functions/src/lib/types.ts` (backend). Frontend uses `Timestamp` from `firebase/firestore`, backend uses `FirebaseFirestore.Timestamp` from `firebase-admin`.

---

## Next Plan

After completing this plan, proceed to **Plan 2: Backend Pipeline** which implements:
- Content filter (NGワード検出)
- Prompt builder (テンプレート→LLMプロンプト変換)
- Gemini API client
- Replicate API client
- `generateBook` Cloud Function
