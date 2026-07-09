import json

def get_console_logs():
    path = r"C:\Users\Kiddo\.gemini\antigravity-ide\brain\9453faa9-e10b-40f2-a917-145c2778f7aa\.system_generated\logs\transcript_full.jsonl"
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line)
                # Look for tool outputs
                tool_calls = data.get("tool_calls", [])
                for tc in tool_calls:
                    if tc.get("name") == "browser_subagent":
                        # This is the subagent launch, let's look for console logs inside it
                        pass
                
                # Check if this line is a system response or tool response containing console logs
                content = data.get("content", "")
                if "console" in content.lower() and ("error" in content.lower() or "exception" in content.lower() or "fail" in content.lower()):
                    if len(content) > 100 and "transcript_full" not in content:
                        print(f"Index: {data.get('step_index')}, Source: {data.get('source')}, Type: {data.get('type')}")
                        print(content[:1500])
                        print("-" * 50)
            except Exception as e:
                pass

if __name__ == "__main__":
    get_console_logs()
