# Self-Improving Memory System — Maine Dispensary Guide

> Kernel + Hot Memory system for learning from corrections and self-reflection.
> Location: `C:\Users\Steve\.agents\skills\self-improving\`

## Triggers (Automatic)

1. **On correction:** User says "No", "Actually", "Stop", "Remember" → Log to `corrections.md`
2. **After sprint:** Multi-step task complete → Self-reflect → Log to `reflections.md`
3. **Pattern 3x:** Same lesson repeated → Promote to `memory.md` or ask to confirm

## Self-Reflection After Every Sprint

After completing work, evaluate:
1. Did it meet expectations?
2. What could be better?
3. Is this a pattern?

## Memory Files

| File | Purpose | Size |
|------|---------|------|
| memory.md | HOT: Active rules | ≤50 lines |
| corrections.md | Explicit corrections + lessons | Append only |
| reflections.md | Self-reflection log | Append only |
| heartbeat-state.md | Sprint state tracker | Current |
| projects/maine-dispensary-guide.md | Project patterns | WARM |

## Quick Commands

- "What have you learned?" → Show corrections.md
- "Show my patterns" → Show memory.md
- "What patterns from [project]?" → Load projects/maine-dispensary-guide.md
