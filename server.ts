import express from "express";
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { EventEmitter } from "node:events";

const modelEmitter = new EventEmitter();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Explicitly expose the /models directory as static to prevent SPA catch-all interception
  app.use('/models', express.static(path.join(process.cwd(), 'public/models')));
  app.use('/models', express.static(path.join(process.cwd(), 'dist/models')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (process.env.NODE_ENV === "production") {
      console.log(`Serving static files from: ${distPath}`);
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`Error sending index.html: ${err}`);
          res.status(500).send("Internal Server Error");
        }
      });
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const gracefulShutdown = () => {
    console.log('Received kill signal, shutting down gracefully...');
    server.close(() => {
      console.log('Closed out remaining connections.');
      process.exit(0);
    });
    
    // Force close after 5 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is in use, retrying...`);
      setTimeout(() => {
        server.close();
        server.listen(PORT, "0.0.0.0");
      }, 1000);
    } else {
      console.error(e);
    }
  });
}

startServer().catch(console.error);
