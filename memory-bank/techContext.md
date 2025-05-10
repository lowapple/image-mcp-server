# Technical Context

## Technology Stack
- **Runtime Environment**: Node.js
- **Language**: TypeScript
- **Key Libraries**:
  - `@modelcontextprotocol/sdk`: Core MCP protocol implementation
  - `openai`: OpenAI API client for GPT-4o-mini access
  - `axios`: HTTP client for URL validation
  - `dotenv`: Environment variable management
  - `mime-types`: File type detection
  - `fs` and `path`: Node.js built-ins for file operations

## Development Environment
- **Build Tools**: TypeScript compiler (tsc)
- **Runtime**: Node.js (with ts-node for development)
- **Package Management**: npm
- **Containerization**: Docker support

## Deployment Options
1. **Direct Execution**: Running the Node.js application directly
2. **Smithery Installation**: Using Smithery CLI for easy installation
3. **Docker Container**: Running in a containerized environment

## API Dependencies
- **OpenAI API**: Required for image analysis with GPT-4o-mini
  - Requires API key with appropriate permissions
  - Usage may incur costs based on OpenAI pricing

## Configuration Requirements
- Environment Variables:
  - `OPENAI_API_KEY`: OpenAI API key for GPT-4o-mini access

## Technical Constraints
- **Model Limitations**:
  - Analysis quality depends on GPT-4o-mini capabilities
  - OpenAI rate limits and quotas apply
  - Maximum token context window applies
- **Image Limitations**:
  - Only processes static images (not videos or animations)
  - Performance may vary based on image complexity and quality
- **Runtime Considerations**:
  - Node.js environment required
  - Sufficient memory for processing large images

## Integration Points
- **MCP Clients**: Any MCP-compatible client can invoke the server tools
- **File System**: Local file access for image analysis
- **Network**: URL fetching for remote images

## Security Considerations
- OpenAI API key must be kept secure
- Local file paths must be validated to prevent path traversal attacks
- Image URLs must be validated before processing 