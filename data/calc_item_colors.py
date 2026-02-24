import os
import json
from PIL import Image
import glob

def get_average_color(image):
    """
    Calculate the average color of an image, considering alpha channel.
    Returns a hex string #RRGGBB.
    """
    # Convert to RGBA if not already
    img = image.convert('RGBA')
    # Resize to 1x1 to get average color using interpolation
    # This is a fast approximation
    img = img.resize((1, 1), Image.Resampling.BICUBIC)
    color = img.getpixel((0, 0))
    
    # color is (r, g, b, a)
    r, g, b, a = color
    
    # If it's fully transparent, return a default or None?
    # But usually we want the color of the visible pixels.
    # If we resize to 1x1 with alpha, the resulting color is premultiplied/blended.
    
    # Let's try a different approach for better accuracy on non-transparent pixels:
    # Iterate pixels? No, too slow.
    # histogram?
    
    # Re-reading the image for better average of NON-TRANSPARENT pixels
    # Resize method might blend transparent pixels (0,0,0,0) with colored ones, darkening the result.
    
    # Better approach:
    # Scale down to a small size like 16x16 to reduce pixel count
    small_img = image.resize((16, 16))
    pixels = list(small_img.getdata())
    
    r_total = 0
    g_total = 0
    b_total = 0
    count = 0
    
    for r, g, b, a in pixels:
        if a > 50: # Only consider pixels with some opacity
            r_total += r
            g_total += g
            b_total += b
            count += 1
            
    if count == 0:
        return "#888888" # Fallback gray
        
    return "#{:02x}{:02x}{:02x}".format(
        int(r_total / count),
        int(g_total / count),
        int(b_total / count)
    )

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir) # data/ -> root
    
    icon_dir = os.path.join(project_root, 'icon')
    data_dir = os.path.join(project_root, 'data')
    
    # 1. Load all Icon definitions and calculate colors
    # Map: IconName -> ColorHex
    icon_colors = {}
    
    # Find all icon json files
    icon_json_files = glob.glob(os.path.join(icon_dir, '*.json'))
    
    for json_file in icon_json_files:
        base_name = os.path.splitext(os.path.basename(json_file))[0]
        png_file = os.path.join(icon_dir, base_name + '.png')
        
        if not os.path.exists(png_file):
            print(f"Warning: Image file not found for {json_file}")
            continue
            
        print(f"Processing icons from {base_name}...")
        
        try:
            with open(json_file, 'r', encoding='utf-8-sig') as f:
                icon_defs = json.load(f)
                
            sprite_sheet = Image.open(png_file)
            
            for icon_name, coords in icon_defs.items():
                x = coords.get('x')
                y = coords.get('y')
                w = coords.get('width')
                h = coords.get('height')
                
                if x is not None and y is not None and w and h:
                    icon_img = sprite_sheet.crop((x, y, x + w, y + h))
                    color = get_average_color(icon_img)
                    icon_colors[icon_name] = color
                    
        except Exception as e:
            print(f"Error processing {json_file}: {e}")

    # 2. Load Data files to map Item Name -> IconName
    # Map: ItemName -> ColorHex
    item_colors = {}
    
    data_json_files = glob.glob(os.path.join(data_dir, '*.json'))
    
    for json_file in data_json_files:
        filename = os.path.basename(json_file)
        if filename == 'recipe_levels.json':
            continue
            
        print(f"Mapping items from {filename}...")
        
        try:
            with open(json_file, 'r', encoding='utf-8-sig') as f:
                data = json.load(f)
            
            items_to_process = []
            if 'recipes' in data:
                items_to_process.extend(data['recipes'])
            if 'items' in data:
                items_to_process.extend(data['items'])
                
            for item in items_to_process:
                item_name = item.get('Name')
                icon_name = item.get('IconName')
                
                if item_name and icon_name:
                    if icon_name in icon_colors:
                        item_colors[item_name] = icon_colors[icon_name]
            
        except Exception as e:
            print(f"Error processing {json_file}: {e}")
            
    # 3. Output the result
    output_file = os.path.join(project_root, 'src', 'data', 'item_colors.json')
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(item_colors, f, indent=2, ensure_ascii=False)
        
    print(f"Done. Generated colors for {len(item_colors)} items.")
    print(f"Saved to {output_file}")
    
    # Validation
    test_items = ["氢", "重氢", "精炼油", "水", "原油"]
    print("\nValidation:")
    for item in test_items:
        print(f"{item}: {item_colors.get(item, 'NOT FOUND')}")

if __name__ == "__main__":
    main()
