# AWS deployment notes

The app ships as a single container (see `apps/api/Dockerfile`), so the simplest path is ECS on Fargate behind an Application Load Balancer.

## Steps

1. **Build and push the image** to ECR:
   ```bash
   aws ecr create-repository --repository-name headnote
   docker build -t headnote apps/api
   docker tag headnote <account>.dkr.ecr.<region>.amazonaws.com/headnote:latest
   aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
   docker push <account>.dkr.ecr.<region>.amazonaws.com/headnote:latest
   ```
2. **Database.** SQLite is fine for a demo, but Fargate tasks do not keep local files. Use RDS PostgreSQL and set
   `DATABASE_URL=postgresql+psycopg://...` (add `psycopg[binary]` to `apps/api/requirements.txt`).
3. **Vector store.** Chroma runs in-process. For persistence on ECS, mount an EFS volume and set `CHROMA_PATH` to it,
   or move to a hosted vector store later.
4. **Secrets.** Store `OPENAI_API_KEY` and `LANGSMITH_API_KEY` in AWS Secrets Manager and reference them from the task
   definition. Do not bake them into the image.
5. **Service.** Create an ECS service with the task definition, a target group on port 8000, and a health check on
   `/health`.
6. **Logs.** Send container stdout to CloudWatch Logs through the `awslogs` driver.

## Scaling notes

- Conversations are read per request, so the service can run more than one task once the database is external.
- Embeddings and LLM calls dominate latency. Keep the task CPU modest and scale on request count instead.
