import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma.service';
async function main() {
 const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(); const password = process.env.ADMIN_PASSWORD;
 if (!email || !password || password.length < 8 || Buffer.byteLength(password) > 72) throw new Error('Fournissez ADMIN_EMAIL et ADMIN_PASSWORD (8 caractères minimum, 72 octets maximum).');
 const db = new PrismaService();
 try { await db.user.create({ data: { email, passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN' } }); console.log('Administrateur créé.'); }
 finally { await db.$disconnect(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
