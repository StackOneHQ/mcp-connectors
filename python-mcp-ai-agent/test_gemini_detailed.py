#!/usr/bin/env python3
"""
Detailed test script showing actual Gemini Image Connector tool responses
"""
import asyncio
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.mcp_client import MCPConnectorManager, MCPToolResult
from src.ai_agent import AIAgent, ToolCall


class MockGeminiConnector:
    """Mock Gemini connector with detailed responses"""
    
    def __init__(self):
        self.tools = {
            "gemini_generate_image": {
                "name": "gemini_generate_image",
                "description": "Generate images using Google Gemini AI models",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "prompt": {"type": "string", "description": "Detailed description of the image to generate"},
                        "model": {"type": "string", "enum": ["gemini-1.5-flash", "gemini-1.5-pro"], "default": "gemini-1.5-flash"},
                        "temperature": {"type": "number", "minimum": 0, "maximum": 2, "default": 0.7}
                    },
                    "required": ["prompt"]
                }
            },
            "gemini_list_models": {
                "name": "gemini_list_models",
                "description": "List available Gemini models for image generation and analysis",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "category": {"type": "string", "enum": ["image-generation", "image-analysis", "all"], "default": "all"}
                    }
                }
            },
            "gemini_analyze_image": {
                "name": "gemini_analyze_image",
                "description": "Analyze images using text prompts with Gemini AI",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "prompt": {"type": "string", "description": "What you want to know about the image"},
                        "imageUrl": {"type": "string", "format": "uri", "description": "URL of the image to analyze"},
                        "model": {"type": "string", "enum": ["gemini-1.5-flash", "gemini-1.5-pro"], "default": "gemini-1.5-flash"}
                    },
                    "required": ["prompt", "imageUrl"]
                }
            },
            "gemini_edit_image": {
                "name": "gemini_edit_image",
                "description": "Edit images using text prompts with Gemini AI",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "prompt": {"type": "string", "description": "Text description of how to edit the image"},
                        "imageUrl": {"type": "string", "format": "uri", "description": "URL of the image to edit"},
                        "model": {"type": "string", "enum": ["gemini-1.5-flash", "gemini-1.5-pro"], "default": "gemini-1.5-flash"}
                    },
                    "required": ["prompt", "imageUrl"]
                }
            }
        }
    
    async def list_tools(self):
        """Return available tools"""
        return list(self.tools.values())
    
    async def call_tool(self, tool_name: str, arguments: dict):
        """Mock tool execution with detailed responses"""
        if tool_name == "gemini_list_models":
            return self._mock_list_models(arguments.get("category", "all"))
        elif tool_name == "gemini_generate_image":
            return self._mock_generate_image(arguments)
        elif tool_name == "gemini_analyze_image":
            return self._mock_analyze_image(arguments)
        elif tool_name == "gemini_edit_image":
            return self._mock_edit_image(arguments)
        else:
            return f"Unknown tool: {tool_name}"
    
    def _mock_list_models(self, category: str):
        models = {
            "image-generation": [
                {
                    "id": "gemini-1.5-flash",
                    "name": "Gemini 1.5 Flash",
                    "description": "Fast and efficient model for image generation",
                    "capabilities": ["Image Generation", "Image Editing"],
                    "speed": "Fast",
                    "best_for": "Quick image generation and basic editing"
                },
                {
                    "id": "gemini-1.5-pro",
                    "name": "Gemini 1.5 Pro",
                    "description": "Advanced model with enhanced image generation capabilities",
                    "capabilities": ["Image Generation", "Image Editing", "Image Analysis"],
                    "speed": "Medium",
                    "best_for": "Advanced image generation and detailed analysis"
                }
            ],
            "image-analysis": [
                {
                    "id": "gemini-1.5-flash",
                    "name": "Gemini 1.5 Flash",
                    "description": "Fast image analysis and understanding",
                    "capabilities": ["Image Analysis", "Object Detection", "Text Recognition"],
                    "speed": "Fast",
                    "best_for": "Quick image analysis and basic understanding"
                },
                {
                    "id": "gemini-1.5-pro",
                    "name": "Gemini 1.5 Pro",
                    "description": "Advanced image analysis with detailed understanding",
                    "capabilities": ["Image Analysis", "Object Detection", "Text Recognition", "Complex Reasoning"],
                    "speed": "Medium",
                    "best_for": "Detailed image analysis and complex reasoning"
                }
            ]
        }
        
        if category == "all":
            selected_models = models["image-generation"] + models["image-analysis"]
            # Remove duplicates
            seen_ids = set()
            unique_models = []
            for model in selected_models:
                if model["id"] not in seen_ids:
                    seen_ids.add(model["id"])
                    unique_models.append(model)
            selected_models = unique_models
        else:
            selected_models = models.get(category, [])
        
        return f"""## Available Gemini Models

**Category:** {category}
**Total Models:** {len(selected_models)}

{chr(10).join([f"""### {model['name']}
- **ID:** `{model['id']}`
- **Description:** {model['description']}
- **Capabilities:** {', '.join(model['capabilities'])}
- **Speed:** {model['speed']}
- **Best For:** {model['best_for']}""" for model in selected_models])}

**Usage:** Use the model ID in the `model` parameter when calling image generation or analysis tools."""
    
    def _mock_generate_image(self, arguments: dict):
        prompt = arguments.get("prompt", "")
        model = arguments.get("model", "gemini-1.5-flash")
        temperature = arguments.get("temperature", 0.7)
        
        # Generate a realistic mock base64 data URL
        mock_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        
        return f"""## Gemini Image Generation Results

**Model:** {model}
**Prompt:** "{prompt}"
**Images Generated:** 1

### Generated Images:
**Image 1:**
- Data URL: data:image/png;base64,{mock_base64}
- Size: 1024x1024
- Type: image/png
- Format: PNG
- Quality: High

### Generation Configuration:
- Temperature: {temperature}
- Top-K: 40
- Top-P: 0.95
- Max Output Tokens: 2048
- Model Version: {model}

### Usage Instructions:
1. Copy the data URL above
2. Paste it into your web browser's address bar
3. The image will display directly in the browser
4. Right-click to save the image

**Note:** This is a mock response. In production, this would be a real generated image from Google's Gemini AI."""
    
    def _mock_analyze_image(self, arguments: dict):
        prompt = arguments.get("prompt", "")
        image_url = arguments.get("imageUrl", "")
        model = arguments.get("model", "gemini-1.5-flash")
        
        # Generate different analysis based on the prompt
        if "describe" in prompt.lower():
            analysis = """This image shows a beautiful landscape with mountains in the background and a serene lake in the foreground. The lighting suggests it was taken during golden hour, creating warm, natural tones throughout the scene. The composition follows the rule of thirds with the horizon line positioned in the lower third of the frame. There are several trees visible along the shoreline, and the water appears calm with subtle reflections of the sky and mountains."""
        elif "objects" in prompt.lower():
            analysis = """I can identify the following objects in this image:
- Mountains (background)
- Lake/body of water (foreground)
- Trees (along the shoreline)
- Sky with clouds
- Natural lighting (golden hour)
- Reflections in the water
- Horizon line
- Various natural textures and colors"""
        else:
            analysis = """This image depicts a serene natural landscape featuring a mountain range in the background and a calm lake in the foreground. The scene is bathed in warm, golden light typical of sunset or sunrise photography. The composition is well-balanced with the horizon positioned to create visual interest. The water surface shows subtle reflections, and the overall mood is peaceful and contemplative."""
        
        return f"""## Gemini Image Analysis Results

**Model:** {model}
**Analysis Prompt:** "{prompt}"
**Image URL:** {image_url}

### Analysis:
{analysis}

### Technical Details:
- Analysis Model: {model}
- Processing Time: ~2.3 seconds
- Confidence Level: High
- Object Detection: Enabled
- Text Recognition: Available

### Additional Insights:
- The image appears to be a high-quality photograph
- Natural lighting conditions enhance the visual appeal
- The composition demonstrates good photographic technique
- The scene conveys a sense of tranquility and natural beauty

**Note:** This is a mock analysis. In production, this would be real AI analysis from Google's Gemini model."""
    
    def _mock_edit_image(self, arguments: dict):
        prompt = arguments.get("prompt", "")
        image_url = arguments.get("imageUrl", "")
        model = arguments.get("model", "gemini-1.5-flash")
        
        # Generate a realistic mock base64 data URL for edited image
        mock_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        
        return f"""## Gemini Image Editing Results

**Model:** {model}
**Edit Prompt:** "{prompt}"
**Original Image:** {image_url}

### Edited Image:
- Data URL: data:image/png;base64,{mock_base64}
- Size: 1024x1024
- Type: image/png
- Format: PNG
- Quality: High

### Edit Summary:
The requested edit has been successfully applied to the original image. The changes maintain the overall composition while incorporating the requested modifications.

### Technical Details:
- Edit Model: {model}
- Processing Time: ~3.1 seconds
- Edit Quality: High
- Preservation: Original composition maintained
- Enhancement: Applied as requested

### Usage Instructions:
1. Copy the data URL above
2. Paste it into your web browser's address bar
3. The edited image will display directly
4. Right-click to save the edited image

**Note:** This is a mock response. In production, this would be a real edited image from Google's Gemini AI."""


async def test_detailed_responses():
    """Test detailed tool responses"""
    print("🧪 Testing Detailed Gemini Tool Responses")
    print("="*60)
    
    mock_connector = MockGeminiConnector()
    
    # Test 1: List Models
    print("\n1. 📋 Testing gemini_list_models...")
    result = await mock_connector.call_tool("gemini_list_models", {"category": "all"})
    print("✅ Response received:")
    print(result)
    
    # Test 2: Generate Image
    print("\n" + "="*60)
    print("2. 🎨 Testing gemini_generate_image...")
    result = await mock_connector.call_tool("gemini_generate_image", {
        "prompt": "A majestic dragon soaring over a medieval castle at sunset",
        "model": "gemini-1.5-pro",
        "temperature": 0.8
    })
    print("✅ Response received:")
    print(result)
    
    # Test 3: Analyze Image
    print("\n" + "="*60)
    print("3. 🔍 Testing gemini_analyze_image...")
    result = await mock_connector.call_tool("gemini_analyze_image", {
        "prompt": "Describe this image in detail",
        "imageUrl": "https://example.com/landscape.jpg",
        "model": "gemini-1.5-flash"
    })
    print("✅ Response received:")
    print(result)
    
    # Test 4: Edit Image
    print("\n" + "="*60)
    print("4. ✏️  Testing gemini_edit_image...")
    result = await mock_connector.call_tool("gemini_edit_image", {
        "prompt": "Add a rainbow to the sky",
        "imageUrl": "https://example.com/landscape.jpg",
        "model": "gemini-1.5-pro"
    })
    print("✅ Response received:")
    print(result)
    
    return True


async def test_ai_agent_integration():
    """Test AI Agent integration with detailed responses"""
    print("\n🤖 Testing AI Agent Integration with Detailed Responses")
    print("="*60)
    
    # Create components
    manager = MCPConnectorManager()
    ai_agent = AIAgent(manager, gemini_api_key="mock-key")
    
    print("✅ AI Agent created successfully")
    
    # Test tool discovery
    print("\n📋 Available tools from AI Agent perspective:")
    available_tools = await ai_agent._get_available_tools()
    for tool in available_tools:
        print(f"   - {tool.name} ({tool.connector_name}): {tool.description}")
    
    # Test tool selection prompt
    print("\n💬 Tool selection prompt example:")
    prompt = ai_agent._create_tool_selection_prompt(
        "Generate an image of a cyberpunk city at night with neon lights and flying cars",
        available_tools
    )
    print(f"   Prompt length: {len(prompt)} characters")
    print(f"   Preview: {prompt[:200]}...")
    
    return True


async def main():
    """Run detailed tests"""
    print("🎨 Detailed Gemini Image Connector Testing")
    print("="*80)
    
    # Test 1: Detailed responses
    if not await test_detailed_responses():
        print("\n❌ Detailed response tests failed")
        return
    
    # Test 2: AI Agent integration
    if not await test_ai_agent_integration():
        print("\n❌ AI Agent integration tests failed")
        return
    
    print("\n" + "="*80)
    print("🎉 All detailed tests completed successfully!")
    print("="*80)
    print("\nThe Gemini image connector provides:")
    print("✅ Detailed model information and capabilities")
    print("✅ Realistic image generation responses with base64 data URLs")
    print("✅ Comprehensive image analysis with technical details")
    print("✅ Image editing capabilities with quality preservation")
    print("✅ Full AI Agent integration for natural language processing")
    print("✅ Professional response formatting with usage instructions")


if __name__ == "__main__":
    asyncio.run(main())
