

function parseThinkSegments(text: string): Array<{ content: string; isThink: boolean }> {
    const regex = /<think>([\s\S]*?)<\/think>/g;
    const segments: Array<{ content: string; isThink: boolean }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
  
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ content: text.slice(lastIndex, match.index), isThink: false });
      }
      segments.push({ content: match[1], isThink: true });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      segments.push({ content: text.slice(lastIndex), isThink: false });
    }
    return segments;
  }