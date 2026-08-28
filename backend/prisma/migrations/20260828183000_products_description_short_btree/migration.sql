-- Índice btree para detecção barata de descrição idêntica (base de produtos).
CREATE INDEX IF NOT EXISTS "products_description_short_btree_idx"
  ON "products" ("description_short");
