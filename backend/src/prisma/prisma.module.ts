import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Expõe PrismaService globalmente (sem reimportar em cada feature module). */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
