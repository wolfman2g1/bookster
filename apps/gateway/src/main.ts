import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable built-in request logging
  app.use((req, res, next) => {
    const logger = new Logger('HTTP');
    const { method, originalUrl } = req;
    const userAgent = req.get('User-Agent') || '';

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('Content-Length');

      logger.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength || 0} - ${userAgent}`,
      );
    });

    next();
  });
  
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
