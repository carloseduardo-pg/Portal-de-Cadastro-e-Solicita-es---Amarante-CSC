-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('INCLUSAO', 'ALTERACAO');

-- CreateEnum
CREATE TYPE "RequestState" AS ENUM ('RASCUNHO', 'FORMULARIO', 'APROVADOR', 'APROVADO', 'REPROVADO', 'RETORNO_SOLICITANTE', 'ERRO_INTEGRACAO', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "ProductSource" AS ENUM ('NATIONAL', 'FOREIGN');

-- CreateEnum
CREATE TYPE "SupplierOriginBase" AS ENUM ('SEMPLICE', 'CM');

-- CreateEnum
CREATE TYPE "SupplierRequestState" AS ENUM ('RASCUNHO', 'PENDENTE', 'APROVADOR', 'APROVADO', 'REPROVADO', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SLA_VENCENDO', 'DEVOLVIDA', 'APROVADA', 'ERRO_INTEGRACAO', 'GERAL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "hotel_id" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" UUID NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "code" VARCHAR(1) NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subgroups" (
    "id" UUID NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "group_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subgroups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" UUID NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "subgroup_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measure_units" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "measure_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "description_short" TEXT NOT NULL,
    "description_long" TEXT,
    "family_id" UUID NOT NULL,
    "measure_unit_id" UUID NOT NULL,
    "source" "ProductSource" NOT NULL DEFAULT 'NATIONAL',
    "fixed_asset" BOOLEAN NOT NULL DEFAULT false,
    "unified_code" TEXT,
    "legacy_code" TEXT,
    "sap_code" TEXT,
    "ncm_code" TEXT,
    "ncm_confirmed_by" UUID,
    "ncm_confirmed_at" TIMESTAMPTZ,
    "service_type" TEXT,
    "service_type_code" TEXT,
    "law_116" TEXT,
    "product_link" TEXT,
    "notes" TEXT,
    "item_value" DECIMAL(14,2),
    "purchase_qty_total" DECIMAL(14,3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_hotels" (
    "product_id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "cost_center_id" UUID,

    CONSTRAINT "product_hotels_pkey" PRIMARY KEY ("product_id","hotel_id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "examples" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_values" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_attribute_id" UUID NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "type" "RequestType" NOT NULL DEFAULT 'INCLUSAO',
    "state" "RequestState" NOT NULL DEFAULT 'RASCUNHO',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_items" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "product_id" UUID,
    "description_short" TEXT NOT NULL,
    "description_long" TEXT,
    "ncm_code" TEXT,
    "ncm_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_stages" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "stage" TEXT NOT NULL,
    "user_id" UUID,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,

    CONSTRAINT "request_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ncm_suggestions" (
    "id" UUID NOT NULL,
    "request_item_id" UUID NOT NULL,
    "ncm" TEXT NOT NULL,
    "score" DECIMAL(5,4) NOT NULL,
    "source_product_id" UUID,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ncm_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "document" TEXT NOT NULL,
    "corporate_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "cnae" TEXT,
    "state_registration" TEXT,
    "city_registration" TEXT,
    "tax_regime" TEXT,
    "address_street" TEXT,
    "address_number" TEXT,
    "address_city" TEXT,
    "address_state" VARCHAR(2),
    "origin_base" "SupplierOriginBase" NOT NULL DEFAULT 'SEMPLICE',
    "registration_complete" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_requests" (
    "id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "supplier_id" UUID,
    "document" TEXT NOT NULL,
    "state" "SupplierRequestState" NOT NULL DEFAULT 'RASCUNHO',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,

    CONSTRAINT "supplier_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_calendar" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "is_business_day" BOOLEAN NOT NULL DEFAULT true,
    "holiday_name" TEXT,

    CONSTRAINT "business_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GERAL',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link_url" TEXT,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tabela" TEXT NOT NULL,
    "registro_id" TEXT,
    "operacao" TEXT NOT NULL,
    "dados_antes" JSONB,
    "dados_depois" JSONB,
    "usuario_db" TEXT NOT NULL DEFAULT CURRENT_USER,
    "app_usuario" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "hotels_code_key" ON "hotels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_hotel_id_code_key" ON "warehouses"("hotel_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "groups_code_key" ON "groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "subgroups_code_key" ON "subgroups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "families_code_key" ON "families"("code");

-- CreateIndex
CREATE UNIQUE INDEX "measure_units_code_key" ON "measure_units"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_hotel_id_code_key" ON "cost_centers"("hotel_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "products_unified_code_key" ON "products"("unified_code");

-- CreateIndex
CREATE INDEX "products_description_short_idx" ON "products"("description_short");

-- CreateIndex
CREATE UNIQUE INDEX "product_attribute_values_product_id_product_attribute_id_key" ON "product_attribute_values"("product_id", "product_attribute_id");

-- CreateIndex
CREATE INDEX "requests_state_idx" ON "requests"("state");

-- CreateIndex
CREATE INDEX "requests_hotel_id_idx" ON "requests"("hotel_id");

-- CreateIndex
CREATE INDEX "request_items_request_id_idx" ON "request_items"("request_id");

-- CreateIndex
CREATE INDEX "request_stages_request_id_idx" ON "request_stages"("request_id");

-- CreateIndex
CREATE INDEX "ncm_suggestions_request_item_id_idx" ON "ncm_suggestions"("request_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_document_key" ON "suppliers"("document");

-- CreateIndex
CREATE INDEX "supplier_requests_state_idx" ON "supplier_requests"("state");

-- CreateIndex
CREATE UNIQUE INDEX "business_calendar_date_key" ON "business_calendar"("date");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "audit_log_tabela_criado_idx" ON "audit_log"("tabela", "criado_em" DESC);

-- CreateIndex
CREATE INDEX "audit_log_registro_idx" ON "audit_log"("registro_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subgroups" ADD CONSTRAINT "subgroups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_subgroup_id_fkey" FOREIGN KEY ("subgroup_id") REFERENCES "subgroups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_measure_unit_id_fkey" FOREIGN KEY ("measure_unit_id") REFERENCES "measure_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_ncm_confirmed_by_fkey" FOREIGN KEY ("ncm_confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_hotels" ADD CONSTRAINT "product_hotels_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_hotels" ADD CONSTRAINT "product_hotels_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_hotels" ADD CONSTRAINT "product_hotels_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_attribute_id_fkey" FOREIGN KEY ("product_attribute_id") REFERENCES "product_attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_items" ADD CONSTRAINT "request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_items" ADD CONSTRAINT "request_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_stages" ADD CONSTRAINT "request_stages_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_stages" ADD CONSTRAINT "request_stages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncm_suggestions" ADD CONSTRAINT "ncm_suggestions_request_item_id_fkey" FOREIGN KEY ("request_item_id") REFERENCES "request_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_requests" ADD CONSTRAINT "supplier_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_requests" ADD CONSTRAINT "supplier_requests_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
