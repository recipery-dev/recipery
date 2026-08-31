/**
 * Best-effort supermarket-aisle grouping for the shopping list, so it reads
 * in roughly store order instead of alphabetically. Same approach as the
 * ingredient density table in convert.ts — a small offline keyword table,
 * not exhaustive, just enough to group the ingredients that show up most.
 */

export type Aisle =
  | "Produce"
  | "Meat & Seafood"
  | "Dairy & Eggs"
  | "Bakery"
  | "Frozen"
  | "Beverages"
  | "Pantry"
  | "Other";

// Display order for the shopping list — roughly the order you'd walk a
// typical grocery store, produce first, pantry staples near the end, and
// unrecognized items last.
export const AISLE_ORDER: Aisle[] = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Frozen",
  "Beverages",
  "Pantry",
  "Other",
];

interface AisleEntry {
  keyword: string;
  aisle: Aisle;
}

const AISLE_TABLE: AisleEntry[] = [
  // Produce
  { keyword: "onion", aisle: "Produce" },
  { keyword: "garlic", aisle: "Produce" },
  { keyword: "tomato paste", aisle: "Pantry" },
  { keyword: "tomato", aisle: "Produce" },
  { keyword: "potato", aisle: "Produce" },
  { keyword: "carrot", aisle: "Produce" },
  { keyword: "celery", aisle: "Produce" },
  { keyword: "lettuce", aisle: "Produce" },
  { keyword: "bell pepper", aisle: "Produce" },
  { keyword: "pepper", aisle: "Produce" },
  { keyword: "lemon", aisle: "Produce" },
  { keyword: "lime", aisle: "Produce" },
  { keyword: "apple", aisle: "Produce" },
  { keyword: "banana", aisle: "Produce" },
  { keyword: "berries", aisle: "Produce" },
  { keyword: "strawberr", aisle: "Produce" },
  { keyword: "avocado", aisle: "Produce" },
  { keyword: "mushroom", aisle: "Produce" },
  { keyword: "cucumber", aisle: "Produce" },
  { keyword: "cilantro", aisle: "Produce" },
  { keyword: "parsley", aisle: "Produce" },
  { keyword: "fresh basil", aisle: "Produce" },
  { keyword: "fresh ginger", aisle: "Produce" },
  { keyword: "ginger", aisle: "Produce" },
  { keyword: "broccoli", aisle: "Produce" },
  { keyword: "zucchini", aisle: "Produce" },

  // Meat & Seafood
  { keyword: "chicken", aisle: "Meat & Seafood" },
  { keyword: "ground beef", aisle: "Meat & Seafood" },
  { keyword: "beef", aisle: "Meat & Seafood" },
  { keyword: "pork", aisle: "Meat & Seafood" },
  { keyword: "bacon", aisle: "Meat & Seafood" },
  { keyword: "sausage", aisle: "Meat & Seafood" },
  { keyword: "turkey", aisle: "Meat & Seafood" },
  { keyword: "ham", aisle: "Meat & Seafood" },
  { keyword: "salmon", aisle: "Meat & Seafood" },
  { keyword: "shrimp", aisle: "Meat & Seafood" },
  { keyword: "fish", aisle: "Meat & Seafood" },
  { keyword: "tuna", aisle: "Meat & Seafood" },

  // Dairy & Eggs
  { keyword: "buttermilk", aisle: "Dairy & Eggs" },
  { keyword: "milk", aisle: "Dairy & Eggs" },
  { keyword: "butter", aisle: "Dairy & Eggs" },
  { keyword: "cheese", aisle: "Dairy & Eggs" },
  { keyword: "yogurt", aisle: "Dairy & Eggs" },
  { keyword: "sour cream", aisle: "Dairy & Eggs" },
  { keyword: "heavy cream", aisle: "Dairy & Eggs" },
  { keyword: "cream", aisle: "Dairy & Eggs" },
  { keyword: "egg", aisle: "Dairy & Eggs" },

  // Bakery
  { keyword: "bread", aisle: "Bakery" },
  { keyword: "bun", aisle: "Bakery" },
  { keyword: "bagel", aisle: "Bakery" },
  { keyword: "tortilla", aisle: "Bakery" },
  { keyword: "dinner roll", aisle: "Bakery" },
  { keyword: "pita", aisle: "Bakery" },

  // Frozen
  { keyword: "frozen", aisle: "Frozen" },
  { keyword: "ice cream", aisle: "Frozen" },

  // Beverages
  { keyword: "juice", aisle: "Beverages" },
  { keyword: "soda", aisle: "Beverages" },
  { keyword: "wine", aisle: "Beverages" },
  { keyword: "beer", aisle: "Beverages" },
  { keyword: "coffee", aisle: "Beverages" },
  { keyword: "tea", aisle: "Beverages" },

  // Pantry
  { keyword: "all-purpose flour", aisle: "Pantry" },
  { keyword: "flour", aisle: "Pantry" },
  { keyword: "brown sugar", aisle: "Pantry" },
  { keyword: "powdered sugar", aisle: "Pantry" },
  { keyword: "sugar", aisle: "Pantry" },
  { keyword: "salt", aisle: "Pantry" },
  { keyword: "olive oil", aisle: "Pantry" },
  { keyword: "vegetable oil", aisle: "Pantry" },
  { keyword: "oil", aisle: "Pantry" },
  { keyword: "vinegar", aisle: "Pantry" },
  { keyword: "rice", aisle: "Pantry" },
  { keyword: "pasta", aisle: "Pantry" },
  { keyword: "noodles", aisle: "Pantry" },
  { keyword: "seasoning", aisle: "Pantry" },
  { keyword: "beans", aisle: "Pantry" },
  { keyword: "cereal", aisle: "Pantry" },
  { keyword: "rolled oats", aisle: "Pantry" },
  { keyword: "oats", aisle: "Pantry" },
  { keyword: "honey", aisle: "Pantry" },
  { keyword: "maple syrup", aisle: "Pantry" },
  { keyword: "syrup", aisle: "Pantry" },
  { keyword: "baking powder", aisle: "Pantry" },
  { keyword: "baking soda", aisle: "Pantry" },
  { keyword: "cocoa powder", aisle: "Pantry" },
  { keyword: "chocolate chips", aisle: "Pantry" },
  { keyword: "chocolate", aisle: "Pantry" },
  { keyword: "vanilla extract", aisle: "Pantry" },
  { keyword: "vanilla", aisle: "Pantry" },
  { keyword: "cinnamon", aisle: "Pantry" },
  { keyword: "spice", aisle: "Pantry" },
  { keyword: "chicken broth", aisle: "Pantry" },
  { keyword: "vegetable broth", aisle: "Pantry" },
  { keyword: "broth", aisle: "Pantry" },
  { keyword: "stock", aisle: "Pantry" },
  { keyword: "soy sauce", aisle: "Pantry" },
  { keyword: "hot sauce", aisle: "Pantry" },
  { keyword: "sauce", aisle: "Pantry" },
  { keyword: "ketchup", aisle: "Pantry" },
  { keyword: "mustard", aisle: "Pantry" },
  { keyword: "mayonnaise", aisle: "Pantry" },
  { keyword: "peanut butter", aisle: "Pantry" },
  { keyword: "walnuts", aisle: "Pantry" },
  { keyword: "almonds", aisle: "Pantry" },
  { keyword: "nuts", aisle: "Pantry" },
  { keyword: "cornstarch", aisle: "Pantry" },
  { keyword: "canned tomatoes", aisle: "Pantry" },
  { keyword: "canned", aisle: "Pantry" },
];

// Longest keyword wins (e.g. "tomato paste" over "tomato") regardless of
// the table's declaration order.
const SORTED_AISLE_TABLE = [...AISLE_TABLE].sort((a, b) => b.keyword.length - a.keyword.length);

export function guessAisle(ingredientName: string): Aisle {
  const lower = ingredientName.toLowerCase();
  const match = SORTED_AISLE_TABLE.find((entry) => lower.includes(entry.keyword));
  return match ? match.aisle : "Other";
}
