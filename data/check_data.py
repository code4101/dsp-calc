import json
import glob
import os
import sys

# Set encoding to utf-8 for output
sys.stdout.reconfigure(encoding='utf-8')

def main():
    data_dir = r'd:\home\chenkunze\slns+\dsp-calc\data'
    json_files = glob.glob(os.path.join(data_dir, '*.json'))
    
    target_name = '电磁矩阵'
    print(f"Checking {target_name}...")
    
    for file_path in json_files:
        try:
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                data = json.load(f)
                
                # Check Items
                if 'items' in data:
                    for item in data['items']:
                        if item.get('Name') == target_name:
                            print(f"Item Found in {os.path.basename(file_path)}: ID={item.get('ID')}, Type={item.get('Type')}")
    
                # Check Recipes with NO inputs
                if 'recipes' in data:
                    for recipe in data['recipes']:
                        if not recipe.get('Items'):
                            print(f"Recipe NO inputs in {os.path.basename(file_path)}: Name={recipe.get('Name')}, Results={recipe.get('Results')}")
                            
        except Exception as e:
            print(f"Error reading {file_path}: {e}")

if __name__ == "__main__":
    main()
