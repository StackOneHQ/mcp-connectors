#!/usr/bin/env python3
"""
Disco animation module for the MCP AI Agent CLI
Provides animated text header effects
"""

import math
import os
import sys
import time
import shutil
import asyncio
from typing import Optional

# Optional colorama support for Windows
try:
    import colorama
    colorama.init()
except Exception:
    pass

ESC = "\x1b["
CLEAR = ESC + "2J"
CLEAR_LINE = ESC + "2K"
HIDE_CURSOR = ESC + "?25l"
SHOW_CURSOR = ESC + "?25h"
RESET = ESC + "0m"
UP = ESC + "1A"
DOWN = ESC + "1B"

# Disco colors
RED = ESC + "38;5;196m"
ORANGE = ESC + "38;5;202m"
YELLOW = ESC + "38;5;226m"
GREEN = ESC + "38;5;82m"
CYAN = ESC + "38;5;45m"
PURPLE = ESC + "38;5;99m"
PINK = ESC + "38;5;201m"
WHITE = ESC + "38;5;255m"
GOLD = ESC + "38;5;220m"

PALETTE = [RED, ORANGE, YELLOW, GREEN, CYAN, PURPLE, PINK, WHITE, GOLD]

class DiscoHeader:
    """Cool text header animation"""
    
    def __init__(self, message: str = "AI is thinking..."):
        self.message = message
        self.running = False
        
        # ASCII art text
        self.ascii_art = [
            "                                                 ",
            "         88 88                                   ",
            "         88 \"\"                                   ",
            "         88                                      ",
            " ,adPPYb,88 88 ,adPPYba,  ,adPPYba,  ,adPPYba,   ",
            "a8\"    `Y88 88 I8[    \"\" a8\"     \"\" a8\"     \"8a  ",
            "8b       88 88  `\"Y8ba,  8b         8b       d8  ",
            "\"8a,   ,d88 88 aa    ]8I \"8a,   ,aa \"8a,   ,a8\"  ",
            " `\"8bbdP\"Y8 88 `\"YbbdP\"'  `\"Ybbd8\"'  `\"YbbdP\"'   "
        ]
        
    def clear_screen(self):
        """Clear the entire screen"""
        sys.stdout.write(CLEAR + ESC + "H")
        sys.stdout.flush()
    
    def clear_lines(self, lines: int):
        """Clear specified number of lines"""
        for _ in range(lines):
            sys.stdout.write(UP + CLEAR_LINE)
        sys.stdout.flush()
    
    def get_terminal_size(self):
        """Get terminal dimensions"""
        try:
            cols, rows = shutil.get_terminal_size()
            return cols, rows
        except Exception:
            return 80, 24
    
    def create_spotlights(self, cols: int, t: float) -> list:
        """Create moving spotlights"""
        lines = []
        height = 6
        
        for y in range(height):
            line = ""
            for x in range(cols):
                # Create multiple moving spotlights
                spotlight1 = math.sin(t * 0.8 + x * 0.1) * 0.5 + 0.5
                spotlight2 = math.sin(t * 1.2 + x * 0.15 + y * 0.2) * 0.5 + 0.5
                spotlight3 = math.sin(t * 0.6 + x * 0.08 - y * 0.1) * 0.5 + 0.5
                
                # Combine spotlights
                intensity = (spotlight1 + spotlight2 + spotlight3) / 3
                
                if intensity > 0.7:
                    color = PALETTE[int(t * 3) % len(PALETTE)]
                    line += color + "✦" + RESET
                elif intensity > 0.4:
                    color = PALETTE[(int(t * 3) + 1) % len(PALETTE)]
                    line += color + "✧" + RESET
                elif intensity > 0.2:
                    color = PALETTE[(int(t * 3) + 2) % len(PALETTE)]
                    line += color + "·" + RESET
                else:
                    line += " "
            
            lines.append(line)
        
        return lines
    
    def create_colored_ascii_art(self, t: float) -> list:
        """Create colored ASCII art with animation"""
        colored_lines = []
        
        for i, line in enumerate(self.ascii_art):
            colored_line = ""
            for j, char in enumerate(line):
                if char != " ":
                    # Create wave effect
                    wave = math.sin(t * 2 + i * 0.3 + j * 0.1)
                    color_index = int((t * 2 + i + j * 0.2) % len(PALETTE))
                    color = PALETTE[color_index]
                    colored_line += color + char + RESET
                else:
                    colored_line += char
            
            colored_lines.append(colored_line)
        
        return colored_lines
    
    def create_message(self, cols: int, t: float) -> str:
        """Create animated message"""
        # Center the message
        padding = (cols - len(self.message)) // 2
        message_line = " " * padding + self.message
        
        # Add some animation to the message
        color = PALETTE[int(t * 4) % len(PALETTE)]
        return color + message_line + RESET
    
    async def animate_header(self, duration: Optional[float] = None):
        """Animate the text header"""
        cols, rows = self.get_terminal_size()
        
        # Hide cursor
        sys.stdout.write(HIDE_CURSOR)
        self.running = True
        
        try:
            t0 = time.time()
            while self.running:
                t = time.time() - t0
                
                # Check duration
                if duration and t >= duration:
                    break
                
                # Clear screen
                self.clear_screen()
                
                # Create spotlights
                spotlight_lines = self.create_spotlights(cols, t)
                
                # Create colored ASCII art
                ascii_lines = self.create_colored_ascii_art(t)
                
                # Create animated message
                message_line = self.create_message(cols, t)
                
                # Combine everything
                all_lines = []
                
                # Add some spacing at top
                all_lines.extend([""] * 2)
                
                # Add spotlights
                all_lines.extend(spotlight_lines)
                
                # Add ASCII art
                all_lines.extend(ascii_lines)
                
                # Add message
                all_lines.append("")
                all_lines.append(message_line)
                all_lines.append("")
                
                # Add footer
                footer = " " * ((cols - 20) // 2) + "🎵 Press Ctrl-C to stop 🎵"
                all_lines.append(footer)
                
                # Print everything
                print("\n".join(all_lines))
                
                # Frame rate
                await asyncio.sleep(0.1)
                
        except KeyboardInterrupt:
            pass
        finally:
            self.running = False
            # Clear screen and show cursor
            self.clear_screen()
            sys.stdout.write(SHOW_CURSOR + RESET)
            sys.stdout.flush()
    
    def stop(self):
        """Stop the animation"""
        self.running = False
    
    async def run_with_context(self, duration: Optional[float] = None):
        """Run animation with proper context management"""
        await self.animate_header(duration)


class DiscoSpinner:
    """Simple disco spinner for quick operations"""
    
    def __init__(self, message: str = "Processing..."):
        self.message = message
        self.running = False
    
    def get_terminal_size(self):
        """Get terminal dimensions"""
        try:
            cols, rows = shutil.get_terminal_size()
            return cols, rows
        except Exception:
            return 80, 24
    
    async def spin(self, duration: Optional[float] = None):
        """Show disco spinner"""
        cols, rows = self.get_terminal_size()
        self.running = True
        t0 = time.time()
        
        try:
            while self.running:
                t = time.time() - t0
                
                if duration and t >= duration:
                    break
                
                # Create spinning disco effect
                angle = t * 3
                color = PALETTE[int(t * 2) % len(PALETTE)]
                
                # Clear line and show spinner
                sys.stdout.write(f"\r{CLEAR_LINE}")
                sys.stdout.write(f"{color}🎵 {self.message} 🎵{RESET}")
                sys.stdout.flush()
                
                await asyncio.sleep(0.1)
                
        except KeyboardInterrupt:
            pass
        finally:
            self.running = False
            sys.stdout.write(f"\r{CLEAR_LINE}")
            sys.stdout.flush()
    
    def stop(self):
        """Stop the spinner"""
        self.running = False


# Convenience functions
async def show_disco_header(message: str = "AI is thinking...", duration: Optional[float] = None):
    """Show disco header animation"""
    disco = DiscoHeader(message)
    await disco.run_with_context(duration)


async def show_disco_spinner(message: str = "Processing...", duration: Optional[float] = None):
    """Show disco spinner"""
    spinner = DiscoSpinner(message)
    await spinner.spin(duration)


if __name__ == "__main__":
    # Test the animation
    async def test():
        print("Testing text header animation...")
        await show_disco_header("🎵 Testing ASCII art! 🎵", 5.0)
        print("Animation complete!")
    
    asyncio.run(test())
