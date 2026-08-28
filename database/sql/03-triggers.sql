-- =============================================================================
-- Portal Amarante CSC — extensões, invariantes e auditoria
-- Idempotente. Não cria tabelas (schema Prisma).
-- Rodar: bash database/scripts/apply-triggers.sh  (também no migrate.sh)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS products_description_short_trgm_idx
  ON products USING gin (description_short gin_trgm_ops);

-- Igualdade / GROUP BY para duplicatas exatas (RF-ITM-13) — barato em volume real
CREATE INDEX IF NOT EXISTS products_description_short_btree_idx
  ON products (description_short);

-- ITM-09: NCM no produto exige confirmação humana
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_ncm_requires_confirmation;
ALTER TABLE products ADD CONSTRAINT products_ncm_requires_confirmation
  CHECK (ncm_code IS NULL OR ncm_confirmed_by IS NOT NULL);

-- ---------------------------------------------------------------------------
-- Funções
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_audit_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_app TEXT;
  v_antes JSONB;
  v_depois JSONB;
BEGIN
  BEGIN
    v_app := NULLIF(current_setting('app.user_id', true), '');
  EXCEPTION WHEN OTHERS THEN
    v_app := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    v_id := NEW.id::text;
    v_depois := to_jsonb(NEW) - 'password_hash';
    INSERT INTO audit_log (tabela, registro_id, operacao, dados_antes, dados_depois, app_usuario)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, NULL, v_depois, v_app);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := NEW.id::text;
    v_antes := to_jsonb(OLD) - 'password_hash';
    v_depois := to_jsonb(NEW) - 'password_hash';
    INSERT INTO audit_log (tabela, registro_id, operacao, dados_antes, dados_depois, app_usuario)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_antes, v_depois, v_app);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_id := OLD.id::text;
    v_antes := to_jsonb(OLD) - 'password_hash';
    INSERT INTO audit_log (tabela, registro_id, operacao, dados_antes, dados_depois, app_usuario)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_antes, NULL, v_app);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_itm01_uppercase_descriptions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.description_short := UPPER(TRIM(NEW.description_short));
  IF NEW.description_long IS NOT NULL THEN
    NEW.description_long := UPPER(TRIM(NEW.description_long));
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_users_bu_updated ON users;
CREATE TRIGGER trg_users_bu_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_hotels_bu_updated ON hotels;
CREATE TRIGGER trg_hotels_bu_updated BEFORE UPDATE ON hotels
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_warehouses_bu_updated ON warehouses;
CREATE TRIGGER trg_warehouses_bu_updated BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_groups_bu_updated ON groups;
CREATE TRIGGER trg_groups_bu_updated BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_subgroups_bu_updated ON subgroups;
CREATE TRIGGER trg_subgroups_bu_updated BEFORE UPDATE ON subgroups
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_families_bu_updated ON families;
CREATE TRIGGER trg_families_bu_updated BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_measure_units_bu_updated ON measure_units;
CREATE TRIGGER trg_measure_units_bu_updated BEFORE UPDATE ON measure_units
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_cost_centers_bu_updated ON cost_centers;
CREATE TRIGGER trg_cost_centers_bu_updated BEFORE UPDATE ON cost_centers
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_products_bu_updated ON products;
CREATE TRIGGER trg_products_bu_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_product_attributes_bu_updated ON product_attributes;
CREATE TRIGGER trg_product_attributes_bu_updated BEFORE UPDATE ON product_attributes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_suppliers_bu_updated ON suppliers;
CREATE TRIGGER trg_suppliers_bu_updated BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ITM-01 (remove nomes antigos se existirem)
DROP TRIGGER IF EXISTS trg_products_uppercase ON products;
DROP TRIGGER IF EXISTS trg_products_biu_itm01 ON products;
CREATE TRIGGER trg_products_uppercase
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION fn_itm01_uppercase_descriptions();

DROP TRIGGER IF EXISTS trg_request_items_uppercase ON request_items;
DROP TRIGGER IF EXISTS trg_request_items_biu_itm01 ON request_items;
CREATE TRIGGER trg_request_items_uppercase
  BEFORE INSERT OR UPDATE ON request_items
  FOR EACH ROW EXECUTE FUNCTION fn_itm01_uppercase_descriptions();

-- Auditoria
DROP TRIGGER IF EXISTS trg_users_aiud_audit ON users;
CREATE TRIGGER trg_users_aiud_audit AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

DROP TRIGGER IF EXISTS trg_products_aiud_audit ON products;
CREATE TRIGGER trg_products_aiud_audit AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

DROP TRIGGER IF EXISTS trg_requests_aiud_audit ON requests;
CREATE TRIGGER trg_requests_aiud_audit AFTER INSERT OR UPDATE OR DELETE ON requests
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

DROP TRIGGER IF EXISTS trg_request_items_aiud_audit ON request_items;
CREATE TRIGGER trg_request_items_aiud_audit AFTER INSERT OR UPDATE OR DELETE ON request_items
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

DROP TRIGGER IF EXISTS trg_suppliers_aiud_audit ON suppliers;
CREATE TRIGGER trg_suppliers_aiud_audit AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

-- ---------------------------------------------------------------------------
-- PDM signature (CONSUMPTION uniqueness helpers)
-- Fonte canônica também na migration products_pdm_signature_consumption_unique.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION fn_pdm_signature(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT trim(regexp_replace(
    regexp_replace(
      upper(unaccent(coalesce(raw, ''))),
      '[[:punct:]]+',
      '',
      'g'
    ),
    '\s+',
    ' ',
    'g'
  ));
$$;

CREATE OR REPLACE FUNCTION fn_products_pdm_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  NEW.pdm_signature := fn_pdm_signature(NEW.description_short);
  SELECT sg.family_id INTO v_family_id
  FROM groups g
  JOIN subgroups sg ON sg.id = g.subgroup_id
  WHERE g.id = NEW.group_id;
  NEW.pdm_family_id := v_family_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_biu_pdm_fields ON products;
CREATE TRIGGER trg_products_biu_pdm_fields
  BEFORE INSERT OR UPDATE OF description_short, group_id, item_kind
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION fn_products_pdm_fields();

CREATE OR REPLACE FUNCTION fn_products_prevent_consumption_pdm_dup()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.item_kind IS DISTINCT FROM 'CONSUMPTION'::"ItemKind" THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.pdm_signature IS NOT DISTINCT FROM OLD.pdm_signature
     AND NEW.pdm_family_id IS NOT DISTINCT FROM OLD.pdm_family_id
     AND NEW.item_kind IS NOT DISTINCT FROM OLD.item_kind THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM products o
    WHERE o.item_kind = 'CONSUMPTION'::"ItemKind"
      AND o.pdm_family_id IS NOT DISTINCT FROM NEW.pdm_family_id
      AND o.pdm_signature IS NOT DISTINCT FROM NEW.pdm_signature
      AND o.id <> NEW.id
  ) THEN
    RAISE EXCEPTION
      'Duplicidade CONSUMPTION: já existe item com a mesma assinatura PDM nesta família (pdm_signature).'
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_biu_prevent_consumption_pdm_dup ON products;
CREATE TRIGGER trg_products_biu_prevent_consumption_pdm_dup
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION fn_products_prevent_consumption_pdm_dup();

