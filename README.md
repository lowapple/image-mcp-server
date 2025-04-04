# image-mcp-server

画像URLまたはローカルファイルパスを受け取り、GPT-4o-miniモデルを使用して画像の内容を分析するMCPサーバーです。

<a href="https://glama.ai/mcp/servers/@champierre/image-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@champierre/image-mcp-server/badge" alt="Image Analysis Server MCP server" />
</a>

## 機能

- 画像URLまたはローカルファイルパスを入力として受け取り、その画像の内容を詳細に分析
- GPT-4o-miniモデルを使用した高精度な画像認識と説明
- 画像URLの有効性チェック機能
- ローカルファイルからの画像読み込みとBase64エンコード

## インストール

```bash
# リポジトリをクローン
git clone https://github.com/champierre/image-mcp-server.git # またはForkしたリポジトリ
cd image-mcp-server

# 依存パッケージのインストール
npm install

# TypeScriptのコンパイル
npm run build
```

## 設定

このサーバーを使用するには、OpenAI APIキーが必要です。以下の環境変数を設定してください：

```
OPENAI_API_KEY=your_openai_api_key
```

## MCPサーバーの設定

Clineなどのツールで使用するには、MCPサーバー設定ファイルに以下の設定を追加してください：

### VSCode Claude拡張機能の場合

`cline_mcp_settings.json`に以下を追加：

```json
{
  "mcpServers": {
    "image-analysis": {
      "command": "node",
      "args": ["/path/to/image-mcp-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Claude Desktop Appの場合

`claude_desktop_config.json`に以下を追加：

```json
{
  "mcpServers": {
    "image-analysis": {
      "command": "node",
      "args": ["/path/to/image-mcp-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## 使用方法

MCPサーバーが設定されると、以下のツールが利用可能になります：

- `analyze_image`: 画像URLを受け取り、その内容を分析します。
- `analyze_image_from_path`: ローカルファイルパスを受け取り、その内容を分析します。

### 使用例

**URLから分析:**
```
画像URLを分析してください: https://example.com/image.jpg
```

**ローカルファイルパスから分析:**
```
この画像を分析してください: /path/to/your/image.jpg
```

### 注意: ローカルファイルパスの指定について

`analyze_image_from_path` ツールを使用する場合、AIアシスタント（クライアント）は、**このサーバーが実行されている環境で有効なファイルパス**を指定する必要があります。

- **サーバーがWSL上で実行されている場合:**
  - AIアシスタントがWindowsパス（例: `C:\...`）を持っている場合、それをWSLパス（例: `/mnt/c/...`）に変換してからツールに渡す必要があります。
  - AIアシスタントがWSLパスを持っている場合は、そのまま渡します。
- **サーバーがWindows上で実行されている場合:**
  - AIアシスタントがWSLパス（例: `/home/user/...`）を持っている場合、それをUNCパス（例: `\\wsl$\Distro\...`）に変換してからツールに渡す必要があります。
  - AIアシスタントがWindowsパスを持っている場合は、そのまま渡します。

**パス変換はAIアシスタント（またはその実行環境）の責任範囲となります。** サーバーは受け取ったパスをそのまま解釈しようとします。

### 注意: ビルド時の型エラーについて

`npm run build` を実行する際、`mime-types` モジュールに関するTypeScriptの型定義ファイルが見つからない旨のエラー (TS7016) が表示される場合があります。

```
src/index.ts:16:23 - error TS7016: Could not find a declaration file for module 'mime-types'. ...
```

これは型チェックのエラーであり、JavaScriptへのコンパイル自体は成功しているため、**サーバーの実行には影響ありません**。このエラーを解消したい場合は、開発依存関係として型定義ファイルをインストールしてください。

```bash
npm install --save-dev @types/mime-types
# または
yarn add --dev @types/mime-types
```

## 開発

```bash
# 開発モードで実行
npm run dev
```

## ライセンス

ISC