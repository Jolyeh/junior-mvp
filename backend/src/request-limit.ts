import { ThrottlerStorage } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';

/** Fixed windows in PostgreSQL: atomic across serverless instances. */
export class PostgresThrottlerStorage implements ThrottlerStorage {
 constructor(private readonly db: PrismaService) {}
 async increment(key:string,ttl:number,limit:number,blockDuration:number,_name:string) {
  const duration=Math.max(ttl,blockDuration);
  const rows=await this.db.$queryRaw<{count:number;seconds:number}[]>`
   INSERT INTO "RequestLimit" ("key","count","expiresAt") VALUES (${key},1,NOW()+(${duration} * INTERVAL '1 millisecond'))
   ON CONFLICT ("key") DO UPDATE SET
    "count"=CASE WHEN "RequestLimit"."expiresAt"<=NOW() THEN 1 ELSE "RequestLimit"."count"+1 END,
    "expiresAt"=CASE WHEN "RequestLimit"."expiresAt"<=NOW() THEN NOW()+(${duration} * INTERVAL '1 millisecond') ELSE "RequestLimit"."expiresAt" END
   RETURNING "count", GREATEST(1,CEIL(EXTRACT(EPOCH FROM ("expiresAt"-NOW()))))::integer AS "seconds"`;
  // Avoid accumulating expired anonymous IP keys indefinitely.
  if(Math.random()<0.01) await this.db.requestLimit.deleteMany({where:{expiresAt:{lt:new Date(Date.now()-86400000)}}});
  const {count,seconds}=rows[0];const blocked=count>limit;
  return {totalHits:count,timeToExpire:seconds,isBlocked:blocked,timeToBlockExpire:blocked?seconds:0};
 }
}
