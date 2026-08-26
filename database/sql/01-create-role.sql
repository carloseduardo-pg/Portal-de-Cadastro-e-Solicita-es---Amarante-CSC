-- Portal Amarante — role de desenvolvimento
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

SELECT 'OK role postgree' AS status;
