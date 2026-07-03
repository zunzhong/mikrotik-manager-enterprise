import type { FastifyInstance } from 'fastify';
export async function backupRoutes(app: FastifyInstance){
 app.get('/api/v1/devices/:id/backups',async()=>({success:true,data:[]}));
 app.post('/api/v1/devices/:id/backup',async(_,reply)=>reply.code(202).send({success:true,data:{queued:true}}));
 app.get('/api/v1/devices/:id/snapshots',async()=>({success:true,data:[]}));
 app.delete('/api/v1/backups/:id',async()=>({success:true,data:{deleted:true}}));
}
