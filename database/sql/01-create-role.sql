-- Portal Amarante — role de desenvolvimento (legado / referência).
-- Em runtime, `database/scripts/setup.sh` cria a role a partir do DATABASE_URL do .env.
-- Este arquivo permanece para bootstrap manual local (usuário default postgree).
DO
$$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgree') THEN
    CREATE ROLE postgree LOGIN PASSWORD 'postgree' CREATEDB;
  ELSE
    ALTER ROLE postgree WITH LOGIN PASSWORD 'postgree' CREATEDB;
  END IF;
END
$$;

SELECT 'OK role postgree (arquivo legado — preferir setup.sh + DATABASE_URL)' AS status;
