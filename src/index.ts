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
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import crypto from 'crypto';

// Load environment variables from .env file
dotenv.config();

// Define cache schema
type CacheData = {
  urlCache: Record<string, {
    analysis: string,
    timestamp: number
  }>,
  pathCache: Record<string, {
    analysis: string,
    timestamp: number
  }>
}

// Initialize cache with lowdb
// Create cache directory if it doesn't exist
const cacheDirPath = path.join(os.homedir(), 'image-analysis');
if (!fs.existsSync(cacheDirPath)) {
  fs.mkdirSync(cacheDirPath, { recursive: true });
}

const cacheFilePath = path.join(cacheDirPath, 'image-analysis-cache.json');
const adapter = new JSONFile<CacheData>(cacheFilePath);
const db = new Low<CacheData>(adapter, { urlCache: {}, pathCache: {} });

// Get OpenAI API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

// Initialize OpenAI client
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

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
    
    // Initialize cache
    this.initCache().catch(err => console.error('Failed to initialize cache:', err));
  }

  // Add cache-related methods
  private async initCache() {
    await db.read();
  }

  private async saveCache() {
    await db.write();
  }

  private getCachedAnalysis(key: string, isUrl: boolean): string | null {
    // Initialize if not read yet
    if (db.data === null) {
      return null;
    }

    const cache = isUrl ? db.data.urlCache : db.data.pathCache;
    const cachedItem = cache[key];
    
    if (!cachedItem) {
      return null;
    }

    // TTL 체크 제거, 캐시가 있으면 항상 사용
    console.error(`[Cache] Using cached analysis for ${isUrl ? 'URL' : 'path'}: ${key.substring(0, 10)}...`);
    return cachedItem.analysis;
  }

  private async cacheAnalysis(key: string, analysis: string, isUrl: boolean) {
    if (db.data === null) {
      await this.initCache();
      if (db.data === null) return; // Safety check
    }

    const cache = isUrl ? db.data.urlCache : db.data.pathCache;
    cache[key] = {
      analysis,
      timestamp: Date.now() // 타임스탬프는 참고용으로 유지
    };

    console.error(`[Cache] Stored analysis for ${isUrl ? 'URL' : 'path'}: ${key.substring(0, 10)}...`);
    try {
      await this.saveCache();
    } catch (err) {
      console.error('Failed to save cache:', err);
    }
  }

  private generateCacheKey(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }

  private setupToolHandlers() {
    // Define tool list
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_image',
          description: 'Receives an image URL and analyzes the image content using GPT-4o-mini',
          inputSchema: {
            type: 'object',
            properties: {
              imageUrl: {
                type: 'string',
                description: 'URL of the image to analyze',
              },
            },
            required: ['imageUrl'],
          },
        },
        // --- New Tool Definition ---
        {
          name: 'analyze_image_from_path',
          description: 'Loads an image from a local file path and analyzes its content using GPT-4o-mini. AI assistants need to provide a valid path for the server execution environment (e.g., Linux path if the server is running on WSL).',
          inputSchema: {
            type: 'object',
            properties: {
              imagePath: {
                type: 'string',
                description: 'Local file path of the image to analyze (must be accessible from the server execution environment)',
              },
            },
            required: ['imagePath'],
          },
        },
        // --- End New Tool Definition ---
      ],
    }));

    // Tool execution handler
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
          const cacheKey = this.generateCacheKey(imageUrl);
          
          // Check cache first
          const cachedAnalysis = this.getCachedAnalysis(cacheKey, true);
          if (cachedAnalysis) {
            analysis = cachedAnalysis;
          } else {
            // Not in cache, proceed with analysis
            await this.validateImageUrl(imageUrl); // Validate URL accessibility
            analysis = await this.analyzeImageWithGpt4({ type: 'url', data: imageUrl });
            // Cache the result
            await this.cacheAnalysis(cacheKey, analysis, true);
          }

        } else if (toolName === 'analyze_image_from_path') {
          if (!isValidAnalyzeImagePathArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'Invalid arguments for analyze_image_from_path: imagePath (string) is required'
            );
          }
          
          const imagePath = args.imagePath;
          const cacheKey = this.generateCacheKey(imagePath);
          
          // Check cache first
          const cachedAnalysis = this.getCachedAnalysis(cacheKey, false);
          if (cachedAnalysis) {
            analysis = cachedAnalysis;
          } else {
            // Security checks for the path
            if (path.isAbsolute(imagePath) && !imagePath.startsWith(process.cwd()) && !imagePath.startsWith(os.homedir()) && !imagePath.startsWith('/mnt/')) {
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
            // Cache the result
            await this.cacheAnalysis(cacheKey, analysis, false);
          }

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
              text: `Tool execution error (${toolName}): ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // Method to check if the image URL is valid (existing)
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

  // Method to analyze images with GPT-4o-mini (modified: accepts URL or Base64)
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
            content: 'Analyze the image content in detail and provide an explanation in English.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Please analyze the following image and explain its content in detail.' },
              imageInput, // Use the constructed image input
            ],
          },
        ],
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || 'Could not retrieve analysis results.';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : String(error)}`);
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
