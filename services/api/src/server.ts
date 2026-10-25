/**
 * Server entrypoint for the Ragnarok Courtroom API.
 */

export async function startServer(port: number = 3000): Promise<void> {
  console.log(`Starting API server on port ${port}...`);
  // TODO: Initialize Express / Fastify server, middleware, routes, and agent orchestration.
}

if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  startServer(port).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
