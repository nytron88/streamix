import { createServer } from 'http';
import { config } from '../config';

export class HealthService {
  private static server: any = null;

  /**
   * Start health check server
   */
  static startHealthServer(): void {
    const server = createServer((req, res) => {
      if (req.url === '/health' || req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'viewer-worker',
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    server.listen(config.worker.healthCheckPort, () => {
      console.log(`Health check server running on port ${config.worker.healthCheckPort}`);
    });

    this.server = server;
  }

  /**
   * Stop health check server
   */
  static stopHealthServer(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
