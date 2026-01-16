# 붕오떡

![image](https://github.com/ironhiro/bungodduk/assets/6630745/75b89ff5-184c-4995-8102-ecb36fdba039)

해당 메뉴를 감명깊게 보아서 큐브형태로 그저 움직이기만 하는 사이트를 구축해보았습니다.

## Demo

**https://ironhiro.github.io/bungodduk/**

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **3D Graphics**: React Three Fiber + Three.js
- **Language**: TypeScript
- **State**: Zustand
- **Styling**: CSS
- **Deployment**: GitHub Pages

## 로컬 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 린트 검사
npm run lint
```

## 기능

- 3D 큐브가 화면을 떠다니며 벽에 충돌 시 두 개로 분열
- 큐브가 일정 크기 이하로 작아지면 글리치 효과 후 리셋
- 설정 패널에서 실시간 파라미터 조정 가능:
  - 초기 크기 범위
  - 이동/회전 속도 배율
  - 분열 반발 속도
  - 벽 튕김 강도
  - 큐브 배경 불투명도
  - 글리치 지속 시간

## 프로젝트 구조

```
├── app/                  # Next.js App Router
│   ├── layout.tsx        # 루트 레이아웃 (폰트 설정)
│   └── page.tsx          # 메인 페이지 (Canvas + 설정 패널)
├── components/
│   ├── CubeField.tsx     # 큐브 시뮬레이션 로직
│   ├── CubeMesh.tsx      # 큐브 3D 메시
│   ├── ImpactMesh.tsx    # 충돌 이펙트
│   ├── ResponsiveOrtho.tsx # 반응형 직교 카메라
│   └── SettingsPanel.tsx # 설정 UI 패널
├── lib/
│   ├── makeFaceCanvasTexture.ts  # 큐브 면 텍스처 생성
│   └── makeImpactTexture.ts      # 충돌 이펙트 텍스처
└── styles/
    ├── globals.css       # 전역 스타일
    └── cube.css          # 큐브/패널 스타일
```

## TODO

- ~~상하좌우 선형으로 움직이게 하기~~
- ~~충돌 시 두개로 나누기(사이즈는 절반으로)~~
- ~~일정 개수 이상 달성하면 연출 이후 처음부터 시작~~
- 화면보호기로 사용하려는 수요가 있어서 Docker로도 배포 예정