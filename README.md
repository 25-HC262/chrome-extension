## chrome-extension

### 개발/빌드 (pnpm + Vite)

- **설치**:

```bash
pnpm install
```

- **개발(로컬 빌드 산출물 갱신)**:

```bash
pnpm dev
```

- **프로덕션 빌드**:

```bash
pnpm build
```

### Chrome에 로드

- **로드 경로**: `dist/`
- `chrome://extensions` → 개발자 모드 ON → “압축해제된 확장 프로그램을 로드” → `dist` 선택