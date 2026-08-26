declare module 'express-serve-static-core' {
  interface Request {
    cookies: Record<string, string | undefined>;
    user?: { id: string; email: string; name: string };
  }
}

export {};
