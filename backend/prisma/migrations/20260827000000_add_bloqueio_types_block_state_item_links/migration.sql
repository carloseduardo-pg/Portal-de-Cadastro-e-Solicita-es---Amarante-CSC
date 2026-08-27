-- Bloqueio parcial/total, estado de bloqueio na base e links N:N por item/produto

CREATE TYPE "ProductBlockState" AS ENUM ('NONE', 'PARTIAL', 'TOTAL');

ALTER TYPE "RequestType" ADD VALUE 'BLOQUEIO_PARCIAL';
ALTER TYPE "RequestType" ADD VALUE 'BLOQUEIO_TOTAL';

ALTER TABLE "products" ADD COLUMN "block_state" "ProductBlockState" NOT NULL DEFAULT 'NONE';

CREATE TABLE "product_links" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_item_links" (
    "id" UUID NOT NULL,
    "request_item_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "request_item_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_links_product_id_idx" ON "product_links"("product_id");
CREATE INDEX "request_item_links_request_item_id_idx" ON "request_item_links"("request_item_id");

ALTER TABLE "product_links" ADD CONSTRAINT "product_links_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_item_links" ADD CONSTRAINT "request_item_links_request_item_id_fkey" FOREIGN KEY ("request_item_id") REFERENCES "request_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrar product_link legado para tabela de junção
INSERT INTO "product_links" ("id", "product_id", "url", "sort_order")
SELECT gen_random_uuid(), "id", "product_link", 0
FROM "products"
WHERE "product_link" IS NOT NULL AND trim("product_link") <> '';

INSERT INTO "request_item_links" ("id", "request_item_id", "url", "sort_order")
SELECT gen_random_uuid(), "id", "product_link", 0
FROM "request_items"
WHERE "product_link" IS NOT NULL AND trim("product_link") <> '';
