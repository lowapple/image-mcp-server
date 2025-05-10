# image-mcp-server

画像 URL またはローカルファイルパスを受け取り、GPT-4o-mini モデルを使用して画像の内容を分析する MCP サーバーです。

[English README](README.md) | [한국어 README](README.ko.md)

<a href="https://glama.ai/mcp/servers/@champierre/image-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@champierre/image-mcp-server/badge" alt="Image Analysis MCP Server" />
</a>

[![smithery badge](https://smithery.ai/badge/@champierre/image-mcp-server)](https://smithery.ai/server/@champierre/image-mcp-server)

## 機能

- 画像 URL またはローカルファイルパスを入力として受け取り、その画像の内容を詳細に分析
- GPT-4o-mini モデルを使用した高精度な画像認識と説明
- 画像 URL の有効性チェック機能
- ローカルファイルからの画像読み込みと Base64 エンコード
- ローカルファイルパスの安全な取り扱い
- ユーザーのホームディレクトリに分析結果を永続的にキャッシュして API 呼び出しを削減し、パフォーマンスを向上
- プロジェクト間でキャッシュを共有

## インストール

### Smithery を通じたインストール

Claude Desktop 用の Image Analysis Server を [Smithery](https://smithery.ai/server/@champierre/image-mcp-server) を通じて自動的にインストールするには：

```bash
npx -y @smithery/cli install @champierre/image-mcp-server --client claude
```

### 手動インストール

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

このサーバーを使用するには、OpenAI API キーが必要です。以下の環境変数を設定してください：

```
OPENAI_API_KEY=your_openai_api_key
```

## MCP サーバーの設定

Cline などのツールで使用するには、MCP サーバー設定ファイルに以下の設定を追加してください：

### Cline の場合

`cline_mcp_settings.json`に以下を追加：

```json
{
  "mcpServers": {
    "image-analysis": {
      "command": "node",
      "args": ["/path/to/image-mcp-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key"
      }
    }
  }
}
```

### Claude Desktop App の場合

`claude_desktop_config.json`に以下を追加：

```json
{
  "mcpServers": {
    "image-analysis": {
      "command": "node",
      "args": ["/path/to/image-mcp-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key"
      }
    }
  }
}
```

## 使用方法

MCP サーバーが設定されると、以下のツールが利用可能になります：

- `analyze_image`: 画像 URL を受け取り、その内容を分析します。
- `analyze_image_from_path`: ローカルファイルパスを受け取り、その内容を分析します。

### キャッシュ機能

このサーバーには、分析結果をユーザーのホームディレクトリ（`image-analysis`フォルダ内）に保存する永続的なキャッシュ機能が含まれています。以前に分析した画像の分析をリクエストすると、サーバーは OpenAI に新しい API 呼び出しを行う代わりにキャッシュされた結果を取得します。これにより、パフォーマンスが大幅に向上し、API コストが削減されます。

- URL ベースの画像は URL に基づいてキャッシュされます
- ローカルファイルベースの画像はファイルパスに基づいてキャッシュされます

キャッシュはサーバーの再起動後も保持され、サーバーを使用する異なるプロジェクト間で共有されます。

### 使用例

**URL から分析:**

```
画像URLを分析してください: https://example.com/image.jpg
```

**ローカルファイルパスから分析:**

```
この画像を分析してください: /path/to/your/image.jpg
```

### 注意: ローカルファイルパスの指定について

`analyze_image_from_path` ツールを使用する場合、AI アシスタント（クライアント）は、**このサーバーが実行されている環境で有効なファイルパス**を指定する必要があります。

- **サーバーが WSL 上で実行されている場合:**
  - AI アシスタントが Windows パス（例: `C:\...`）を持っている場合、それを WSL パス（例: `/mnt/c/...`）に変換してからツールに渡す必要があります。
  - AI アシスタントが WSL パスを持っている場合は、そのまま渡します。
- **サーバーが Windows 上で実行されている場合:**
  - AI アシスタントが WSL パス（例: `/home/user/...`）を持っている場合、それを UNC パス（例: `\\wsl$\Distro\...`）に変換してからツールに渡す必要があります。
  - AI アシスタントが Windows パスを持っている場合は、そのまま渡します。

**パス変換は AI アシスタント（またはその実行環境）の責任範囲となります。** サーバーは受け取ったパスをそのまま解釈しようとします。

### 注意: ビルド時の型エラーについて

`npm run build` を実行する際、`mime-types` モジュールに関する TypeScript の型定義ファイルが見つからない旨のエラー (TS7016) が表示される場合があります。

```
src/index.ts:16:23 - error TS7016: Could not find a declaration file for module 'mime-types'. ...
```

これは型チェックのエラーであり、JavaScript へのコンパイル自体は成功しているため、**サーバーの実行には影響ありません**。このエラーを解消したい場合は、開発依存関係として型定義ファイルをインストールしてください。

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

MIT
