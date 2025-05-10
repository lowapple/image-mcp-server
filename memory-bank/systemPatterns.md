# System Patterns

## Architecture Overview
The MCP Image Recognition Server follows a simple client-server architecture where it acts as a server that responds to tool invocation requests from MCP clients (like Claude or Cline). The server is built on Node.js using TypeScript.

```
┌───────────┐    MCP Protocol    ┌──────────────────────┐      ┌───────────┐
│           │◄─────────────────► │                      │◄────►│           │
│ MCP Client│                    │ Image Analysis Server│      │ OpenAI API│
│ (Claude)  │                    │                      │      │           │
└───────────┘                    └──────────────────────┘      └───────────┘
                                          ▲
                                          │
                                          ▼
                                  ┌──────────────────┐
                                  │ Local Filesystem │
                                  │ (for local images)│
                                  └──────────────────┘
```

## Core Components
1. **MCP Server Implementation** - Handles communication with clients using the Model Context Protocol
2. **Tool Handlers** - Processes tool invocation requests from clients
3. **Image Validation** - Validates image URLs and file paths
4. **OpenAI Integration** - Communicates with the OpenAI API to analyze images
5. **Error Handling** - Provides proper error responses for various failure conditions

## Key Design Patterns
1. **Factory Pattern** - Used for creating appropriate image analysis methods based on input type
2. **Adapter Pattern** - Adapts local file data and URLs into the format required by the OpenAI API
3. **Command Pattern** - Tool invocations follow a command pattern where clients request specific actions
4. **Singleton Pattern** - Server instance is a singleton in the application

## Data Flow
1. Client sends a tool invocation request with image URL or file path
2. Server validates the input (URL accessibility or file existence)
3. Server prepares the image data for analysis (direct URL or base64 encoding for local files)
4. Server sends the image to OpenAI's GPT-4o-mini model for analysis
5. Server receives the analysis results from OpenAI
6. Server formats and returns the results to the client

## Security Considerations
- Input validation for all user-provided data
- Path traversal protection for local file access
- MIME type checking to ensure only images are processed
- Error handling that doesn't expose sensitive information 