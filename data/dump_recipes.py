import json
import glob
import os
import sys

# Set encoding to utf-8 for output
sys.stdout.reconfigure(encoding='utf-8')

def load_data(data_dir):
    json_files = glob.glob(os.path.join(data_dir, '*.json'))
    all_recipes = []
    
    print(f"Found {len(json_files)} JSON files.")

    for file_path in json_files:
        file_name = os.path.basename(file_path)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # Build ID to Name mapping for this file
                id_map = {}
                if 'items' in data:
                    for item in data['items']:
                        id_map[item['ID']] = item['Name']
                
                if 'recipes' in data:
                    for recipe in data['recipes']:
                        recipe_name = recipe.get('Name', 'Unknown')
                        
                        inputs = []
                        if 'Items' in recipe and 'ItemCounts' in recipe:
                            for i, item_id in enumerate(recipe['Items']):
                                item_name = id_map.get(item_id, str(item_id))
                                count = recipe['ItemCounts'][i] if i < len(recipe['ItemCounts']) else 1
                                inputs.append(f"{item_name} x{count}")
                        
                        outputs = []
                        if 'Results' in recipe and 'ResultCounts' in recipe:
                            for i, item_id in enumerate(recipe['Results']):
                                item_name = id_map.get(item_id, str(item_id))
                                count = recipe['ResultCounts'][i] if i < len(recipe['ResultCounts']) else 1
                                outputs.append(f"{item_name} x{count}")
                        
                        all_recipes.append({
                            'file': file_name,
                            'name': recipe_name,
                            'inputs': inputs,
                            'outputs': outputs
                        })
                        
        except Exception as e:
            print(f"Error reading {file_name}: {e}")
            
    return all_recipes

def main():
    data_dir = os.path.dirname(os.path.abspath(__file__))
    recipes = load_data(data_dir)
    
    print(f"Total Recipes Found: {len(recipes)}")
    print("-" * 50)
    
    # Print first 20 as sample
    for i, r in enumerate(recipes[:20]):
        print(f"File: {r['file']}")
        print(f"Recipe: {r['name']}")
        print(f"  In:  {', '.join(r['inputs'])}")
        print(f"  Out: {', '.join(r['outputs'])}")
        print("-" * 20)
        
    print(f"... and {len(recipes) - 20} more recipes.")

if __name__ == "__main__":
    main()
