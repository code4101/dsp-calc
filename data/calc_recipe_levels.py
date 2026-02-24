import json
import glob
import os
import sys

# Set encoding to utf-8 for output
sys.stdout.reconfigure(encoding='utf-8')

def load_all_data(data_dir):
    json_files = glob.glob(os.path.join(data_dir, '*.json'))
    all_items = {}
    all_recipes = []
    
    print(f"Loading data from {len(json_files)} files...")

    for file_path in json_files:
        try:
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                data = json.load(f)
                
                # Load Items
                if 'items' in data:
                    for item in data['items']:
                        all_items[item['ID']] = item
                
                # Load Recipes
                if 'recipes' in data:
                    for recipe in data['recipes']:
                        all_recipes.append(recipe)
                        
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            
    return all_items, all_recipes

def calculate_levels(all_items, all_recipes):
    item_levels = {}  # item_id -> level
    recipe_levels = {} # recipe_index (in global list) -> level
    
    # 1. Initialize Level 0 (Raw Materials)
    queue = []
    
    # Explicitly set raw ores to level 0
    # List of known raw material IDs (Vanilla + Common Mods) to be safer
    # Or strict Type check.
    # Based on observation, Type 1 is indeed Raw Material, BUT...
    # Some mods might add "cheat" recipes or "creative" items as Type 1?
    # Actually, the issue found is "Recipe with NO inputs" named "[无中生有]..."
    # These recipes produce advanced items from nothing.
    
    for item_id, item in all_items.items():
        # Type 1 usually means raw resources in DSP data
        if item.get('Type') == 1:
            item_levels[item_id] = 0
            queue.append(item_id)
            
    # Build maps for faster lookup
    item_to_recipes_using_it = {} # item_id -> [recipe_indices]
    recipe_ingredients = {} # recipe_index -> [item_ids]
    recipe_products = {} # recipe_index -> [item_ids]
    
    for idx, recipe in enumerate(all_recipes):
        # Filter out "[无中生有]" recipes or similar cheat recipes
        recipe_name = recipe.get('Name') or ''
        if '[无中生有]' in recipe_name:
            continue

        # Ingredients
        ing_ids = recipe.get('Items', [])
        recipe_ingredients[idx] = ing_ids
        
        for ing_id in ing_ids:
            if ing_id not in item_to_recipes_using_it:
                item_to_recipes_using_it[ing_id] = []
            item_to_recipes_using_it[ing_id].append(idx)
            
        # Products
        prod_ids = recipe.get('Results', [])
        recipe_products[idx] = prod_ids

        # Special case: Recipes with NO inputs (like Orbital Collector collecting Hydrogen/Deuterium/FireIce)
        # These recipes should be considered Level 0 sources if they produce something.
        # BUT we must be careful not to include cheat recipes.
        # Genuine no-input recipes: 
        # - Orbital Collector (Hydrogen, Deuterium, Fire Ice)
        # - Oil Extractor (Crude Oil) - usually treated as building on resource
        # - Water Pump (Water, Sulfuric Acid)
        #
        # If we filtered out [无中生有], remaining no-input recipes should be legit resource gathering.
        
        if not ing_ids and prod_ids:
             recipe_levels[idx] = 0
             for p_id in prod_ids:
                 # Only update if not already set (or set to 0)
                 if p_id not in item_levels:
                     item_levels[p_id] = 0
                     queue.append(p_id)

    # 2. BFS
    # recipe_dependencies tracks how many ingredients are NOT YET leveled for each recipe
    # But actually, we just need to check if a recipe becomes "unlockable" when an item gets a level.
    
    # We need to track the "max level of ingredients" for each recipe dynamically.
    recipe_max_ing_level = {} # recipe_index -> max_level_of_ingredients_seen_so_far
    recipe_ing_satisfied_count = {} # recipe_index -> count of ingredients that have levels
    
    # Initialize recipe tracking
    for idx, recipe in enumerate(all_recipes):
        recipe_max_ing_level[idx] = 0
        recipe_ing_satisfied_count[idx] = 0
        
    processed_recipes = set()
    
    while queue:
        current_item_id = queue.pop(0)
        current_level = item_levels[current_item_id]
        
        # Find recipes that use this item
        if current_item_id in item_to_recipes_using_it:
            for recipe_idx in item_to_recipes_using_it[current_item_id]:
                if recipe_idx in processed_recipes:
                    continue
                
                # Update this recipe's status
                recipe_max_ing_level[recipe_idx] = max(recipe_max_ing_level[recipe_idx], current_level)
                recipe_ing_satisfied_count[recipe_idx] += 1
                
                # Check if all ingredients for this recipe are satisfied
                total_ingredients_needed = len(recipe_ingredients[recipe_idx])
                
                if recipe_ing_satisfied_count[recipe_idx] >= total_ingredients_needed:
                    # Recipe is unlocked!
                    # Recipe Level = Max Ingredient Level + 1
                    # (Unless it's a 0-input recipe, handled above)
                    
                    new_recipe_level = recipe_max_ing_level[recipe_idx] + 1
                    recipe_levels[recipe_idx] = new_recipe_level
                    processed_recipes.add(recipe_idx)
                    
                    # Update products
                    for prod_id in recipe_products[recipe_idx]:
                        # If product doesn't have a level yet, or we found a lower level path?
                        # BFS guarantees finding shortest path (lowest level) first IF edge weights are 1.
                        # Here edge weight is 1 (recipe adds 1 level).
                        # So first time we see a product, it's the optimal level.
                        
                        if prod_id not in item_levels:
                            item_levels[prod_id] = new_recipe_level
                            queue.append(prod_id)

    return recipe_levels

def main():
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)))
    output_path = os.path.join(data_dir, 'recipe_levels.json')
    
    all_items, all_recipes = load_all_data(data_dir)
    recipe_levels = calculate_levels(all_items, all_recipes)
    
    # Build a map of Recipe ID -> Level (The frontend might use ID or Index)
    # The frontend uses index in the big array mostly, but let's see.
    # The `global_state.game_data.recipe_data` seems to be the concatenation of all recipes.
    # Our `all_recipes` is exactly that concatenation order.
    
    # Let's save a simple array of levels, corresponding to the recipe index.
    # Or a map if we want to be safe with IDs.
    # Frontend: `game_data.recipe_data[recipe_index]`
    
    # Let's verify if IDs are unique across files. They should be.
    # But let's export a map of { RecipeID: Level } just to be robust, 
    # AND an array aligned with the loading order if possible.
    
    # Wait, the frontend loads data in a specific order? 
    # The frontend code `import.meta.glob('../icon/*.json')`... no wait, data loading:
    # `src/GameData.jsx` imports JSONs.
    
    # Actually, the frontend loads `Vanilla.json` then others based on mods?
    # It seems to load everything.
    
    # To be safe and easy for frontend integration, let's output:
    # { 
    #   "recipe_levels": { recipe_id: level, ... } 
    # }
    
    output_data = {}
    for idx, level in recipe_levels.items():
        recipe = all_recipes[idx]
        r_id = recipe.get('ID')
        if r_id is not None:
            output_data[r_id] = level
            
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2)
        
    print(f"Calculated levels for {len(output_data)} recipes.")
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    main()
