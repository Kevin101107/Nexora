import json

def get_logs():
    path = r"C:\Users\Kiddo\.gemini\antigravity-ide\brain\9453faa9-e10b-40f2-a917-145c2778f7aa\.system_generated\logs\transcript_full.jsonl"
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        if "capture_browser_console_logs" in line:
            print(f"--- MATCH AT LINE {i} ---")
            # Print this line and the next line (which usually contains the tool response)
            try:
                data = json.loads(line)
                print("Line JSON type:", data.get("type"))
                print(json.dumps(data, indent=2)[:1000])
            except Exception as e:
                print("Error parsing line:", e)
                
            if i + 1 < len(lines):
                print("--- NEXT LINE ---")
                try:
                    next_data = json.loads(lines[i+1])
                    print("Next Line type:", next_data.get("type"))
                    content = next_data.get("content", "")
                    print(content[:2000] if content else "No content")
                except Exception as e:
                    print("Error parsing next line:", e)
            print("="*60)

if __name__ == "__main__":
    get_logs()
