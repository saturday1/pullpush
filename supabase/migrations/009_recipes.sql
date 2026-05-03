CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own recipes" ON recipes FOR ALL USING (auth.uid() = user_id);

CREATE TABLE recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES food_products(id),
  product_name text NOT NULL,
  quantity_g real NOT NULL,
  protein_g real NOT NULL DEFAULT 0,
  carbs_g real NOT NULL DEFAULT 0,
  fat_g real NOT NULL DEFAULT 0,
  kcal real NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own recipe ingredients" ON recipe_ingredients FOR ALL
  USING (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

-- Link meals to recipes so we can show ingredient breakdown
ALTER TABLE meals ADD COLUMN recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL;
