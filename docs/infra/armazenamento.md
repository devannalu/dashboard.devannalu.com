# Armazenamento de arquivos (Garage) — guia de instalação

> Decisão D-31: arquivos guardados na própria VPS, com **Garage** (código aberto, compatível com S3).
> Esta etapa liga a **conexão**. Upload e download só ficam disponíveis depois do login (M2).

## Como funciona

```
Web ──> API (studio-api) ──S3──> Garage (studio-files) ──> disco da VPS
```

- Só a **API** fala com o Garage, pela rede interna. O Garage **não tem domínio público**.
- Os arquivos ficam num **bucket** chamado `studio-arquivos`.
- A API usa uma **chave de acesso** própria, com permissão só nesse bucket.

---

## A. Produção (Coolify)

### 1. Gerar os dois segredos do Garage

Na sua máquina (PowerShell), gere dois valores aleatórios e guarde num lugar seguro (gerenciador de senhas):

```powershell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })   # GARAGE_RPC_SECRET (64 caracteres)
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })   # GARAGE_ADMIN_TOKEN
```

### 2. Criar o serviço no Coolify

1. No projeto do Studio OS, ambiente **production**: **+ New → Docker Image**.
2. **Image:** `dxflrs/garage:v2.5.0`.
3. **Name:** `studio-files`.
4. **Domínio:** nenhum (apague se vier preenchido).
5. **Edit Networking → Network aliases:** `studio-files`. **Exposed ports:** `3900`.
6. **Environment Variables** (só em tempo de execução, não no build):
   ```
   GARAGE_RPC_SECRET=<primeiro valor gerado>
   GARAGE_ADMIN_TOKEN=<segundo valor gerado>
   ```
7. **Persistent Storage:**
   - **Volume** em `/var/lib/garage/meta`.
   - **Volume** em `/var/lib/garage/data`.
   - **File mount** em `/etc/garage.toml`, com o conteúdo do arquivo [`infra/garage/garage.toml`](../../infra/garage/garage.toml) deste repositório (copie e cole).
8. **Healthcheck:** desligado. A imagem do Garage não tem `curl` nem `wget`.
9. **Deploy.** Nos logs, o Garage deve mostrar que está ouvindo nas portas 3900/3901.

### 3. Inicialização única (aba Terminal do `studio-files`)

Abra o **Terminal** do recurso no Coolify e rode, um por vez:

```sh
/garage status
```
Anote o **ID do nó** (a primeira coluna, um código hexadecimal).

```sh
/garage layout assign -z vps -c 20G <ID_DO_NO>
/garage layout apply --version 1
/garage bucket create studio-arquivos
/garage key create studio-api
/garage bucket allow --read --write --owner studio-arquivos --key studio-api
```

- O `20G` é o espaço reservado para os arquivos; ajuste ao disco da sua VPS.
- O `key create` mostra **Key ID** (começa com `GK…`) e **Secret key**. **Copie os dois agora**, porque o segredo não aparece de novo.

### 4. Ligar a API ao Garage

Na **API** (`studio-api`) → **Environment Variables**:

```
S3_ENDPOINT=http://studio-files:3900
S3_REGION=garage
S3_BUCKET=studio-arquivos
S3_ACCESS_KEY_ID=<Key ID, começa com GK>
S3_SECRET_ACCESS_KEY=<Secret key>
```

**Redeploy da API.** No site, **Armazenamento de arquivos** deve passar para **funcionando**.

> Se aparecer "fora do ar": confira o alias `studio-files`, se o bucket foi criado e se a chave tem permissão (`/garage bucket info studio-arquivos`).

### 5. Backup

Os arquivos ficam nos volumes do `studio-files`. Inclua esses volumes no backup da VPS (ou configure cópia periódica para outro lugar). Sem isso, uma falha de disco perde os arquivos.

---

## B. Desenvolvimento local

1. No `.env`, defina `GARAGE_RPC_SECRET` e `GARAGE_ADMIN_TOKEN` (gerados como no passo A.1).
2. `pnpm db:up` sobe MySQL e Garage.
3. Inicialização única:
   ```sh
   docker compose exec garage /garage status
   docker compose exec garage /garage layout assign -z local -c 2G <ID_DO_NO>
   docker compose exec garage /garage layout apply --version 1
   docker compose exec garage /garage bucket create studio-arquivos
   docker compose exec garage /garage key create studio-api
   docker compose exec garage /garage bucket allow --read --write --owner studio-arquivos --key studio-api
   ```
4. No `.env`:
   ```
   S3_ENDPOINT=http://localhost:3900
   S3_REGION=garage
   S3_BUCKET=studio-arquivos
   S3_ACCESS_KEY_ID=<GK...>
   S3_SECRET_ACCESS_KEY=<segredo>
   ```
