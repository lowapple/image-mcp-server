# Project Brief: MCP Image Recognition Server

## Project Overview
The MCP Image Recognition Server is a Model Context Protocol (MCP) server that analyzes images using OpenAI's GPT-4o-mini model. It provides image analysis capabilities through two main tools:

1. `analyze_image` - Analyzes images from URLs
2. `analyze_image_from_path` - Analyzes images from local file paths

## Core Objectives
- Provide high-quality image analysis and content description
- Support both URL-based and local file-based image processing
- Ensure reliable integration with MCP clients like Claude Desktop App and Cline

## Key Requirements
- OpenAI API key for GPT-4o-mini access
- Proper handling of image files (validation, processing)
- Secure file path handling for local images
- Compatible with MCP client applications

## Success Criteria
- Accurate image content analysis
- Proper error handling for invalid inputs
- Safe and secure processing of local files
- Easy installation and configuration process

## Target Users
- AI assistant users who need image analysis capabilities
- Developers integrating image analysis into AI assistant workflows
- Users of Claude and other MCP-compatible assistants 