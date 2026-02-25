
/**
 * Sorts a list of item names based on their GridIndex in the game data.
 * Items with smaller GridIndex (top-left in game UI) come first.
 * Items not found in the grid are placed at the end.
 * 
 * @param {string[]} items - List of item names to sort
 * @param {Object} item_grid - Map of item name to grid index (e.g. game_data.item_grid)
 * @returns {string[]} - New sorted array of item names
 */
export function sortItemsByGridIndex(items, item_grid) {
    if (!items || !item_grid) return items || [];
    
    return [...items].sort((a, b) => {
        const indexA = item_grid[a] || 99999;
        const indexB = item_grid[b] || 99999;
        return indexA - indexB;
    });
}
