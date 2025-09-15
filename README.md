# fal-ai/minimax/image-01 MCP Server

A Model Context Protocol (MCP) server that provides access to the fal-ai/minimax/image-01 image generation model. This server allows you to generate high-quality images using MiniMax (Hailuo AI) Text to Image technology through the fal.ai platform.

## Features

- **High-Quality Image Generation**: Generate stunning images using the fal-ai/minimax/image-01 model
- **MiniMax (Hailuo AI) Technology**: Advanced text-to-image generation with excellent quality
- **Multiple Generation Methods**: Support for synchronous and queue-based generation
- **Flexible Aspect Ratios**: Support for various aspect ratios from square to panoramic
- **Prompt Optimization**: Optional prompt enhancement for better results
- **Local Image Download**: Automatically downloads generated images to local storage
- **Queue Management**: Submit long-running requests and check their status
- **Webhook Support**: Optional webhook notifications for completed requests
- **Stylized and Realistic Output**: Supports both stylized and photorealistic image generation

## Installation

1. Clone this repository:
```bash
git clone https://github.com/PierrunoYT/fal-minimax-image-01-mcp-server.git
cd fal-minimax-image-01-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### Environment Variables

Set your fal.ai API key as an environment variable:

```bash
export FAL_KEY="your_fal_api_key_here"
```

You can get your API key from [fal.ai](https://fal.ai/).

### MCP Client Configuration

Add this server to your MCP client configuration. For example, in Claude Desktop's config file:

```json
{
  "mcpServers": {
    "fal-minimax-image-01": {
      "command": "npx",
      "args": ["-y", "https://github.com/PierrunoYT/fal-minimax-image-01-mcp-server.git"],
      "env": {
        "FAL_KEY": "your_fal_api_key_here"
      }
    }
  }
}
```

If the package is published to npm, you can use:

```json
{
  "mcpServers": {
    "fal-minimax-image-01": {
      "command": "npx",
      "args": ["fal-minimax-image-01-mcp-server"],
      "env": {
        "FAL_KEY": "your_fal_api_key_here"
      }
    }
  }
}
```

Alternatively, if you've cloned the repository locally:

```json
{
  "mcpServers": {
    "fal-minimax-image-01": {
      "command": "node",
      "args": ["/path/to/fal-minimax-image-01-mcp-server/build/index.js"],
      "env": {
        "FAL_KEY": "your_fal_api_key_here"
      }
    }
  }
}
```

## Available Tools

### 1. `minimax_generate`

Generate images using the standard synchronous method.

**Parameters:**
- `prompt` (required): Text prompt for image generation (max 1500 characters). Longer text prompts will result in better quality images.
- `aspect_ratio` (optional): Aspect ratio of the generated image (default: "1:1")
- `num_images` (optional): Number of images to generate (1-9, default: 1)
- `prompt_optimizer` (optional): Whether to enable automatic prompt optimization (default: false)

**Example:**
```json
{
  "prompt": "Man dressed in white t shirt, full-body stand front view image, outdoor, Venice beach sign, full-body image, Los Angeles, Fashion photography of 90s, documentary, Film grain, photorealistic",
  "aspect_ratio": "16:9",
  "num_images": 2,
  "prompt_optimizer": true
}
```

### 2. `minimax_generate_queue`

Submit a long-running image generation request to the queue.

**Parameters:** Same as `minimax_generate` plus:
- `webhook_url` (optional): URL for webhook notifications

**Returns:** A request ID for tracking the job

### 3. `minimax_queue_status`

Check the status of a queued request.

**Parameters:**
- `request_id` (required): The request ID from queue submission
- `logs` (optional): Include logs in response (default: true)

### 4. `minimax_queue_result`

Get the result of a completed queued request.

**Parameters:**
- `request_id` (required): The request ID from queue submission

## API Information

- **Endpoint**: `https://fal.run/fal-ai/minimax/image-01`
- **Model ID**: `fal-ai/minimax/image-01`
- **Category**: text-to-image
- **Kind**: inference
- **Tags**: stylized, realism

## Aspect Ratios

The MiniMax model supports the following aspect ratios:

- `1:1`: Square format (default)
- `16:9`: Widescreen landscape
- `4:3`: Standard landscape
- `3:2`: Classic photo landscape
- `2:3`: Classic photo portrait
- `3:4`: Standard portrait
- `9:16`: Vertical/mobile format
- `21:9`: Ultra-wide panoramic

**Example:**
```json
{
  "aspect_ratio": "16:9"
}
```

## Prompt Optimization

Enable prompt optimization to enhance your text prompts for better results:

```json
{
  "prompt_optimizer": true
}
```

When enabled, the AI will automatically improve your prompt to generate higher quality images. This is disabled by default.

## Output

Generated images are automatically downloaded to a local `images/` directory with descriptive filenames. The response includes:

- Local file paths
- Original URLs
- Image dimensions (when available)
- Content types
- File sizes
- Generation parameters used
- Request IDs for tracking

## Error Handling

The server provides detailed error messages for:
- Missing API keys
- Invalid parameters
- Network issues
- API rate limits
- Generation failures
- Prompt length violations (max 1500 characters)

## Development

### Running in Development Mode

```bash
npm run dev
```

### Testing the Server

```bash
npm test
```

### Getting the Installation Path

```bash
npm run get-path
```

## API Reference

This server implements the fal-ai/minimax/image-01 API. For detailed API documentation, visit:
- [fal.ai Model Playground](https://fal.ai/models/fal-ai/minimax/image-01)
- [fal.ai API Documentation](https://fal.ai/models/fal-ai/minimax/image-01/api)
- [fal.ai Client Library](https://github.com/fal-ai/fal-js)

## Examples

### Basic Text-to-Image Generation
```json
{
  "prompt": "A majestic dragon soaring through clouds, fantasy art style, detailed scales, dramatic lighting"
}
```

### Photorealistic Portrait
```json
{
  "prompt": "Man dressed in white t shirt, full-body stand front view image, outdoor, Venice beach sign, full-body image, Los Angeles, Fashion photography of 90s, documentary, Film grain, photorealistic",
  "aspect_ratio": "2:3",
  "prompt_optimizer": true
}
```

### Landscape Image with Optimization
```json
{
  "prompt": "A serene mountain landscape at sunset, golden hour lighting, misty valleys, snow-capped peaks, cinematic composition, high resolution nature photography",
  "aspect_ratio": "16:9",
  "prompt_optimizer": true
}
```

### Multiple Images Generation
```json
{
  "prompt": "A cute cartoon cat in different poses, kawaii style, pastel colors, chibi art, adorable expressions",
  "aspect_ratio": "1:1",
  "num_images": 4
}
```

### Ultra-wide Panoramic Scene
```json
{
  "prompt": "A detailed architectural visualization of a futuristic smart city with sustainable technology, flying vehicles, green buildings, advanced infrastructure, panoramic view",
  "aspect_ratio": "21:9",
  "prompt_optimizer": true
}
```

### Queue-based Generation with Webhook
```json
{
  "prompt": "Epic fantasy battle scene with dragons and knights, medieval castle in background, dramatic sky, detailed armor and weapons, cinematic lighting, high fantasy art",
  "aspect_ratio": "16:9",
  "num_images": 3,
  "webhook_url": "https://your-server.com/webhook"
}
```

## Tips for Better Results

1. **Use Detailed Prompts**: Longer, more descriptive prompts generally produce better quality images
2. **Enable Prompt Optimization**: Use `prompt_optimizer: true` for enhanced results
3. **Choose Appropriate Aspect Ratios**: Match the aspect ratio to your intended use case
4. **Be Specific**: Include details about style, lighting, composition, and quality level
5. **Use Style Keywords**: Terms like "photorealistic", "cinematic", "detailed", "high resolution" can improve output

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
- Open an issue on [GitHub](https://github.com/PierrunoYT/fal-minimax-image-01-mcp-server/issues)
- Check the [fal.ai documentation](https://fal.ai/docs)

## Changelog

### v1.0.0
- Initial release with fal-ai/minimax/image-01 API support
- MiniMax (Hailuo AI) Text to Image generation with superior capabilities
- Support for multiple aspect ratios (1:1 to 21:9)
- Prompt optimization for enhanced results (disabled by default)
- Queue management with webhook support
- Local image download functionality
- Support for generating up to 9 images per request
- Comprehensive error handling
- Updated API schema matching latest fal.ai specifications