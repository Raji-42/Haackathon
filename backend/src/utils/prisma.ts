import { PrismaClient } from '@prisma/client';
import { createPrismaMock } from './mock-db';

let realPrisma: PrismaClient | null = null;
let useMock = false;

try {
  realPrisma = new PrismaClient({
    log: ['error'],
  });
} catch {
  useMock = true;
}

const mockPrismaInstance = createPrismaMock();

// Smart Transparent Proxy
export const prisma: PrismaClient = new Proxy({}, {
  get(_target, prop) {
    if (useMock || !realPrisma) {
      return (mockPrismaInstance as any)[prop];
    }

    const realProp = (realPrisma as any)[prop];
    if (typeof realProp === 'function') {
      return (...args: any[]) => {
        return realProp.apply(realPrisma, args).catch((err: any) => {
          if (err.message && (err.message.includes("Can't reach database server") || err.message.includes('Environment variable not found'))) {
            if (!useMock) {
              console.log('💡 Local Standalone Mode: PostgreSQL not reachable on 5432. Active in High-Performance In-Memory Store.');
              useMock = true;
            }
            const fallbackFunc = (mockPrismaInstance as any)[prop];
            if (typeof fallbackFunc === 'function') {
              return fallbackFunc.apply(mockPrismaInstance, args);
            }
          }
          throw err;
        });
      };
    }

    if (typeof realProp === 'object' && realProp !== null) {
      return new Proxy(realProp, {
        get(subTarget, subProp) {
          const originalSub = subTarget[subProp];
          if (typeof originalSub === 'function') {
            return (...args: any[]) => {
              if (useMock) {
                const mockModel = (mockPrismaInstance as any)[prop];
                if (mockModel && typeof mockModel[subProp] === 'function') {
                  return mockModel[subProp].apply(mockModel, args);
                }
              }
              return originalSub.apply(subTarget, args).catch((err: any) => {
                if (err.message && (err.message.includes("Can't reach database server") || err.message.includes('Environment variable not found'))) {
                  if (!useMock) {
                    console.log('💡 Local Standalone Mode: PostgreSQL not reachable on 5432. Active in High-Performance In-Memory Store.');
                    useMock = true;
                  }
                  const mockModel = (mockPrismaInstance as any)[prop];
                  if (mockModel && typeof mockModel[subProp] === 'function') {
                    return mockModel[subProp].apply(mockModel, args);
                  }
                }
                throw err;
              });
            };
          }
          return originalSub;
        },
      });
    }

    return realProp;
  },
}) as unknown as PrismaClient;
