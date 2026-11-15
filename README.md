# 🚌 IEUM Frontend

용인시 대중교통 이용 변화 분석 및 노선 중단 시뮬레이션 서비스 **IEUM의 프론트엔드 저장소**입니다.

**배포 URL:** https://ieum-fe.vercel.app

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React |
| Build Tool | Vite |
| Language | JavaScript (JSX) |
| Styling | CSS |
| Map | NAVER Maps JavaScript API v3 |
| API Communication | REST API (JSON) |
| Deployment | Vercel |
| Collaboration | Git, GitHub, Figma |

## 주요 구현 기능

### 1. 정류소 지도 (Station Map)
- 네이버 지도 기반 정류소 위치 표시
- 정류소 검색 및 마커 클러스터링
- 정류소 상세 정보 및 이용 데이터 시각화

### 2. 이용 급변 알림 (Alerts)
- 정류소별 이용량 급변 알림 목록
- 이용량 변화 추이 그래프
- 알림 상세 조회 및 검토 상태 관리

### 3. 노선 중단 시뮬레이션 (Simulation)
- 버스 노선 검색 및 다중 선택
- 노선 중단 시뮬레이션 API 연동
- 지도 기반 분석 결과 표시
- 시뮬레이션 결과 PDF 내보내기

## Frontend Architecture

```text
User (Web Browser)
        |
        v
React + Vite
        |
        +-- Station Map
        +-- Alerts
        +-- Simulation
        |
        +-- REST API --> Django Backend
        |
        +-- Maps SDK --> NAVER Maps API

Deployment: Vercel
```

## Getting Started

### 1. 저장소 클론

```bash
git clone https://github.com/ieum-yongin/FE.git
cd FE
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경변수 설정

프로젝트 루트에 `.env.development` 파일을 생성합니다.

```env
VITE_API_BASE_URL=<BACKEND_API_URL>
VITE_USE_MOCK=false
VITE_NAVER_MAP_CLIENT_ID=<NAVER_MAP_CLIENT_ID>
```

실제 설정값은 프로젝트 관리자에게 확인합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

터미널에 출력된 로컬 주소로 접속합니다.

### 5. 프로덕션 빌드

```bash
npm run build
```

## Deployment

프론트엔드는 Vercel을 통해 배포합니다.

배포 환경에서도 백엔드 API 주소와 네이버 지도 API Client ID를 환경변수로 설정해야 합니다.

## Collaboration

Git과 GitHub를 이용해 브랜치 기반으로 기능을 개발하고, Pull Request를 통해 변경사항을 관리합니다.
