#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { OpenAI } from 'openai';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs'; // Import fs for file reading
import * as path from 'path'; // Import path for path operations
import * as os from 'os'; // Import os module
import * as mime from 'mime-types'; // Revert to import statement

// .envファイルから環境変数を読み込む
dotenv.config();

// OpenAI APIキーを環境変数から取得
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// --- Argument Type Guards ---
const isValidAnalyzeImageArgs = (
  args: any
): args is { imageUrl: string } =>
  typeof args === 'object' &&
  args !== null &&
  typeof args.imageUrl === 'string';

const isValidAnalyzeImagePathArgs = (
  args: any
): args is { imagePath: string } => // New type guard for path tool
  typeof args === 'object' &&
  args !== null &&
  typeof args.imagePath === 'string';
// --- End Argument Type Guards ---

class ImageAnalysisServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'image-analysis-server',
        version: '1.1.0', // Version bump
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    // エラーハンドリング
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // ツール一覧の定義
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_image',
          description: '画像URLを受け取り、GPT-4o-miniを使用して画像の内容を分析します',
          inputSchema: {
            type: 'object',
            properties: {
              imageUrl: {
                type: 'string',
                description: '分析する画像のURL',
              },
            },
            required: ['imageUrl'],
          },
        },
        // --- New Tool Definition ---
        {
          name: 'analyze_image_from_path',
          description: 'ローカルファイルパスから画像を読み込み、GPT-4o-miniを使用して内容を分析します。AIアシスタントはサーバーの実行環境で有効なパスを渡す必要があります（例: WSL上のサーバーならLinuxパス）。',
          inputSchema: {
            type: 'object',
            properties: {
              imagePath: {
                type: 'string',
                description: '分析する画像のローカルファイルパス（サーバー実行環境からアクセス可能な形式で指定）',
              },
            },
            required: ['imagePath'],
          },
        },
        // --- End New Tool Definition ---
      ],
    }));

    // ツール実行ハンドラ
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments;

      try {
        let analysis: string;

        if (toolName === 'analyze_image') {
          if (!isValidAnalyzeImageArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Invalid arguments for analyze_image: imageUrl (string) is required'
            );
          }
          const imageUrl = args.imageUrl;
          await this.validateImageUrl(imageUrl); // Validate URL accessibility
          analysis = await this.analyzeImageWithGpt4({ type: 'url', data: imageUrl });

        } else if (toolName === 'analyze_image_from_path') {
          if (!isValidAnalyzeImagePathArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Invalid arguments for analyze_image_from_path: imagePath (string) is required'
            );
          }
          const imagePath = args.imagePath;
          // Basic security check: prevent absolute paths trying to escape common roots (adjust as needed)
          // This is a VERY basic check and might need refinement based on security requirements.
          if (path.isAbsolute(imagePath) && !imagePath.startsWith(process.cwd()) && !imagePath.startsWith(os.homedir()) && !imagePath.startsWith('/mnt/')) {
             // Allow relative paths, paths within cwd, home, or WSL mounts. Adjust if needed.
             console.warn(`Potential unsafe path access attempt blocked: ${imagePath}`);
             throw new McpError(ErrorCode.InvalidParams, 'Invalid or potentially unsafe imagePath provided.');
          }

          const resolvedPath = path.resolve(imagePath); // Resolve relative paths
          if (!fs.existsSync(resolvedPath)) {
            throw new McpError(ErrorCode.InvalidParams, `File not found at path: ${resolvedPath}`);
          }
          const imageDataBuffer = fs.readFileSync(resolvedPath);
          const base64String = imageDataBuffer.toString('base64');
          const mimeType = mime.lookup(resolvedPath) || 'application/octet-stream'; // Detect MIME type or default

          if (!mimeType.startsWith('image/')) {
             throw new McpError(ErrorCode.InvalidParams, `File is not an image: ${mimeType}`);
          }

          analysis = await this.analyzeImageWithGpt4({ type: 'base64', data: base64String, mimeType: mimeType });

        } else {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${toolName}`
          );
        }

        // Return successful analysis
        return {
          content: [
            {
              type: 'text',
              text: analysis,
            },
          ],
        };

      } catch (error) {
        console.error(`Error calling tool ${toolName}:`, error);
        // Return error content
        return {
          content: [
            {
              type: 'text',
              text: `ツール実行エラー (${toolName}): ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // 画像URLが有効かチェックするメソッド (既存)
  private async validateImageUrl(url: string): Promise<void> {
    try {
      const response = await axios.head(url);
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`URL is not an image: ${contentType}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Cannot access image URL: ${error.message}`);
      }
      throw error;
    }
  }

  // GPT-4o-miniで画像を分析するメソッド (修正: URLまたはBase64を受け取る)
  private async analyzeImageWithGpt4(
     imageData: { type: 'url', data: string } | { type: 'base64', data: string, mimeType: string }
   ): Promise<string> {
    try {
      let imageInput: any;
      if (imageData.type === 'url') {
        imageInput = { type: 'image_url', image_url: { url: imageData.data } };
      } else {
        // Construct data URI for OpenAI API
        imageInput = { type: 'image_url', image_url: { url: `data:${imageData.mimeType};base64,${imageData.data}` } };
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '画像の内容を詳細に分析し、日本語で説明してください。',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: '以下の画像を分析して、内容を詳しく説明してください。' },
              imageInput, // Use the constructed image input
            ],
          },
        ],
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || '分析結果を取得できませんでした。';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI APIエラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Image Analysis MCP server (v1.1.0) running on stdio'); // Updated version
  }
}

const server = new ImageAnalysisServer();
server.run().catch(console.error);
