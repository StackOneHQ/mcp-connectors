#!/usr/bin/env python3
"""
Test JSON parsing fix
"""
import json

def test_json_parsing():
    """Test the JSON parsing with markdown code blocks"""
    
    # Simulate the AI response with markdown code blocks
    ai_response = '''```json
{
  "reasoning": "The user is asking for a list of available tools.  No external tools are needed to answer this question; the information is already available within the system.",
  "tool_calls": []
}
```'''
    
    print(f"Original response: {repr(ai_response)}")
    
    # Apply the same cleaning logic as in the AI agent
    cleaned_content = ai_response.strip()
    if cleaned_content.startswith('```json'):
        cleaned_content = cleaned_content[7:]  # Remove ```json
    if cleaned_content.startswith('```'):
        cleaned_content = cleaned_content[3:]  # Remove ```
    if cleaned_content.endswith('```'):
        cleaned_content = cleaned_content[:-3]  # Remove ```
    cleaned_content = cleaned_content.strip()
    
    print(f"Cleaned content: {repr(cleaned_content)}")
    
    # Try to parse
    try:
        result = json.loads(cleaned_content)
        print(f"✅ JSON parsed successfully: {result}")
        return True
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing failed: {e}")
        return False

if __name__ == "__main__":
    test_json_parsing()

