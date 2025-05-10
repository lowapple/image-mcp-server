# image-mcp-server

이미지 URL이나 로컬 파일 경로를 입력받아 GPT-4o-mini 모델을 사용하여 이미지 내용을 분석하는 MCP 서버입니다.

[English README](README.md) | [日本語の README](README.ja.md)

<a href="https://glama.ai/mcp/servers/@champierre/image-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@champierre/image-mcp-server/badge" alt="이미지 분석 MCP 서버" />
</a>

[![smithery badge](https://smithery.ai/badge/@champierre/image-mcp-server)](https://smithery.ai/server/@champierre/image-mcp-server)

## 기능

- 이미지 URL이나 로컬 파일 경로를 입력으로 받아 이미지 내용을 상세히 분석
- GPT-4o-mini 모델을 사용한 고정밀 이미지 인식 및 설명
- 이미지 URL 유효성 검사 기능
- 로컬 파일에서 이미지 로드 및 Base64 인코딩
- 성능 향상 및 API 비용 절감을 위한 분석 결과 캐싱 기능

## 설치

### Smithery를 통한 설치

Claude Desktop용 Image Analysis Server를 [Smithery](https://smithery.ai/server/@champierre/image-mcp-server)를 통해 자동으로 설치하려면:

```bash
npx -y @smithery/cli install @champierre/image-mcp-server --client claude
```

### 수동 설치

```bash
# 저장소 복제
git clone https://github.com/champierre/image-mcp-server.git # 또는 포크한 저장소
cd image-mcp-server

# 의존성 패키지 설치
npm install

# TypeScript 컴파일
npm run build
```

## 설정

이 서버를 사용하려면 OpenAI API 키가 필요합니다. 다음 환경 변수를 설정하세요:

```
OPENAI_API_KEY=your_openai_api_key
DB_PATH=./path/to/database # 선택사항, 기본값은 ./db
```

`DB_PATH` 변수는 서버가 이미지 분석 캐시 데이터베이스를 저장할 위치를 결정합니다. 설정하지 않을 경우 현재 작업 디렉토리 내의 `db` 디렉토리가 기본값으로 사용됩니다.

## MCP 서버 설정

Cline과 같은 도구에서 사용하려면 MCP 서버 설정 파일에 다음 설정을 추가하세요:

### Cline의 경우

`cline_mcp_settings.json`에 다음을 추가:

```json
{
  "mcpServers": {
    "image-analysis": {
      "command": "node",
      "args": ["/path/to/image-mcp-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key",
        "DB_PATH": "/path/to/database" // 선택사항
      }
    }
  }
}
```

### Claude Desktop App의 경우

`claude_desktop_config.json`에 다음을 추가:

```json
{
  "mcpServers": {
    "image-analysis": {
      "command": "node",
      "args": ["/path/to/image-mcp-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key",
        "DB_PATH": "/path/to/database" // 선택사항
      }
    }
  }
}
```

## 사용 방법

MCP 서버가 설정되면 다음 도구를 사용할 수 있습니다:

- `analyze_image`: 이미지 URL을 받아 해당 내용을 분석합니다.
- `analyze_image_from_path`: 로컬 파일 경로를 받아 해당 내용을 분석합니다.

### 캐싱 기능

이 서버에는 분석 결과를 로컬 데이터베이스에 저장하는 캐싱 기능이 추가되었습니다. 이전에 분석된 이미지 분석을 요청하면 서버는 OpenAI에 새로운 API 호출을 하는 대신 캐시된 결과를 검색합니다. 이로 인해 성능이 향상되고 API 비용이 절감됩니다.

- URL 기반 이미지는 URL에 기반하여 캐시됩니다
- 로컬 파일 기반 이미지는 파일 내용 해시에 기반하여 캐시됩니다

캐시는 `DB_PATH` 환경 변수로 지정된 위치의 JSON 파일에 저장됩니다.

### 사용 예시

**URL에서 분석:**

```
이 이미지 URL을 분석해주세요: https://example.com/image.jpg
```

**로컬 파일 경로에서 분석:**

```
이 이미지를 분석해주세요: /path/to/your/image.jpg
```

### 참고: 로컬 파일 경로 지정

`analyze_image_from_path` 도구를 사용할 때, AI 어시스턴트(클라이언트)는 **이 서버가 실행 중인 환경에서 유효한 파일 경로**를 지정해야 합니다.

- **서버가 WSL에서 실행 중인 경우:**
  - AI 어시스턴트가 Windows 경로(예: `C:\...`)를 가지고 있으면, 도구에 전달하기 전에 WSL 경로(예: `/mnt/c/...`)로 변환해야 합니다.
  - AI 어시스턴트가 WSL 경로를 가지고 있으면 그대로 전달합니다.
- **서버가 Windows에서 실행 중인 경우:**
  - AI 어시스턴트가 WSL 경로(예: `/home/user/...`)를 가지고 있으면, 도구에 전달하기 전에 UNC 경로(예: `\\wsl$\Distro\...`)로 변환해야 합니다.
  - AI 어시스턴트가 Windows 경로를 가지고 있으면 그대로 전달합니다.

**경로 변환은 AI 어시스턴트(또는 그 실행 환경)의 책임 범위입니다.** 서버는 받은 경로를 그대로 해석하려고 시도합니다.

### 참고: 빌드 시 타입 오류

`npm run build`를 실행할 때, `mime-types` 모듈에 관한 TypeScript 타입 정의 파일이 없다는 오류(TS7016)가 표시될 수 있습니다.

```
src/index.ts:16:23 - error TS7016: Could not find a declaration file for module 'mime-types'. ...
```

이는 타입 검사 오류이며, JavaScript 컴파일 자체는 성공하기 때문에 **서버 실행에는 영향을 미치지 않습니다**. 이 오류를 해결하려면 개발 의존성으로 타입 정의 파일을 설치하세요.

```bash
npm install --save-dev @types/mime-types
# 또는
yarn add --dev @types/mime-types
```

## 개발

```bash
# 개발 모드로 실행
npm run dev
```

## 테스트

이 프로젝트에는 기능을 검증하기 위한 단위 테스트가 포함되어 있습니다. 테스트를 실행하려면:

```bash
# 모든 테스트 실행
npm test

# 감시 모드로 테스트 실행(파일이 변경되면 자동으로 테스트가 다시 실행됨)
npm run test:watch
```

테스트는 여러 카테고리로 구성되어 있습니다:
- URL 이미지 분석 테스트
- 로컬 경로 이미지 분석 테스트
- 캐싱 기능 테스트

테스트는 Jest 테스트 프레임워크를 사용하며, OpenAI API와 파일 시스템 같은 외부 의존성에 대한 모의 객체가 포함되어 있습니다.

## 라이선스

MIT 