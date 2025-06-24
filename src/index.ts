#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fal } from "@fal-ai/client";
import { writeFile } from "fs/promises";
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// Check for required environment variable
const FAL_KEY = process.env.FAL_KEY;
let falConfigured = false;

if (!FAL_KEY) {
  console.error('FAL_KEY environment variable is required');
  console.error('Please set your fal.ai API key: export FAL_KEY=your_api_key_here');
  // Server continues running, no process.exit()
} else {
  // Configure fal.ai client
  fal.config({
    credentials: FAL_KEY
  });
  falConfigured = true;
}

// Define types based on fal-ai/minimax/image-01 API documentation
interface MinimaxImageResult {
  images: Array<{
    url: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
  }>;
  seed?: number;
}

// MiniMax aspect ratio enum
type AspectRatioEnum =
  | "1:1"
  | "16:9"
  | "4:3"
  | "3:2"
  | "2:3"
  | "3:4"
  | "9:16"
  | "21:9";

// Download image function
async function downloadImage(url: string, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      // Create images directory if it doesn't exist
      const imagesDir = path.join(process.cwd(), 'images');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      
      const filePath = path.join(imagesDir, filename);
      const file = fs.createWriteStream(filePath);
      
      client.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: HTTP ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve(filePath);
        });
        
        file.on('error', (err) => {
          fs.unlink(filePath, () => {}); // Delete partial file
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Generate safe filename for images
function generateImageFilename(prompt: string, index: number, seed?: number): string {
  const safePrompt = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const seedStr = seed ? `_${seed}` : '';
  return `minimax_${safePrompt}${seedStr}_${index}_${timestamp}.png`;
}

// Create MCP server
const server = new McpServer({
  name: "fal-minimax-server",
  version: "1.0.0",
});

// Tool: Generate images with fal-ai/minimax/image-01
server.tool(
  "minimax_generate",
  {
    description: "Generate high-quality images using fal-ai/minimax/image-01 - Advanced text-to-image generation model with superior capabilities",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The text prompt to generate an image from (max 1500 characters)",
          maxLength: 1500
        },
        aspect_ratio: {
          type: "string",
          enum: ["1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"],
          description: "The aspect ratio of the generated image",
          default: "1:1"
        },
        num_images: {
          type: "integer",
          description: "Number of images to generate",
          default: 1,
          minimum: 1,
          maximum: 9
        },
        prompt_optimizer: {
          type: "boolean",
          description: "Enable prompt optimization for better results"
        },
        sync_mode: {
          type: "boolean",
          description: "If set to true, the function will wait for the image to be generated and uploaded before returning the response",
          default: true
        }
      },
      required: ["prompt"]
    }
  },
  async (args: any) => {
    // Check if fal.ai client is configured
    if (!falConfigured) {
      return {
        content: [{
          type: "text",
          text: "Error: FAL_KEY environment variable is not set. Please configure your fal.ai API key."
        }],
        isError: true
      };
    }

    const {
      prompt,
      aspect_ratio = "1:1",
      num_images = 1,
      prompt_optimizer,
      sync_mode = true
    } = args;
    
    try {
      // Prepare input for fal.ai API
      const input: any = {
        prompt,
        aspect_ratio,
        num_images,
        sync_mode
      };

      // Add optional parameters if provided
      if (prompt_optimizer !== undefined) input.prompt_optimizer = prompt_optimizer;

      console.error(`Generating image with fal-ai/minimax/image-01 - prompt: "${prompt}"`);

      // Call fal.ai minimax/image-01 API
      const result = await fal.subscribe("fal-ai/minimax/image-01", {
        input,
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log: any) => log.message).forEach(console.error);
          }
        },
      });

      const output = result.data as MinimaxImageResult;

      // Download images locally
      console.error("Downloading images locally...");
      const downloadedImages = [];

      for (let i = 0; i < output.images.length; i++) {
        const image = output.images[i];
        const filename = generateImageFilename(prompt, i + 1, output.seed);
        
        try {
          const localPath = await downloadImage(image.url, filename);
          downloadedImages.push({
            url: image.url,
            localPath,
            index: i + 1,
            content_type: image.content_type || 'image/png',
            file_name: image.file_name || filename,
            file_size: image.file_size,
            filename
          });
          console.error(`Downloaded: ${filename}`);
        } catch (downloadError) {
          console.error(`Failed to download image ${i + 1}:`, downloadError);
          // Still add the image info without local path
          downloadedImages.push({
            url: image.url,
            localPath: null,
            index: i + 1,
            content_type: image.content_type || 'image/png',
            file_name: image.file_name || filename,
            file_size: image.file_size,
            filename
          });
        }
      }

      // Format response with download information
      const imageDetails = downloadedImages.map(img => {
        let details = `Image ${img.index}:`;
        if (img.localPath) {
          details += `\n  Local Path: ${img.localPath}`;
        }
        details += `\n  Original URL: ${img.url}`;
        details += `\n  Filename: ${img.filename}`;
        details += `\n  Content Type: ${img.content_type}`;
        if (img.file_size) {
          details += `\n  File Size: ${img.file_size} bytes`;
        }
        return details;
      }).join('\n\n');

      const responseText = `Successfully generated ${downloadedImages.length} image(s) using fal-ai/minimax/image-01:

Prompt: "${prompt}"
Aspect Ratio: ${aspect_ratio}
Number of Images: ${num_images}
${prompt_optimizer !== undefined ? `Prompt Optimizer: ${prompt_optimizer ? 'Enabled' : 'Disabled'}` : ''}
${output.seed ? `Seed: ${output.seed}` : 'Seed: Auto-generated'}
Request ID: ${result.requestId}

Generated Images:
${imageDetails}

${downloadedImages.some(img => img.localPath) ? 'Images have been downloaded to the local \'images\' directory.' : 'Note: Local download failed, but original URLs are available.'}`;

      return {
        content: [
          {
            type: "text",
            text: responseText
          }
        ]
      };

    } catch (error) {
      console.error('Error generating image:', error);
      
      let errorMessage = "Failed to generate image with fal-ai/minimax/image-01.";
      
      if (error instanceof Error) {
        errorMessage += ` Error: ${error.message}`;
      }

      return {
        content: [
          {
            type: "text",
            text: errorMessage
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Generate images using queue method
server.tool(
  "minimax_generate_queue",
  {
    description: "Submit a long-running image generation request to the queue using fal-ai/minimax/image-01",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The text prompt to generate an image from (max 1500 characters)",
          maxLength: 1500
        },
        aspect_ratio: {
          type: "string",
          enum: ["1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"],
          description: "The aspect ratio of the generated image",
          default: "1:1"
        },
        num_images: {
          type: "integer",
          description: "Number of images to generate",
          default: 1,
          minimum: 1,
          maximum: 9
        },
        prompt_optimizer: {
          type: "boolean",
          description: "Enable prompt optimization for better results"
        },
        webhook_url: {
          type: "string",
          description: "Optional webhook URL for result notifications"
        }
      },
      required: ["prompt"]
    }
  },
  async (args: any) => {
    if (!falConfigured) {
      return {
        content: [{
          type: "text",
          text: "Error: FAL_KEY environment variable is not set. Please configure your fal.ai API key."
        }],
        isError: true
      };
    }

    const { webhook_url, ...input } = args;
    
    try {
      console.error(`Submitting queue request for fal-ai/minimax/image-01 - prompt: "${input.prompt}"`);

      const result = await fal.queue.submit("fal-ai/minimax/image-01", {
        input,
        webhookUrl: webhook_url
      });

      return {
        content: [
          {
            type: "text",
            text: `Successfully submitted image generation request to queue.

Request ID: ${result.request_id}
Prompt: "${input.prompt}"
${webhook_url ? `Webhook URL: ${webhook_url}` : 'No webhook configured'}

Use the request ID with minimax_queue_status to check progress or minimax_queue_result to get the final result.`
          }
        ]
      };

    } catch (error) {
      console.error('Error submitting queue request:', error);
      
      let errorMessage = "Failed to submit queue request for fal-ai/minimax/image-01.";
      if (error instanceof Error) {
        errorMessage += ` Error: ${error.message}`;
      }

      return {
        content: [
          {
            type: "text",
            text: errorMessage
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Check queue status
server.tool(
  "minimax_queue_status",
  {
    description: "Check the status of a queued image generation request",
    inputSchema: {
      type: "object",
      properties: {
        request_id: {
          type: "string",
          description: "The request ID from queue submission"
        },
        logs: {
          type: "boolean",
          description: "Include logs in response",
          default: true
        }
      },
      required: ["request_id"]
    }
  },
  async (args: any) => {
    if (!falConfigured) {
      return {
        content: [{
          type: "text",
          text: "Error: FAL_KEY environment variable is not set. Please configure your fal.ai API key."
        }],
        isError: true
      };
    }

    const { request_id, logs = true } = args;
    
    try {
      console.error(`Checking status for request: ${request_id}`);

      const status = await fal.queue.status("fal-ai/minimax/image-01", {
        requestId: request_id,
        logs
      });

      let responseText = `Queue Status for Request ID: ${request_id}

Status: ${status.status}`;

      if (status.response_url) {
        responseText += `\nResponse URL: ${status.response_url}`;
      }

      // Handle logs if available (logs might be in different property depending on status)
      const statusAny = status as any;
      if (statusAny.logs && statusAny.logs.length > 0) {
        responseText += `\n\nLogs:\n${statusAny.logs.map((log: any) => `[${log.timestamp}] ${log.message}`).join('\n')}`;
      }

      return {
        content: [
          {
            type: "text",
            text: responseText
          }
        ]
      };

    } catch (error) {
      console.error('Error checking queue status:', error);
      
      let errorMessage = "Failed to check queue status.";
      if (error instanceof Error) {
        errorMessage += ` Error: ${error.message}`;
      }

      return {
        content: [
          {
            type: "text",
            text: errorMessage
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Get queue result
server.tool(
  "minimax_queue_result",
  {
    description: "Get the result of a completed queued image generation request",
    inputSchema: {
      type: "object",
      properties: {
        request_id: {
          type: "string",
          description: "The request ID from queue submission"
        }
      },
      required: ["request_id"]
    }
  },
  async (args: any) => {
    if (!falConfigured) {
      return {
        content: [{
          type: "text",
          text: "Error: FAL_KEY environment variable is not set. Please configure your fal.ai API key."
        }],
        isError: true
      };
    }

    const { request_id } = args;
    
    try {
      console.error(`Getting result for request: ${request_id}`);

      const result = await fal.queue.result("fal-ai/minimax/image-01", {
        requestId: request_id
      });

      const output = result.data as MinimaxImageResult;

      // Download images locally
      console.error("Downloading images locally...");
      const downloadedImages = [];

      for (let i = 0; i < output.images.length; i++) {
        const image = output.images[i];
        const filename = generateImageFilename(`queue_result_${request_id}`, i + 1, output.seed);
        
        try {
          const localPath = await downloadImage(image.url, filename);
          downloadedImages.push({
            url: image.url,
            localPath,
            index: i + 1,
            content_type: image.content_type || 'image/png',
            file_name: image.file_name || filename,
            file_size: image.file_size,
            filename
          });
          console.error(`Downloaded: ${filename}`);
        } catch (downloadError) {
          console.error(`Failed to download image ${i + 1}:`, downloadError);
          downloadedImages.push({
            url: image.url,
            localPath: null,
            index: i + 1,
            content_type: image.content_type || 'image/png',
            file_name: image.file_name || filename,
            file_size: image.file_size,
            filename
          });
        }
      }

      const imageDetails = downloadedImages.map(img => {
        let details = `Image ${img.index}:`;
        if (img.localPath) {
          details += `\n  Local Path: ${img.localPath}`;
        }
        details += `\n  Original URL: ${img.url}`;
        details += `\n  Filename: ${img.filename}`;
        details += `\n  Content Type: ${img.content_type}`;
        if (img.file_size) {
          details += `\n  File Size: ${img.file_size} bytes`;
        }
        return details;
      }).join('\n\n');

      const responseText = `Queue Result for Request ID: ${request_id}

Successfully completed! Generated ${downloadedImages.length} image(s):

${output.seed ? `Seed: ${output.seed}` : 'Seed: Auto-generated'}

Generated Images:
${imageDetails}

${downloadedImages.some(img => img.localPath) ? 'Images have been downloaded to the local \'images\' directory.' : 'Note: Local download failed, but original URLs are available.'}`;

      return {
        content: [
          {
            type: "text",
            text: responseText
          }
        ]
      };

    } catch (error) {
      console.error('Error getting queue result:', error);
      
      let errorMessage = "Failed to get queue result.";
      if (error instanceof Error) {
        errorMessage += ` Error: ${error.message}`;
      }

      return {
        content: [
          {
            type: "text",
            text: errorMessage
          }
        ],
        isError: true
      };
    }
  }
);

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});